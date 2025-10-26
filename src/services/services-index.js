// ============= EXPORT CENTRALIZZATO SERVICES =============

// Trip Service
export {
  // Query e sottoscrizioni
  subscribeToUserTrips,
  loadUserTrips,
  loadTrip,
  
  // CRUD viaggi
  createTrip,          // ⭐ NUOVO: Usa questo invece di saveTrip
  updateTrip,
  updateTripMetadata,
  deleteTripForUser,   // ⭐ NUOVO: Logica WhatsApp
  leaveTrip,           // ⭐ NUOVO: Abbandona viaggio
  
  // Deprecated (retrocompatibilità)
  saveTrip,            // ⚠️ Usa createTrip
  deleteTrip,          // ⚠️ Usa deleteTripForUser
  
  // Helper permessi
  getUserRole,
  canEdit,
  canDelete,
  isActiveMember,
  
  // 🔜 Step 2: Gestione membri
  addMemberToTrip,
  removeMemberFromTrip,
  changeMemberRole
} from './tripService';

// Profile Service (invariato)
export {
  loadUserProfile,
  updateUserProfile,
  checkUsernameAvailability,
  isUsernameValid
} from './profileService';

// Media Service (invariato)
export {
  resizeImage,
  getImageDimensions
} from './mediaService';