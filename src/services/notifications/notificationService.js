// services/notifications/notificationService.js
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
  deleteDoc
} from 'firebase/firestore';

/**
 * 🔄 Sottoscrivi alle notifiche non lette dell'utente (real-time)
 * @param {string} userId - ID utente
 * @param {Function} onUpdate - Callback con notifiche aggiornate
 * @returns {Function} - Funzione unsubscribe
 */
export const subscribeToNotifications = (userId, onUpdate) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const notifications = [];
        snapshot.forEach(doc => {
          notifications.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
          });
        });
        
        console.log(`🔔 Notifiche non lette: ${notifications.length}`);
        onUpdate(notifications);
      },
      (error) => {
        console.error('❌ Errore listener notifiche:', error);
        onUpdate([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Errore sottoscrizione notifiche:', error);
    return () => {}; // Ritorna funzione vuota
  }
};

/**
 * ✅ Segna una notifica come letta
 * @param {string} notificationId - ID notifica
 */
export const markAsRead = async (notificationId) => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAt: new Date()
    });
    
    console.log(`✅ Notifica ${notificationId} segnata come letta`);
  } catch (error) {
    console.error('❌ Errore aggiornamento notifica:', error);
  }
};

/**
 * ✅ Segna tutte le notifiche come lette
 * @param {string} userId - ID utente
 */
export const markAllAsRead = async (userId) => {
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
    console.log(`✅ ${snapshot.size} notifiche segnate come lette`);
  } catch (error) {
    console.error('❌ Errore aggiornamento notifiche:', error);
  }
};

/**
 * 🗑️ Elimina una notifica
 * @param {string} notificationId - ID notifica
 */
export const deleteNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
    console.log(`✅ Notifica ${notificationId} eliminata`);
  } catch (error) {
    console.error('❌ Errore eliminazione notifica:', error);
  }
};

/**
 * 🗑️ Elimina tutte le notifiche lette dell'utente
 * @param {string} userId - ID utente
 */
export const deleteReadNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`✅ ${snapshot.size} notifiche lette eliminate`);
  } catch (error) {
    console.error('❌ Errore eliminazione notifiche:', error);
  }
};