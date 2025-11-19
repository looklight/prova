// services/trips/index.js

// ============= BARREL EXPORT - TRIPS MODULE =============

// Permessi
export {
  getUserRole,
  canEdit,
  canDelete,
  isActiveMember
} from './permissions';

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
} from './tripOperations';

// Gestione membri
export {
  addMemberToTrip,
  removeMemberFromTrip,
  removeMember
} from './memberManagement';

// Sistema inviti
export {
  inviteMemberByUsername,
  acceptInvitation,
  rejectInvitation,
  loadPendingInvitations,
  subscribeToPendingInvitations,
  deleteInvitation,
  cleanupExpiredInvitations
} from './invitations';

// Media service
export * from './mediaService';

// Profile service
export * from './profileService';