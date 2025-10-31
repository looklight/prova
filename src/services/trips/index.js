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
  saveTrip,
  updateTrip,
  updateTripMetadata,
  leaveTrip,
  deleteTripForUser,
  deleteTrip,
  loadTrip,
  loadUserTrips
} from './tripOperations';

// Gestione membri
export {
  addMemberToTrip,
  removeMemberFromTrip,
  removeMember
  // ⭐ RIMOSSE: changeMemberRole, updateMemberRole
} from './memberManagement';

// Sistema inviti
export {
  inviteMemberByUsername,
  acceptInvitation,
  rejectInvitation,
  loadPendingInvitations,
  subscribeToPendingInvitations,
  deleteInvitation
} from './invitations';

// Link di condivisione
export {
  generateShareLink,
  joinViaShareLink,
  disableShareLink
} from './shareLinks';