// ============================================
// ALTROVE - Member Notifications
// Notifiche per uscita/rimozione membri
// ============================================

import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { NOTIFICATION_TYPES } from './types';

interface MemberInfo {
  uid: string;
  displayName?: string;
  avatar?: string | null;
}

/**
 * Crea notifica quando un membro lascia volontariamente il viaggio
 * Destinatario: owner del viaggio
 */
export const createMemberLeftNotification = async (
  ownerId: string,
  tripId: string,
  tripName: string,
  memberWhoLeft: MemberInfo
): Promise<void> => {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notifRef = doc(db, 'notifications', notifId);

    await setDoc(notifRef, {
      type: NOTIFICATION_TYPES.MEMBER_LEFT,
      userId: ownerId,
      tripId,
      tripName,
      actorId: memberWhoLeft.uid,
      actorName: memberWhoLeft.displayName || 'Utente',
      actorAvatar: memberWhoLeft.avatar || null,
      createdAt: new Date(),
      read: false
    });
  } catch (error) {
    console.error('Errore creazione notifica member_left:', error);
  }
};

/**
 * Crea notifica quando un membro viene rimosso dall'owner
 * Destinatario: il membro rimosso
 */
export const createMemberRemovedNotification = async (
  removedMemberId: string,
  tripId: string,
  tripName: string,
  removedByOwner: MemberInfo
): Promise<void> => {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notifRef = doc(db, 'notifications', notifId);

    await setDoc(notifRef, {
      type: NOTIFICATION_TYPES.MEMBER_REMOVED,
      userId: removedMemberId,
      tripId,
      tripName,
      actorId: removedByOwner.uid,
      actorName: removedByOwner.displayName || 'Utente',
      actorAvatar: removedByOwner.avatar || null,
      createdAt: new Date(),
      read: false
    });
  } catch (error) {
    console.error('Errore creazione notifica member_removed:', error);
  }
};
