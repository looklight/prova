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
  saveTrip,
  updateTrip,
  updateTripMetadata,
  leaveTrip,
  deleteTripForUser,
  deleteTrip,
  loadTrip,
  loadUserTrips
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

// Link di condivisione
export {
  generateShareLink,
  joinViaShareLink,
  disableShareLink
} from './trips/shareLinks';

// Media service
export * from './mediaService';

// Profile service
export * from './profileService';

// Trip service
export * from './tripService';