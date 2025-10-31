// services/trips/invitations.js
import { db } from '../../firebase'; // ⭐ DUE livelli su
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
  arrayUnion
} from 'firebase/firestore';

/**
 * Invita un utente a unirsi al viaggio (ruolo: member)
 */
export const inviteMemberByUsername = async (tripId, invitedUserId, invitedUserProfile, invitedBy) => {
  try {
    const tripRef = doc(db, 'trips', String(tripId));
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) throw new Error('Viaggio non trovato');

    const trip = tripSnap.data();

    // Controlla che chi invita sia owner attivo
    const inviterInfo = trip.sharing?.members?.[invitedBy];
    if (!inviterInfo || inviterInfo.role !== 'owner' || inviterInfo.status !== 'active') {
      throw new Error(`Solo il proprietario può invitare altri utenti`);
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
    console.error('❌ Errore creazione invito (raw):', error);
    throw error;
  }
};

/**
 * Accetta un invito (aggiunge membro come 'member')
 */
export const acceptInvitation = async (invitationId, tripId, userId, userProfile) => {
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

    // Aggiungi l'utente direttamente al viaggio
    const tripRef = doc(db, 'trips', String(tripId));
    
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

    // Aggiorna lo stato dell'invito
    await updateDoc(inviteRef, {
      status: 'accepted',
      acceptedAt: new Date()
    });

    console.log(`✅ Invito accettato: ${userProfile.username || userProfile.displayName} come member`);
  } catch (error) {
    console.error('❌ Errore accettazione invito (raw):', error);
    throw error;
  }
};

/**
 * Rifiuta un invito
 */
export const rejectInvitation = async (invitationId, tripId, userId) => {
  try {
    const inviteRef = doc(db, 'trips', String(tripId), 'invitations', invitationId);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error('Invito non trovato');

    const invite = inviteSnap.data();
    if (invite.invitedUserId !== userId) throw new Error('Questo invito non è per te');
    if (invite.status !== 'pending') throw new Error('Questo invito non è più valido');

    await updateDoc(inviteRef, {
      status: 'rejected',
      rejectedAt: new Date()
    });

    console.log(`❌ Invito rifiutato da ${userId}`);
  } catch (error) {
    console.error('❌ Errore rifiuto invito (raw):', error);
    throw error;
  }
};

/**
 * ⭐ NUOVO: Elimina un invito scaduto
 */
export const deleteInvitation = async (tripId, invitationId) => {
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
export const loadPendingInvitations = async (userId) => {
  try {
    const invitationsRef = collectionGroup(db, 'invitations');
    const q = query(
      invitationsRef,
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('invitedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const invitations = [];
    snapshot.forEach(docSnap => {
      invitations.push({
        id: docSnap.id,
        ...docSnap.data(),
        invitedAt: docSnap.data().invitedAt?.toDate?.() ?? docSnap.data().invitedAt,
        expiresAt: docSnap.data().expiresAt?.toDate?.() ?? docSnap.data().expiresAt
      });
    });
    console.log(`✅ Inviti pendenti caricati: ${invitations.length}`);
    return invitations;
  } catch (error) {
    console.error('❌ Errore caricamento inviti (raw):', error);
    throw error;
  }
};

/**
 * Subscribe real-time inviti pendenti
 */
export const subscribeToPendingInvitations = (userId, onInvitationsUpdate, onError) => {
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
        const invitations = [];
        snapshot.forEach(docSnap => {
          invitations.push({
            id: docSnap.id,
            ...docSnap.data(),
            invitedAt: docSnap.data().invitedAt?.toDate?.() ?? docSnap.data().invitedAt,
            expiresAt: docSnap.data().expiresAt?.toDate?.() ?? docSnap.data().expiresAt
          });
        });
        onInvitationsUpdate(invitations);
      },
      (error) => {
        console.error('❌ Errore listener inviti (raw):', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Errore sottoscrizione inviti (raw):', error);
    throw error;
  }
};