// services/notifications/index.js

// Core operations
export {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupOldNotifications
} from './notificationService';

// Notification creators - Inviti
export {
  createLinkInviteAcceptedNotification,
  createUsernameInviteAcceptedNotification
} from './inviteNotifications';

// 🆕 Notification creators - Membri
export {
  createMemberLeftNotification,
  createMemberRemovedNotification
} from './memberNotifications';

// Types
export { NOTIFICATION_TYPES, NOTIFICATION_CONFIG } from './types';