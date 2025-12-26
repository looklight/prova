/**
 * ============================================
 * ALTROVE - Cloud Functions
 * ============================================
 *
 * Funzioni:
 * - processReminders: Ogni ora, crea notifiche per reminder scaduti
 * - dailyDatabaseCleanup: Ogni notte alle 3:00, pulisce dati obsoleti
 * - weeklyStorageCleanup: Ogni domenica alle 4:00, elimina immagini orfane
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// ============================================
// INIZIALIZZAZIONE
// ============================================

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

// ============================================
// CONFIGURAZIONE
// ============================================

const CONFIG = {
  // Retention dei dati (in giorni)
  RETENTION: {
    REMINDERS_AFTER_EXPIRY: 7,      // Reminder mai notificati, scaduti da X giorni
    REMINDERS_AFTER_NOTIFIED: 3,    // Reminder già notificati da X giorni
    LINK_INVITES_INVALIDATED: 7,    // Link con status "expired" da X giorni
    NOTIFICATIONS: 14               // Notifiche più vecchie di X giorni
  },
  // Timezone
  TIMEZONE: "Europe/Rome"
};

// ============================================
// UTILITIES
// ============================================

/**
 * Elimina documenti in batch (gestisce più di 500 documenti)
 */
async function batchDelete(
  docs: admin.firestore.QueryDocumentSnapshot[]
): Promise<number> {
  if (docs.length === 0) return 0;

  const batches: admin.firestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let count = 0;

  for (const doc of docs) {
    currentBatch.delete(doc.ref);
    count++;

    if (count % 500 === 0) {
      batches.push(currentBatch);
      currentBatch = db.batch();
    }
  }

  // Aggiungi l'ultimo batch se ha operazioni
  if (count % 500 !== 0) {
    batches.push(currentBatch);
  }

  await Promise.all(batches.map((b) => b.commit()));
  return docs.length;
}

/**
 * Calcola data di cutoff (oggi - giorni)
 */
function getCutoffDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

// ============================================
// 🔔 PROCESS REMINDERS (ogni ora)
// ============================================

/**
 * Processa i reminder scaduti e crea notifiche
 * Schedule: ogni ora al minuto 0
 */
