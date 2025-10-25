// ============= EXPORT CENTRALIZZATO =============
// Permette di importare tutto da un unico punto: import { ... } from './services'

// Funzioni Viaggi
export {
  loadUserTrips,
  subscribeToUserTrips,
  saveTrip,
  updateTrip,
  deleteTrip,
  updateTripMetadata,
  loadTrip
} from './tripService';

// Funzioni Profilo e Username
export {
  checkUsernameExists,
  generateUniqueUsername,
  isValidUsername,
  generateDefaultProfile,
  loadUserProfile,
  updateUserProfile
} from './profileService';

// Funzioni Media
export {
  resizeImage
} from './mediaService';