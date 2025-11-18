// services/notifications/index.js

// Core operations
export {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupOldNotifications
} from './notificationService';

// Notification creators
export {
  createLinkInviteAcceptedNotification,
  createUsernameInviteAcceptedNotification
} from './inviteNotifications';

// Types
export { NOTIFICATION_TYPES, NOTIFICATION_CONFIG } from './types';