export const processReminders = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: CONFIG.TIMEZONE,
    retryCount: 3,
    maxInstances: 1
  },
  async () => {
    logger.info("🔔 Avvio processamento reminder...");

    try {
      const now = new Date();

      // Query: reminder non notificati con data <= oggi
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const remindersQuery = await db
        .collection("reminders")
        .where("notified", "==", false)
        .where("reminderDate", "<=", endOfToday)
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

        // Calcola data/ora completa del reminder
        const reminderDate = reminder.reminderDate?.toDate?.()
          ?? new Date(reminder.reminderDate);
        const [hours, minutes] = (reminder.reminderTime || "00:00")
          .split(":")
          .map(Number);

        const reminderDateTime = new Date(reminderDate);
        reminderDateTime.setHours(hours, minutes, 0, 0);

        // Skip se non ancora scaduto
        if (reminderDateTime > now) {
          continue;
        }

        // Determina destinatari
        const recipients = reminder.participants || reminder.tripMembers || [];
        if (recipients.length === 0) {
          logger.warn(`⚠️ Reminder ${reminderId} senza destinatari`);
          continue;
        }

        // Crea notifiche per tutti i destinatari
        await Promise.all(
          recipients.map((userId: string) =>
            createReminderNotification(userId, reminder, reminderId)
          )
        );

        notificationsCreated += recipients.length;

        // Marca come notificato
        await reminderDoc.ref.update({
          notified: true,
          notifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      logger.info(`🎉 Completato: ${notificationsCreated} notifiche create`);
    } catch (error) {
      logger.error("❌ Errore processamento reminder:", error);
      throw error;
    }
  }
);

/**
 * Crea una notifica reminder per un utente
 */
async function createReminderNotification(
  userId: string,
  reminder: admin.firestore.DocumentData,
  reminderId: string
): Promise<void> {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.collection("notifications").doc(notifId).set({
      type: "activity_reminder",
      userId,
      tripId: reminder.tripId,
      tripName: reminder.tripName,
      dayNumber: reminder.dayNumber,
      categoryId: reminder.categoryId,
      categoryLabel: reminder.categoryLabel,
      activityTitle: reminder.activityTitle,
      note: reminder.note || null,
      reminderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
  } catch (error) {
    logger.error(`❌ Errore notifica per ${userId}:`, error);
  }
}

// ============================================
// 🧹 DAILY DATABASE CLEANUP (ogni notte)
// ============================================

/**
 * Pulizia giornaliera del database
 * Schedule: ogni giorno alle 3:00
 */
export const dailyDatabaseCleanup = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: CONFIG.TIMEZONE,
    retryCount: 2,
    maxInstances: 1
  },
  async () => {
    logger.info("🧹 Avvio pulizia giornaliera...");
    const startTime = Date.now();

    try {
      // Esegui tutte le pulizie in parallelo
      const [
        expiredReminders,
        notifiedReminders,
        expiredInvitations,
        expiredLinkInvites,
        invalidatedLinkInvites,
        oldNotifications
      ] = await Promise.all([
        cleanupExpiredReminders(),
        cleanupNotifiedReminders(),
        cleanupExpiredInvitations(),
        cleanupExpiredLinkInvites(),
        cleanupInvalidatedLinkInvites(),
        cleanupOldNotifications()
      ]);

      const total =
        expiredReminders +
        notifiedReminders +
        expiredInvitations +
        expiredLinkInvites +
        invalidatedLinkInvites +
        oldNotifications;

      const duration = Date.now() - startTime;

      if (total > 0) {
        logger.info(`🧹 Pulizia completata in ${duration}ms`, {
          reminderScaduti: expiredReminders,
          reminderNotificati: notifiedReminders,
          invitiUsername: expiredInvitations,
          linkScaduti: expiredLinkInvites,
          linkInvalidati: invalidatedLinkInvites,
          notifiche: oldNotifications,
          totale: total
        });
      } else {
        logger.info(`✅ Database già pulito (${duration}ms)`);
      }
    } catch (error) {
      logger.error("❌ Errore pulizia database:", error);
      throw error;
    }
  }
);

// ============================================
// CLEANUP FUNCTIONS
// ============================================

/**
 * Elimina reminder con data scaduta da X giorni (mai notificati)
 */
async function cleanupExpiredReminders(): Promise<number> {
  try {
    const cutoff = getCutoffDate(CONFIG.RETENTION.REMINDERS_AFTER_EXPIRY);

    const query = await db
      .collection("reminders")
      .where("reminderDate", "<", cutoff)
      .get();

    return await batchDelete(query.docs);
  } catch (error) {
    logger.error("Errore cleanup reminder scaduti:", error);
    return 0;
  }
}

/**
 * Elimina reminder già notificati da X giorni
 */
async function cleanupNotifiedReminders(): Promise<number> {
  try {
    const cutoff = getCutoffDate(CONFIG.RETENTION.REMINDERS_AFTER_NOTIFIED);

    const query = await db
      .collection("reminders")
      .where("notified", "==", true)
      .where("notifiedAt", "<", cutoff)
      .get();

    return await batchDelete(query.docs);
  } catch (error) {
    logger.error("Errore cleanup reminder notificati:", error);
    return 0;
  }
}

/**
 * Elimina inviti username scaduti (tutte le subcollection)
 */
async function cleanupExpiredInvitations(): Promise<number> {
  try {
    const now = new Date();

    const query = await db
      .collectionGroup("invitations")
      .where("status", "==", "pending")
      .where("expiresAt", "<", now)
      .get();

    return await batchDelete(query.docs);
  } catch (error) {
    logger.error("Errore cleanup inviti username:", error);
    return 0;
  }
}

