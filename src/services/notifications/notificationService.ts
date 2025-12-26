// ============================================
// ALTROVE - Notification Service
// Gestione notifiche utente
// ============================================

import { db } from '../../firebase';
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';

export interface Notification {
  id: string;
  type: string;
  userId: string;
  tripId?: string;
  tripName?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string | null;
  createdAt: Date;
  read: boolean;
  readAt?: Date;
  [key: string]: any;
}

type NotificationCallback = (notifications: Notification[]) => void;

/**
 * Sottoscrivi a TUTTE le notifiche recenti (lette e non lette)
 */
export const subscribeToNotifications = (
  userId: string,
  onUpdate: NotificationCallback
): Unsubscribe => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('createdAt', '>=', sevenDaysAgo),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const notifications: Notification[] = [];
        snapshot.forEach(doc => {
          notifications.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
          } as Notification);
        });

        onUpdate(notifications);
      },
      (error) => {
        console.error('Errore listener notifiche:', error);
        onUpdate([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Errore sottoscrizione notifiche:', error);
    return () => {};
  }
};

/**
 * Segna una notifica come letta
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAt: new Date()
    });
  } catch (error) {
    console.error('Errore aggiornamento notifica:', error);
  }
};

/**
 * Segna tutte le notifiche come lette
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        read: true,
        readAt: new Date()
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Errore aggiornamento notifiche:', error);
  }
};

/**
 * Elimina una notifica
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Errore eliminazione notifica:', error);
  }
};

/**
 * Auto-cleanup notifiche vecchie (chiamare al login)
 */
export const cleanupOldNotifications = async (userId: string): Promise<void> => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('createdAt', '<', sevenDaysAgo)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Errore cleanup notifiche:', error);
  }
};
