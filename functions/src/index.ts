/**
 * Cloud Functions per Look Travel
 * 
 * Funzioni:
 * - processReminders: Schedulata ogni ora, crea notifiche per reminder scaduti
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Inizializza Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Limita istanze per controllo costi
setGlobalOptions({ maxInstances: 10 });

/**
 * 🔔 Process Reminders
 * Esegue ogni ora, trova reminder scaduti e crea notifiche
 * 
 * Schedule: ogni ora al minuto 0 (es. 9:00, 10:00, 11:00)
 * Timezone: Europe/Rome
 */
export const processReminders = onSchedule(
  {
    schedule: "0 * * * *",  // Ogni ora
    timeZone: "Europe/Rome",
    retryCount: 3,
    maxInstances: 1  // Una sola istanza alla volta
  },
  async (event) => {
    logger.info("🔔 Avvio processamento reminder...");

    try {
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0]; // "2025-07-12"
      const currentTime = now.toTimeString().slice(0, 5);   // "09:00"

      logger.info(`📅 Data/ora corrente: ${currentDate} ${currentTime}`);

      // Query: reminder non notificati con data <= oggi
      const remindersQuery = await db
        .collection("reminders")
        .where("notified", "==", false)
        .where("reminderDate", "<=", currentDate)
        .get();

      if (remindersQuery.empty) {
        logger.info("✅ Nessun reminder da processare");
        return;
      }

      logger.info(`📬 Trovati ${remindersQuery.size} reminder da verificare`);

      let notificationsCreated = 0;

      for (const reminderDoc of remindersQuery.docs) {
        const reminder = reminderDoc.data();
        const reminderId = reminderDoc.id;

        // Verifica se è il momento giusto
        // Se la data è passata O se è oggi e l'ora è passata
        const shouldNotify =
          reminder.reminderDate < currentDate ||
          (reminder.reminderDate === currentDate &&
            (reminder.reminderTime || "00:00") <= currentTime);

        if (!shouldNotify) {
          logger.info(`⏳ Reminder ${reminderId} non ancora scaduto (${reminder.reminderDate} ${reminder.reminderTime})`);
          continue;
        }

        // Determina destinatari
        const recipients = reminder.participants || reminder.tripMembers || [];

        if (recipients.length === 0) {
          logger.warn(`⚠️ Reminder ${reminderId} senza destinatari, skip`);
          continue;
        }

        logger.info(`📤 Creo notifiche per reminder ${reminderId} -> ${recipients.length} destinatari`);

        // Crea notifica per ogni destinatario
        const notificationPromises = recipients.map((userId: string) =>
          createReminderNotification(userId, reminder, reminderId)
        );

        await Promise.all(notificationPromises);
        notificationsCreated += recipients.length;

        // Marca reminder come notificato
        await reminderDoc.ref.update({
          notified: true,
          notifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`✅ Reminder ${reminderId} processato`);
      }

      // Cleanup: elimina reminder notificati da più di 7 giorni
      await cleanupOldReminders();

      logger.info(`🎉 Processamento completato: ${notificationsCreated} notifiche create`);

    } catch (error) {
      logger.error("❌ Errore processamento reminder:", error);
      throw error; // Retry automatico
    }
  }
);

/**
 * Crea una notifica per un singolo utente
 */
async function createReminderNotification(
  userId: string,
  reminder: admin.firestore.DocumentData,
  reminderId: string
) {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.collection("notifications").doc(notifId).set({
      type: "activity_reminder",
      userId: userId,
      tripId: reminder.tripId,
      tripName: reminder.tripName,
      dayNumber: reminder.dayNumber,
      categoryId: reminder.categoryId,
      categoryLabel: reminder.categoryLabel,
      activityTitle: reminder.activityTitle,
      note: reminder.note || null,
      reminderId: reminderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    logger.info(`📬 Notifica creata per utente ${userId}`);
  } catch (error) {
    logger.error(`❌ Errore creazione notifica per ${userId}:`, error);
  }
}

/**
 * Elimina reminder notificati da più di 7 giorni
 */
async function cleanupOldReminders() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldRemindersQuery = await db
      .collection("reminders")
      .where("notified", "==", true)
      .where("notifiedAt", "<", sevenDaysAgo)
      .get();

    if (oldRemindersQuery.empty) {
      return;
    }

    const deletePromises = oldRemindersQuery.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);

    logger.info(`🧹 ${oldRemindersQuery.size} reminder vecchi eliminati`);
  } catch (error) {
    logger.error("❌ Errore cleanup reminder:", error);
  }
}