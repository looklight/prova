// services/notifications/memberNotifications.js
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { NOTIFICATION_TYPES } from './types';

/**
 * 🆕 Crea notifica quando un membro lascia volontariamente il viaggio
 * Destinatario: owner del viaggio
 */
export const createMemberLeftNotification = async (
  ownerId,
  tripId,
  tripName,
  memberWhoLeft
) => {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notifRef = doc(db, 'notifications', notifId);
    
    await setDoc(notifRef, {
      type: NOTIFICATION_TYPES.MEMBER_LEFT,
      userId: ownerId,  // Chi riceve la notifica (owner)
      tripId,
      tripName,
      actorId: memberWhoLeft.uid,
      actorName: memberWhoLeft.displayName || 'Utente',
      actorAvatar: memberWhoLeft.avatar || null,
      createdAt: new Date(),
      read: false
    });
    
    console.log(`✅ Notifica membro uscito creata per owner ${ownerId}`);
  } catch (error) {
    console.error('❌ Errore creazione notifica member_left:', error);
    // Non bloccare il flusso
  }
};

/**
 * 🆕 Crea notifica quando un membro viene rimosso dall'owner
 * Destinatario: il membro rimosso
 */
export const createMemberRemovedNotification = async (
  removedMemberId,
  tripId,
  tripName,
  removedByOwner
) => {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notifRef = doc(db, 'notifications', notifId);
    
    await setDoc(notifRef, {
      type: NOTIFICATION_TYPES.MEMBER_REMOVED,
      userId: removedMemberId,  // Chi riceve la notifica (membro rimosso)
      tripId,
      tripName,
      actorId: removedByOwner.uid,
      actorName: removedByOwner.displayName || 'Utente',
      actorAvatar: removedByOwner.avatar || null,
      createdAt: new Date(),
      read: false
    });
    
    console.log(`✅ Notifica rimozione creata per membro ${removedMemberId}`);
  } catch (error) {
    console.error('❌ Errore creazione notifica member_removed:', error);
    // Non bloccare il flusso
  }
};