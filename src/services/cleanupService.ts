// ============================================
// ALTROVE - Database Cleanup Service
// Servizio centralizzato per la pulizia del database
// ============================================

import { db } from '../firebase';
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';

// ============= CONFIGURATION =============

const CLEANUP_CONFIG = {
  // Reminders
  REMINDER_DAYS_AFTER_EXPIRY: 7,      // Elimina reminder scaduti da X giorni
  REMINDER_DAYS_AFTER_NOTIFIED: 3,    // Elimina reminder notificati da X giorni

  // Inviti via username
  INVITATION_CLEANUP_ENABLED: true,    // Abilita cleanup inviti username

  // Inviti via link
  LINK_INVITE_DAYS_AFTER_EXPIRY: 7,   // Elimina link scaduti da X giorni

  // Notifiche
  NOTIFICATION_DAYS_TO_KEEP: 7         // Elimina notifiche più vecchie di X giorni
};

// ============= TYPES =============

interface CleanupResult {
  reminders: {
    expired: number;
    notified: number;
  };
  invitations: number;
  linkInvites: {
    expired: number;
    invalidated: number;
  };
  notifications: number;
  totalCleaned: number;
  duration: number;
}

// ============= CLEANUP FUNCTIONS =============

/**
 * Pulisce i reminder scaduti da più di X giorni
 */
const cleanupExpiredReminders = async (): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.REMINDER_DAYS_AFTER_EXPIRY);

    const q = query(
      collection(db, 'reminders'),
      where('reminderDate', '<', cutoffDate)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return snapshot.size;
  } catch (error) {
    console.error('[Cleanup] Errore pulizia reminder scaduti:', error);
    return 0;
  }
};

/**
 * Pulisce i reminder già notificati da più di X giorni
 */
const cleanupNotifiedReminders = async (): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.REMINDER_DAYS_AFTER_NOTIFIED);

    const q = query(
      collection(db, 'reminders'),
      where('notified', '==', true),
      where('notifiedAt', '<', cutoffDate)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return snapshot.size;
  } catch (error) {
    console.error('[Cleanup] Errore pulizia reminder notificati:', error);
    return 0;
  }
};

/**
 * Pulisce gli inviti via username scaduti per un utente specifico
 */
const cleanupExpiredInvitations = async (userId: string): Promise<number> => {
  if (!CLEANUP_CONFIG.INVITATION_CLEANUP_ENABLED) return 0;

  try {
    const now = new Date();
    const invitationsRef = collectionGroup(db, 'invitations');

    const q = query(
      invitationsRef,
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return snapshot.size;
  } catch (error) {
    console.error('[Cleanup] Errore pulizia inviti username:', error);
    return 0;
  }
};

/**
 * Pulisce i link invito scaduti (expiresAt passato)
 */
const cleanupExpiredLinkInvites = async (): Promise<number> => {
  try {
    const now = new Date();
    const invitesRef = collection(db, 'invites');

    const q = query(
      invitesRef,
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return snapshot.size;
  } catch (error) {
    console.error('[Cleanup] Errore pulizia link invito scaduti:', error);
    return 0;
  }
};

/**
 * Pulisce i link invito invalidati (status: 'expired') da più di X giorni
 */
const cleanupInvalidatedLinkInvites = async (): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.LINK_INVITE_DAYS_AFTER_EXPIRY);

    // Query per link con status 'expired' e createdAt vecchio
    // (usiamo createdAt perché non abbiamo un campo 'expiredAt')
    const invitesRef = collection(db, 'invites');
    const q = query(
      invitesRef,
      where('status', '==', 'expired')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    // Filtra quelli più vecchi di X giorni
    const oldDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt);
      return createdAt < cutoffDate;
    });

    if (oldDocs.length === 0) return 0;

    const deletePromises = oldDocs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return oldDocs.length;
  } catch (error) {
    console.error('[Cleanup] Errore pulizia link invito invalidati:', error);
    return 0;
  }
};

/**
 * Pulisce le notifiche più vecchie di X giorni
 */
const cleanupOldNotifications = async (userId: string): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.NOTIFICATION_DAYS_TO_KEEP);

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('createdAt', '<', cutoffDate)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return snapshot.size;
  } catch (error) {
    console.error('[Cleanup] Errore pulizia notifiche:', error);
    return 0;
  }
};

// ============= MAIN CLEANUP FUNCTION =============

/**
 * Esegue la pulizia completa del database
 * Da chiamare all'avvio dell'app dopo il login
 *
 * @param userId - ID dell'utente loggato (per cleanup user-specific)
 * @param silent - Se true, non logga i risultati (default: false)
 */
export const performDatabaseCleanup = async (
  userId: string,
  silent: boolean = false
): Promise<CleanupResult> => {
  const startTime = Date.now();

  if (!silent) {
    console.log('[Cleanup] 🧹 Avvio pulizia database...');
  }

  // Esegui tutte le pulizie in parallelo per efficienza
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
    cleanupExpiredInvitations(userId),
    cleanupExpiredLinkInvites(),
    cleanupInvalidatedLinkInvites(),
    cleanupOldNotifications(userId)
  ]);

  const result: CleanupResult = {
    reminders: {
      expired: expiredReminders,
      notified: notifiedReminders
    },
    invitations: expiredInvitations,
    linkInvites: {
      expired: expiredLinkInvites,
      invalidated: invalidatedLinkInvites
    },
    notifications: oldNotifications,
    totalCleaned:
      expiredReminders +
      notifiedReminders +
      expiredInvitations +
      expiredLinkInvites +
      invalidatedLinkInvites +
      oldNotifications,
    duration: Date.now() - startTime
  };

  if (!silent && result.totalCleaned > 0) {
    console.log(`[Cleanup] ✅ Pulizia completata in ${result.duration}ms:`, {
      'Reminder scaduti': result.reminders.expired,
      'Reminder notificati': result.reminders.notified,
      'Inviti username scaduti': result.invitations,
      'Link invito scaduti': result.linkInvites.expired,
      'Link invito invalidati': result.linkInvites.invalidated,
      'Notifiche vecchie': result.notifications,
      'TOTALE': result.totalCleaned
    });
  } else if (!silent) {
    console.log(`[Cleanup] ✅ Database già pulito (${result.duration}ms)`);
  }

  return result;
};

// ============= EXPORTS =============

export { CLEANUP_CONFIG };
export type { CleanupResult };
