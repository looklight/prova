// services/reminderService.js
import { db } from '../../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  updateDoc
} from 'firebase/firestore';

/**
 * Crea un nuovo reminder
 * @returns {string} reminderId
 */
export const createReminder = async ({
  tripId,
  tripName,
  dayId,
  dayNumber,
  categoryId,
  categoryLabel,
  activityTitle,
  reminderDate,
  reminderTime,
  note,
  participants,
  tripMembers,
  createdBy
}) => {
  try {
    const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reminderRef = doc(db, 'reminders', reminderId);
    
    await setDoc(reminderRef, {
      tripId,
      tripName,
      dayId,
      dayNumber,
      categoryId,
      categoryLabel,
      activityTitle: activityTitle || categoryLabel,
      reminderDate,
      reminderTime: reminderTime || '09:00',
      note: note || null,
      participants: participants || null,  // Chi notificare (da CostBreakdown)
      tripMembers: tripMembers || [],      // Fallback: tutti i membri attivi
      createdBy,
      createdAt: new Date(),
      notified: false,
      notifiedAt: null
    });
    
    console.log(`✅ Reminder creato: ${reminderId}`);
    return reminderId;
  } catch (error) {
    console.error('❌ Errore creazione reminder:', error);
    throw error;
  }
};

/**
 * Aggiorna un reminder esistente
 */
export const updateReminder = async (reminderId, updates) => {
  try {
    const reminderRef = doc(db, 'reminders', reminderId);
    
    await updateDoc(reminderRef, {
      ...updates,
      updatedAt: new Date()
    });
    
    console.log(`✅ Reminder aggiornato: ${reminderId}`);
  } catch (error) {
    console.error('❌ Errore aggiornamento reminder:', error);
    throw error;
  }
};

/**
 * Elimina un reminder
 */
export const deleteReminder = async (reminderId) => {
  try {
    if (!reminderId) return;
    
    await deleteDoc(doc(db, 'reminders', reminderId));
    console.log(`✅ Reminder eliminato: ${reminderId}`);
  } catch (error) {
    console.error('❌ Errore eliminazione reminder:', error);
    // Non bloccare il flusso
  }
};

/**
 * Elimina tutti i reminder di una categoria specifica
 * Utile quando si resetta una categoria
 */
export const deleteRemindersByCategory = async (tripId, dayId, categoryId) => {
  try {
    const q = query(
      collection(db, 'reminders'),
      where('tripId', '==', tripId),
      where('dayId', '==', dayId),
      where('categoryId', '==', categoryId)
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    if (snapshot.size > 0) {
      console.log(`✅ ${snapshot.size} reminder eliminati per categoria ${categoryId}`);
    }
  } catch (error) {
    console.error('❌ Errore eliminazione reminder per categoria:', error);
  }
};

/**
 * Elimina tutti i reminder di un viaggio
 * Utile quando si elimina un viaggio
 */
export const deleteRemindersByTrip = async (tripId) => {
  try {
    const q = query(
      collection(db, 'reminders'),
      where('tripId', '==', tripId)
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    if (snapshot.size > 0) {
      console.log(`✅ ${snapshot.size} reminder eliminati per viaggio ${tripId}`);
    }
  } catch (error) {
    console.error('❌ Errore eliminazione reminder per viaggio:', error);
  }
};

/**
 * Ottieni reminder per una categoria specifica
 * Utile per verificare se esiste già un reminder
 */
export const getReminderByCategory = async (tripId, dayId, categoryId) => {
  try {
    const q = query(
      collection(db, 'reminders'),
      where('tripId', '==', tripId),
      where('dayId', '==', dayId),
      where('categoryId', '==', categoryId),
      where('notified', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('❌ Errore recupero reminder:', error);
    return null;
  }
};