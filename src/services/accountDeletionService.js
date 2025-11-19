import { auth, db } from '../firebase';
import { 
  deleteUser, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';
import { deleteImageFromStorage } from './mediaService';
import { loadUserProfile } from './profileService';
import { loadUserTrips, leaveTrip } from './tripService';

/**
 * 🔑 Re-autenticazione utente (richiesta da Firebase per operazioni sensibili)
 */
export const reauthenticateUser = async (password) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Utente non autenticato');

  try {
    // Verifica provider
    const providerId = user.providerData[0]?.providerId;

    if (providerId === 'google.com') {
      // Google Sign-In
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);
      console.log('✅ Re-auth Google completata');
    } else if (providerId === 'password') {
      // Email/Password
      if (!password) throw new Error('Password richiesta');
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      console.log('✅ Re-auth Email/Password completata');
    } else {
      throw new Error('Provider non supportato');
    }
  } catch (error) {
    console.error('❌ Errore re-autenticazione:', error);
    if (error.code === 'auth/wrong-password') {
      throw new Error('Password errata');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Popup chiuso. Riprova.');
    }
    throw new Error('Errore autenticazione. Riprova.');
  }
};

/**
 * 🗑️ Elimina notifiche utente
 */
const deleteUserNotifications = async (userId) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const snapshot = await getDocs(notificationsRef);
    
    if (snapshot.empty) {
      console.log('✅ Nessuna notifica da eliminare');
      return;
    }

    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`✅ Eliminate ${snapshot.size} notifiche`);
  } catch (error) {
    console.error('❌ Errore eliminazione notifiche:', error);
    throw error;
  }
};

/**
 * 🗑️ Elimina inviti creati dall'utente
 */
const deleteUserInvites = async (userId) => {
  try {
    const invitesRef = collection(db, 'invites');
    const q = query(invitesRef, where('createdBy', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ Nessun invito da eliminare');
      return;
    }

    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`✅ Eliminati ${snapshot.size} inviti`);
  } catch (error) {
    console.error('❌ Errore eliminazione inviti:', error);
    throw error;
  }
};

/**
 * 🗑️ Elimina profilo Firestore
 */
const deleteUserProfile = async (userId) => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    await deleteDoc(profileRef);
    console.log('✅ Profilo Firestore eliminato');
  } catch (error) {
    console.error('❌ Errore eliminazione profilo:', error);
    throw error;
  }
};

/**
 * 🗑️ FUNZIONE PRINCIPALE: Elimina account utente
 */
export const deleteUserAccount = async (userId, onProgress) => {
  try {
    onProgress?.('Caricamento dati...');
    
    // 1. Carica profilo e viaggi
    const profile = await loadUserProfile(userId);
    const trips = await loadUserTrips(userId);
    
    console.log(`🗑️ Inizio eliminazione account: ${userId}`);
    console.log(`📊 Dati trovati: ${trips.length} viaggi`);

    // 2. Esci da tutti i viaggi (usa logica esistente con snapshot)
    onProgress?.(`Rimozione da ${trips.length} viaggi...`);
    for (const trip of trips) {
      try {
        await leaveTrip(trip.id, userId);
        console.log(`✅ Uscito da trip: ${trip.metadata?.name || trip.id}`);
      } catch (error) {
        console.error(`❌ Errore uscita trip ${trip.id}:`, error);
        // Continua comunque con altri trip
      }
    }

    // 3. Elimina avatar Storage
    if (profile.avatarPath) {
      onProgress?.('Eliminazione avatar...');
      try {
        await deleteImageFromStorage(profile.avatarPath);
        console.log('✅ Avatar eliminato');
      } catch (error) {
        console.warn('⚠️ Errore eliminazione avatar:', error);
        // Non bloccare per questo
      }
    }

    // 4. Elimina notifiche
    onProgress?.('Eliminazione notifiche...');
    await deleteUserNotifications(userId);

    // 5. Elimina inviti
    onProgress?.('Eliminazione inviti...');
    await deleteUserInvites(userId);

    // 6. Elimina profilo Firestore
    onProgress?.('Eliminazione profilo...');
    await deleteUserProfile(userId);

    // 7. Elimina account Auth (ultimo step)
    onProgress?.('Eliminazione account...');
    await deleteUser(auth.currentUser);
    
    console.log('✅ Account eliminato completamente');
    
    // Redirect a login
    window.location.href = '/';
    
  } catch (error) {
    console.error('❌ Errore eliminazione account:', error);
    throw error;
  }
};