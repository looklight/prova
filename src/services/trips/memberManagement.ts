// ============================================
// ALTROVE - Member Management
// Gestione membri viaggio
// ============================================

import { db } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getUserRole } from './permissions';

interface UserProfile {
  displayName?: string;
  username?: string | null;
  avatar?: string | null;
}

interface TripMember {
  role: 'owner' | 'member';
  status: 'active' | 'left' | 'removed';
}

interface TripSharing {
  members?: Record<string, TripMember>;
}

interface TripData {
  sharing?: TripSharing;
}

/**
 * Aggiunge un membro a un viaggio come member
 */
export const addMemberToTrip = async (
  tripId: string | number,
  invitedUserId: string,
  invitedUserProfile: UserProfile,
  invitedBy: string
): Promise<void> => {
  try {
    const inviterRole = await getUserRole(tripId, invitedBy);
    if (inviterRole !== 'owner') {
      throw new Error('Solo il proprietario può invitare altri utenti');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

    await updateDoc(tripRef, {
      'sharing.memberIds': arrayUnion(invitedUserId),
      [`sharing.members.${invitedUserId}`]: {
        role: 'member',
        status: 'active',
        addedAt: new Date(),
        addedBy: invitedBy,
        displayName: invitedUserProfile.displayName || 'Utente',
        username: invitedUserProfile.username || null,
        avatar: invitedUserProfile.avatar || null
      },
      'updatedAt': new Date()
    });

    console.log('✅ Membro aggiunto al viaggio come member:', invitedUserId);
  } catch (error) {
    console.error('❌ Errore aggiunta membro:', error);
    throw error;
  }
};

/**
 * Rimuove un membro dal viaggio (owner)
 */
export const removeMemberFromTrip = async (
  tripId: string | number,
  memberIdToRemove: string,
  removedBy: string
): Promise<void> => {
  try {
    const removerRole = await getUserRole(tripId, removedBy);
    if (removerRole !== 'owner') {
      throw new Error('Solo il proprietario può rimuovere membri');
    }

    if (memberIdToRemove === removedBy) {
      throw new Error('Usa leaveTrip per abbandonare il viaggio');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

    await updateDoc(tripRef, {
      'sharing.memberIds': arrayRemove(memberIdToRemove),
      [`sharing.members.${memberIdToRemove}.status`]: 'removed',
      'updatedAt': new Date()
    });

    console.log('✅ Membro rimosso dal viaggio:', memberIdToRemove);
  } catch (error) {
    console.error('❌ Errore rimozione membro:', error);
    throw error;
  }
};

/**
 * Rimuove un membro dal viaggio
 */
export const removeMember = async (
  tripId: string | number,
  targetUserId: string
): Promise<void> => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const trip = tripSnap.data() as TripData;
    const targetMember = trip.sharing?.members?.[targetUserId];

    if (!targetMember) {
      throw new Error('Membro non trovato');
    }

    if (targetMember.role === 'owner') {
      throw new Error('Non puoi rimuovere il proprietario');
    }

    await updateDoc(tripRef, {
      [`sharing.members.${targetUserId}.status`]: 'removed',
      [`sharing.members.${targetUserId}.removedAt`]: new Date(),
      'sharing.memberIds': arrayRemove(targetUserId),
      'updatedAt': new Date()
    });

    console.log(`✅ Membro rimosso: ${targetUserId}`);
  } catch (error) {
    console.error('❌ Errore rimozione membro:', error);
    throw error;
  }
};
