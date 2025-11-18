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
 * 🔄 Sottoscrivi a TUTTE le notifiche recenti (lette e non lette)
 * Le notifiche vengono mostrate per 7 giorni, poi auto-eliminate
 */
export const subscribeToNotifications = (userId, onUpdate) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('createdAt', '>=', sevenDaysAgo),  // 🆕 Ultime 7 giorni
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
        
        const unreadCount = notifications.filter(n => !n.read).length;
        console.log(`🔔 Notifiche totali: ${notifications.length} (${unreadCount} non lette)`);
        
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
    return () => {};
  }
};

/**
 * ✅ Segna una notifica come letta
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
 * 🧹 Auto-cleanup notifiche vecchie (chiamare al login)
 * Elimina notifiche più vecchie di 7 giorni
 */
export const cleanupOldNotifications = async (userId) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('createdAt', '<', sevenDaysAgo)  // 🆕 Più vecchie di 7 giorni
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    if (snapshot.size > 0) {
      console.log(`🧹 ${snapshot.size} notifiche vecchie eliminate`);
    }
  } catch (error) {
    console.error('❌ Errore cleanup notifiche:', error);
  }
};