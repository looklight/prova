// ============================================
// ALTROVE - Invitations Service
// Gestione inviti via username
// ============================================

import { db } from '../../firebase';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  Unsubscribe
} from 'firebase/firestore';
import { createUsernameInviteAcceptedNotification } from '../notifications/inviteNotifications';

interface UserProfile {
  uid?: string;
  displayName?: string;
  username?: string | null;
  avatar?: string | null;
}

interface MemberInfo {
  role: 'owner' | 'member';
  status: 'active' | 'left' | 'removed';
  displayName?: string;
  username?: string | null;
}

interface TripData {
  sharing?: {
    memberIds?: string[];
    members?: Record<string, MemberInfo>;
  };
  metadata?: {
    name?: string;
  };
  name?: string;
  data?: Record<string, CellData | OtherExpense[]>;
}

interface CellData {
  participants?: string[];
  [key: string]: unknown;
}

interface OtherExpense {
  participants?: string[];
  [key: string]: unknown;
}

interface Invitation {
  id: string;
  invitedUserId: string;
  invitedUsername?: string;
  invitedDisplayName?: string;
  role: string;
  status: string;
  invitedBy: string;
  invitedByUsername?: string;
  invitedByDisplayName?: string;
  invitedAt: Date;
  expiresAt: Date;
  tripId: string | number;
  tripName: string;
}

type InvitationCallback = (invitations: Invitation[]) => void;
type ErrorCallback = (error: Error) => void;

/**
 * Invita un utente a unirsi al viaggio (ruolo: member)
 */
export const inviteMemberByUsername = async (
  tripId: string | number,
  invitedUserId: string,
  invitedUserProfile: UserProfile,
  invitedBy: string
): Promise<string> => {
  try {
    const tripRef = doc(db, 'trips', String(tripId));
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) throw new Error('Viaggio non trovato');

    const trip = tripSnap.data() as TripData;

    // Controlla che chi invita sia owner attivo
    const inviterInfo = trip.sharing?.members?.[invitedBy];
    if (!inviterInfo || inviterInfo.role !== 'owner' || inviterInfo.status !== 'active') {
      throw new Error('Solo il proprietario può invitare altri utenti');
    }

    // Utente già membro?
    if (Array.isArray(trip.sharing?.memberIds) && trip.sharing.memberIds.includes(invitedUserId)) {
      throw new Error('Questo utente è già membro del viaggio');
    }

    // Invito pendente già esistente?
    const invitationsRef = collection(db, 'trips', String(tripId), 'invitations');
    const existingQuery = query(
      invitationsRef,
      where('invitedUserId', '==', invitedUserId),
      where('status', '==', 'pending')
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) throw new Error('Hai già inviato un invito a questo utente');

    // Crea l'invito (member)
    const inviteId = `inv_${Date.now()}`;
    const inviteRef = doc(db, 'trips', String(tripId), 'invitations', inviteId);

    const inviteData = {
      invitedUserId,
      invitedUsername: invitedUserProfile.username,
      invitedDisplayName: invitedUserProfile.displayName,
      role: 'member',
      status: 'pending',
      invitedBy,
      invitedByUsername: inviterInfo.username || 'Owner',
      invitedByDisplayName: inviterInfo.displayName || 'Owner',
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      tripId,
      tripName: trip.metadata?.name || trip.name || 'Viaggio'
    };

    await setDoc(inviteRef, inviteData);
    console.log(`✅ Invito creato: ${invitedUserProfile.username} come member (inviteId=${inviteId})`);
    return inviteId;
  } catch (error) {
    console.error('❌ Errore creazione invito:', error);
    throw error;
  }
};

/**
 * Accetta invito (aggiunge membro + auto-include participants + ELIMINA invito)
 */