/**
 * Elimina link invito con expiresAt passato
 */
async function cleanupExpiredLinkInvites(): Promise<number> {
  try {
    const now = new Date();

    const query = await db
      .collection("invites")
      .where("expiresAt", "<", now)
      .get();

    return await batchDelete(query.docs);
  } catch (error) {
    logger.error("Errore cleanup link scaduti:", error);
    return 0;
  }
}

/**
 * Elimina link invito invalidati (status: expired) da X giorni
 */
async function cleanupInvalidatedLinkInvites(): Promise<number> {
  try {
    const cutoff = getCutoffDate(CONFIG.RETENTION.LINK_INVITES_INVALIDATED);

    const query = await db
      .collection("invites")
      .where("status", "==", "expired")
      .get();

    // Filtra per createdAt < cutoff (non possiamo fare query composita)
    const docsToDelete = query.docs.filter((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt);
      return createdAt < cutoff;
    });

    return await batchDelete(docsToDelete);
  } catch (error) {
    logger.error("Errore cleanup link invalidati:", error);
    return 0;
  }
}

/**
 * Elimina notifiche più vecchie di X giorni
 */
async function cleanupOldNotifications(): Promise<number> {
  try {
    const cutoff = getCutoffDate(CONFIG.RETENTION.NOTIFICATIONS);

    const query = await db
      .collection("notifications")
      .where("createdAt", "<", cutoff)
      .get();

    return await batchDelete(query.docs);
  } catch (error) {
    logger.error("Errore cleanup notifiche:", error);
    return 0;
  }
}

// ============================================
// 🗑️ WEEKLY STORAGE CLEANUP (ogni settimana)
// ============================================

/**
 * 🗑️ Weekly Storage Cleanup
 * Elimina immagini orfane dallo Storage
 *
 * Logica:
 * 1. Legge tutti i documenti in "pendingMedia" più vecchi di 24h
 * 2. Elimina i file corrispondenti dallo Storage
 * 3. Elimina i documenti da pendingMedia
 *
 * Schedule: ogni domenica alle 4:00
 */
export const weeklyStorageCleanup = onSchedule(
  {
    schedule: "0 4 * * 0", // Ogni domenica alle 4:00
    timeZone: CONFIG.TIMEZONE,
    retryCount: 2,
    maxInstances: 1
  },
  async () => {
    logger.info("🗑️ Avvio cleanup storage settimanale...");
    const startTime = Date.now();

    try {
      // Media pending da più di 24 ore sono considerati orfani
      const cutoff = getCutoffDate(1); // 24h fa

      const pendingQuery = await db
        .collection("pendingMedia")
        .where("createdAt", "<", cutoff)
        .get();

      if (pendingQuery.empty) {
        logger.info("✅ Nessun media orfano da eliminare");
        return;
      }

      logger.info(`🔍 Trovati ${pendingQuery.size} media orfani da eliminare`);

      let deletedCount = 0;
      let errorCount = 0;

      // Inizializza Storage
      const bucket = admin.storage().bucket();

      for (const docSnap of pendingQuery.docs) {
        const data = docSnap.data();
        const path = data.path;

        try {
          // Elimina file da Storage
          const file = bucket.file(path);
          const [exists] = await file.exists();

          if (exists) {
            await file.delete();
            logger.info(`🗑️ Eliminato: ${path}`);
            deletedCount++;
          } else {
            logger.info(`⚠️ File già eliminato: ${path}`);
          }

          // Elimina documento da pendingMedia
          await docSnap.ref.delete();
        } catch (error) {
          logger.error(`❌ Errore eliminazione ${path}:`, error);
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;

      logger.info(`🗑️ Cleanup storage completato in ${duration}ms`, {
        eliminati: deletedCount,
        errori: errorCount,
        totale: pendingQuery.size
      });
    } catch (error) {
      logger.error("❌ Errore cleanup storage:", error);
      throw error;
    }
  }
);
