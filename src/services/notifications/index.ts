// ============================================
// ALTROVE - Notifications Module
// Export centralizzato
// ============================================

// Core operations
export {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupOldNotifications
} from './notificationService';

export type { Notification } from './notificationService';

// Notification creators - Inviti
export {
  createLinkInviteAcceptedNotification,
  createUsernameInviteAcceptedNotification
} from './inviteNotifications';

// Notification creators - Membri
export {
  createMemberLeftNotification,
  createMemberRemovedNotification
} from './memberNotifications';

// Types
export { NOTIFICATION_TYPES, NOTIFICATION_CONFIG } from './types';
export type { NotificationType } from './types';

// Reminders
export {
  createReminder,
  updateReminder,
  deleteReminder,
  deleteRemindersByCategory,
  deleteRemindersByTrip,
  getReminderByCategory
} from './reminderService';

export type { ReminderData, Reminder, ReminderUpdates } from './reminderService';