export const acceptInvitation = async (
  invitationId: string,
  tripId: string | number,
  userId: string,
  userProfile: UserProfile
): Promise<void> => {
  try {
    const inviteRef = doc(db, 'trips', String(tripId), 'invitations', invitationId);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error('Invito non trovato');

    const invite = inviteSnap.data();
    if (invite.invitedUserId !== userId) throw new Error('Questo invito non è per te');
    if (invite.status !== 'pending') throw new Error('Questo invito non è più valido');

    const expiresAt = invite.expiresAt?.toDate?.() ?? new Date(invite.expiresAt);
    if (expiresAt < new Date()) {
      throw new Error('Questo invito è scaduto');
    }

    const tripRef = doc(db, 'trips', String(tripId));

    // STEP 1: Aggiungi l'utente come membro
    await updateDoc(tripRef, {
      'sharing.memberIds': arrayUnion(userId),
      [`sharing.members.${userId}`]: {
        role: 'member',
        status: 'active',
        addedAt: new Date(),
        addedBy: invite.invitedBy,
        displayName: userProfile.displayName || 'Utente',
        username: userProfile.username || null,
        avatar: userProfile.avatar || null
      },
      'updatedAt': new Date()
    });

    console.log(`✅ Membro aggiunto: ${userProfile.username || userProfile.displayName}`);

    // STEP 2: Aggiorna participants di TUTTE le spese esistenti
    const tripSnap = await getDoc(tripRef);
    const trip = tripSnap.data() as TripData;

    const updatedData = { ...trip.data };
    let hasUpdates = false;
    let updatedCount = 0;

    if (updatedData) {
      Object.keys(updatedData).forEach(key => {
        const cellData = updatedData[key];

        // Categorie normali con participants
        if (cellData && typeof cellData === 'object' && !Array.isArray(cellData)) {
          const cell = cellData as CellData;
          if (cell.participants && Array.isArray(cell.participants)) {
            if (!cell.participants.includes(userId)) {
              cell.participants = [...cell.participants, userId];
              hasUpdates = true;
              updatedCount++;
            }
          }
        }

        // OtherExpenses (array di spese)
        if (key.endsWith('-otherExpenses') && Array.isArray(cellData)) {
          (cellData as OtherExpense[]).forEach((expense) => {
            if (expense?.participants && Array.isArray(expense.participants)) {
              if (!expense.participants.includes(userId)) {
                expense.participants = [...expense.participants, userId];
                hasUpdates = true;
                updatedCount++;
              }
            }
          });
        }
      });

      if (hasUpdates) {
        await updateDoc(tripRef, {
          data: updatedData,
          updatedAt: new Date()
        });
        console.log(`🎉 Nuovo membro aggiunto a ${updatedCount} spese esistenti`);
      }
    }

    // STEP 3: Crea notifica per owner
    await createUsernameInviteAcceptedNotification(
      invite.invitedBy,
      String(tripId),
      invite.tripName,
      userProfile as { uid: string; displayName?: string; avatar?: string | null }
    );

    // STEP 4: Elimina invito subito (non serve più)
    await deleteDoc(inviteRef);

    console.log(`✅ Invito accettato ed eliminato`);
  } catch (error) {
    console.error('❌ Errore accettazione invito:', error);
    throw error;
  }
};

/**
 * Rifiuta invito (ELIMINA subito)
 */
export const rejectInvitation = async (
  invitationId: string,
  tripId: string | number,
  userId: string
): Promise<void> => {
  try {
    const inviteRef = doc(db, 'trips', String(tripId), 'invitations', invitationId);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error('Invito non trovato');

    const invite = inviteSnap.data();
    if (invite.invitedUserId !== userId) throw new Error('Questo invito non è per te');
    if (invite.status !== 'pending') throw new Error('Questo invito non è più valido');

    // Elimina direttamente (no status update)
    await deleteDoc(inviteRef);

    console.log(`✅ Invito rifiutato ed eliminato`);
  } catch (error) {
    console.error('❌ Errore rifiuto invito:', error);
    throw error;
  }
};

/**
 * Elimina un invito (per owner)
 */
export const deleteInvitation = async (
  tripId: string | number,
  invitationId: string
): Promise<void> => {
  try {
    const inviteRef = doc(db, 'trips', String(tripId), 'invitations', invitationId);
    await deleteDoc(inviteRef);
    console.log('🗑️ Invito eliminato:', invitationId);
  } catch (error) {
    console.error('❌ Errore eliminazione invito:', error);
    throw error;
  }
};

/**
 * Carica inviti pendenti per un utente
 */
export const loadPendingInvitations = async (userId: string): Promise<Invitation[]> => {
  try {
    const invitationsRef = collectionGroup(db, 'invitations');
    const q = query(
      invitationsRef,
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('invitedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const invitations: Invitation[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      invitations.push({
        id: docSnap.id,
        ...data,
        invitedAt: data.invitedAt?.toDate?.() ?? data.invitedAt,
        expiresAt: data.expiresAt?.toDate?.() ?? data.expiresAt
      } as Invitation);
    });
    console.log(`✅ Inviti pendenti caricati: ${invitations.length}`);
    return invitations;
  } catch (error) {
    console.error('❌ Errore caricamento inviti:', error);
    throw error;
  }
};

/**
 * Subscribe real-time inviti pendenti
 */
export const subscribeToPendingInvitations = (
  userId: string,
  onInvitationsUpdate: InvitationCallback,
  onError?: ErrorCallback
): Unsubscribe => {
  try {
    const invitationsRef = collectionGroup(db, 'invitations');
    const q = query(
      invitationsRef,
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('invitedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const invitations: Invitation[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          invitations.push({
            id: docSnap.id,
            ...data,
            invitedAt: data.invitedAt?.toDate?.() ?? data.invitedAt,
            expiresAt: data.expiresAt?.toDate?.() ?? data.expiresAt
          } as Invitation);
        });
        onInvitationsUpdate(invitations);
      },
      (error) => {
        console.error('❌ Errore listener inviti:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Errore sottoscrizione inviti:', error);
    throw error;
  }
};

/**
 * Auto-cleanup inviti scaduti (chiamare al login)
 * Elimina inviti con expiresAt < now
 */
export const cleanupExpiredInvitations = async (userId: string): Promise<void> => {
  try {
    const now = new Date();
    const invitationsRef = collectionGroup(db, 'invitations');

    const q = query(
      invitationsRef,
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    if (snapshot.size > 0) {
      console.log(`🧹 ${snapshot.size} inviti scaduti eliminati`);
    }
  } catch (error) {
    console.error('❌ Errore cleanup inviti:', error);
  }
};
