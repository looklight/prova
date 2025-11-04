// services/notifications/inviteNotifications.js
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { NOTIFICATION_TYPES } from './types';

/**
 * Crea notifica quando qualcuno accetta invito via link
 */
export const createLinkInviteAcceptedNotification = async (
  ownerId,
  tripId,
  tripName,
  acceptedByUser
) => {
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
    
    console.log(`✅ Notifica link invito creata per ${ownerId}`);
  } catch (error) {
    console.error('❌ Errore creazione notifica link:', error);
    // Non bloccare il flusso
  }
};

/**
 * Crea notifica quando qualcuno accetta invito via username
 */
export const createUsernameInviteAcceptedNotification = async (
  ownerId,
  tripId,
  tripName,
  acceptedByUser
) => {
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
    
    console.log(`✅ Notifica username invito creata per ${ownerId}`);
  } catch (error) {
    console.error('❌ Errore creazione notifica username:', error);
    // Non bloccare il flusso
  }
};