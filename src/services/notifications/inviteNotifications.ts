// ============================================
// ALTROVE - Invite Notifications
// Notifiche per inviti accettati
// ============================================

import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { NOTIFICATION_TYPES } from './types';

interface AcceptedByUser {
  uid: string;
  displayName?: string;
  avatar?: string | null;
}

/**
 * Crea notifica quando qualcuno accetta invito via link
 */
export const createLinkInviteAcceptedNotification = async (
  ownerId: string,
  tripId: string,
  tripName: string,
  acceptedByUser: AcceptedByUser
): Promise<void> => {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notifRef = doc(db, 'notifications', notifId);

    await setDoc(notifRef, {
      type: NOTIFICATION_TYPES.LINK_INVITE_ACCEPTED,
      userId: ownerId,
      tripId,
      tripName,
      actorId: acceptedByUser.uid,
      actorName: acceptedByUser.displayName || 'Utente',
      actorAvatar: acceptedByUser.avatar || null,
      createdAt: new Date(),
      read: false
    });
  } catch (error) {
    console.error('Errore creazione notifica link:', error);
  }
};

/**
 * Crea notifica quando qualcuno accetta invito via username
 */
export const createUsernameInviteAcceptedNotification = async (
  ownerId: string,
  tripId: string,
  tripName: string,
  acceptedByUser: AcceptedByUser
): Promise<void> => {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notifRef = doc(db, 'notifications', notifId);

    await setDoc(notifRef, {
      type: NOTIFICATION_TYPES.USERNAME_INVITE_ACCEPTED,
      userId: ownerId,
      tripId,
      tripName,
      actorId: acceptedByUser.uid,
      actorName: acceptedByUser.displayName || 'Utente',
      actorAvatar: acceptedByUser.avatar || null,
      createdAt: new Date(),
      read: false
    });
  } catch (error) {
    console.error('Errore creazione notifica username:', error);
  }
};
