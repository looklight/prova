// ============================================
// ALTROVE - Reminder Service
// Gestione promemoria attività
// ============================================

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

export interface ReminderData {
  tripId: string;
  tripName: string;
  dayId: string | number;
  dayNumber: number;
  categoryId: string;
  categoryLabel: string;
  activityTitle?: string;
  reminderDate: Date | string;
  reminderTime?: string;
  note?: string | null;
  participants?: string[] | null;
  tripMembers?: string[];
  createdBy: string;
}

export interface Reminder extends ReminderData {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  notified: boolean;
  notifiedAt: Date | null;
}

export interface ReminderUpdates {
  reminderDate?: Date | string;
  reminderTime?: string;
  note?: string | null;
  participants?: string[] | null;
}

/**
 * Crea un nuovo reminder
 */
export const createReminder = async (data: ReminderData): Promise<string> => {
  try {
    const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reminderRef = doc(db, 'reminders', reminderId);

    await setDoc(reminderRef, {
      tripId: data.tripId,
      tripName: data.tripName,
      dayId: data.dayId,
      dayNumber: data.dayNumber,
      categoryId: data.categoryId,
      categoryLabel: data.categoryLabel,
      activityTitle: data.activityTitle || data.categoryLabel,
      reminderDate: data.reminderDate,
      reminderTime: data.reminderTime || '09:00',
      note: data.note || null,
      participants: data.participants || null,
      tripMembers: data.tripMembers || [],
      createdBy: data.createdBy,
      createdAt: new Date(),
      notified: false,
      notifiedAt: null
    });

    return reminderId;
  } catch (error) {
    console.error('Errore creazione reminder:', error);
    throw error;
  }
};

/**
 * Aggiorna un reminder esistente
 */
export const updateReminder = async (
  reminderId: string,
  updates: ReminderUpdates
): Promise<void> => {
  try {
    const reminderRef = doc(db, 'reminders', reminderId);

    await updateDoc(reminderRef, {
      ...updates,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Errore aggiornamento reminder:', error);
    throw error;
  }
};

/**
 * Elimina un reminder
 */
export const deleteReminder = async (reminderId: string): Promise<void> => {
  try {
    if (!reminderId) return;

    await deleteDoc(doc(db, 'reminders', reminderId));
  } catch (error) {
    console.error('Errore eliminazione reminder:', error);
  }
};

/**
 * Elimina tutti i reminder di una categoria specifica
 */
export const deleteRemindersByCategory = async (
  tripId: string,
  dayId: string | number,
  categoryId: string
): Promise<void> => {
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
  } catch (error) {
    console.error('Errore eliminazione reminder per categoria:', error);
  }
};

/**
 * Elimina tutti i reminder di un viaggio
 */
export const deleteRemindersByTrip = async (tripId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'reminders'),
      where('tripId', '==', tripId)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Errore eliminazione reminder per viaggio:', error);
  }
};

/**
 * Ottieni reminder per una categoria specifica
 */
export const getReminderByCategory = async (
  tripId: string,
  dayId: string | number,
  categoryId: string
): Promise<Reminder | null> => {
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

    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Reminder;
  } catch (error) {
    console.error('Errore recupero reminder:', error);
    return null;
  }
};

/**
 * Pulisce i reminder scaduti da più di X giorni
 * @param daysAfterExpiry - Giorni dopo la scadenza prima di eliminare (default: 7)
 */
export const cleanupExpiredReminders = async (daysAfterExpiry: number = 7): Promise<number> => {
  try {
    // Data limite: reminder scaduti da più di X giorni
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAfterExpiry);

    const q = query(
      collection(db, 'reminders'),
      where('reminderDate', '<', cutoffDate)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`Puliti ${snapshot.size} reminder scaduti`);
    return snapshot.size;
  } catch (error) {
    console.error('Errore pulizia reminder scaduti:', error);
    return 0;
  }
};

/**
 * Pulisce i reminder già notificati da più di X giorni
 * @param daysAfterNotification - Giorni dopo la notifica prima di eliminare (default: 3)
 */
export const cleanupNotifiedReminders = async (daysAfterNotification: number = 3): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAfterNotification);

    const q = query(
      collection(db, 'reminders'),
      where('notified', '==', true),
      where('notifiedAt', '<', cutoffDate)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`Puliti ${snapshot.size} reminder notificati`);
    return snapshot.size;
  } catch (error) {
    console.error('Errore pulizia reminder notificati:', error);
    return 0;
  }
};

/**
 * Esegue la pulizia completa dei reminder obsoleti
 * Da chiamare all'avvio dell'app o periodicamente
 */
export const performRemindersCleanup = async (): Promise<void> => {
  try {
    const expiredCount = await cleanupExpiredReminders(7);
    const notifiedCount = await cleanupNotifiedReminders(3);

    if (expiredCount > 0 || notifiedCount > 0) {
      console.log(`Pulizia reminder completata: ${expiredCount} scaduti, ${notifiedCount} notificati`);
    }
  } catch (error) {
    console.error('Errore pulizia reminder:', error);
  }
};
