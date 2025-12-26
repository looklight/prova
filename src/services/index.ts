// ============================================
// ALTROVE - Services Module
// Export centralizzato
// ============================================

// ============= TRIPS =============

// Permessi
export {
  getUserRole,
  canEdit,
  canDelete,
  isActiveMember
} from './trips/permissions';

// Operazioni CRUD viaggi
export {
  subscribeToUserTrips,
  createTrip,
  updateTrip,
  updateTripMetadata,
  leaveTrip,
  deleteTripForUser,
  loadTrip,
  loadUserTrips,
  updateUserProfileInTrips
} from './trips/tripOperations';

// Gestione membri
export {
  addMemberToTrip,
  removeMemberFromTrip,
  removeMember
} from './trips/memberManagement';

// Sistema inviti username
export {
  inviteMemberByUsername,
  acceptInvitation,
  rejectInvitation,
  loadPendingInvitations,
  subscribeToPendingInvitations,
  deleteInvitation,
  cleanupExpiredInvitations
} from './trips/invitations';

// ============= LINK INVITES =============

export {
  generateInviteLink,
  getInviteDetails,
  acceptInviteLink,
  getActiveInviteLink,
  invalidateInviteLink,
  getInviteLinkStats,
  cleanupExpiredInvites
} from './invites/linkInvites';

// ============= MEDIA =============

export * from './mediaService';

// ============= PROFILE =============

export * from './profileService';

// ============= REMINDERS =============

export {
  createReminder,
  updateReminder,
  deleteReminder,
  deleteRemindersByCategory,
  deleteRemindersByTrip,
  getReminderByCategory
} from './notifications/reminderService';

export type {
  ReminderData,
  Reminder,
  ReminderUpdates
} from './notifications/reminderService';

// ============= CLEANUP =============

export {
  performDatabaseCleanup,
  CLEANUP_CONFIG
} from './cleanupService';

export type { CleanupResult } from './cleanupService';
