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

// Media service
export * from './mediaService';

// Profile service
export * from './profileService';