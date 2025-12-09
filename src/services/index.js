// services/index.js

// ============= BARREL EXPORT - TRIPS MODULE =============

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

// Sistema inviti
export {
  inviteMemberByUsername,
  acceptInvitation,
  rejectInvitation,
  loadPendingInvitations,
  subscribeToPendingInvitations,
  deleteInvitation
} from './trips/invitations';

// Export link invites
export {
  generateInviteLink,
  getInviteDetails,
  acceptInviteLink,
  getActiveInviteLink,
  invalidateInviteLink
} from './invites/linkInvites';

// Media service
export * from './mediaService';

// Profile service
export * from './profileService';

// 📦 Funzioni archiviazione (aggiunte per sistema archivio)
export {
  archiveTrip,
  unarchiveTrip
} from './profileService';

// Reminder service
export {
  createReminder,
  updateReminder,
  deleteReminder,
  deleteRemindersByCategory,
  deleteRemindersByTrip,
  getReminderByCategory
} from './notifications/reminderService';