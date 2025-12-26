// ============================================
// ALTROVE - Account Deletion Service
// Gestione eliminazione account utente
// ============================================

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
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { deleteImageFromStorage } from './mediaService';
import { loadUserProfile } from './profileService';
import { loadUserTrips, leaveTrip } from './trips/tripOperations';

type ProgressCallback = (message: string) => void;

/**
 * Re-autenticazione utente (richiesta da Firebase per operazioni sensibili)
 */
export const reauthenticateUser = async (password?: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Utente non autenticato');

  try {
    const providerId = user.providerData[0]?.providerId;

    if (providerId === 'google.com') {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);
    } else if (providerId === 'password') {
      if (!password) throw new Error('Password richiesta');
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
    } else {
      throw new Error('Provider non supportato');
    }
  } catch (error: any) {
    console.error('Errore re-autenticazione:', error);
    if (error.code === 'auth/wrong-password') {
      throw new Error('Password errata');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Popup chiuso. Riprova.');
    }
    throw new Error('Errore autenticazione. Riprova.');
  }
};

/**
 * Elimina notifiche utente
 */
const deleteUserNotifications = async (userId: string): Promise<void> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    console.error('Errore eliminazione notifiche:', error);
    throw error;
  }
};

/**
 * Elimina inviti creati dall'utente
 */
const deleteUserInvites = async (userId: string): Promise<void> => {
  try {
    const invitesRef = collection(db, 'invites');
    const q = query(invitesRef, where('createdBy', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    console.error('Errore eliminazione inviti:', error);
    throw error;
  }
};

/**
 * Elimina profilo Firestore
 */
const deleteUserProfile = async (userId: string): Promise<void> => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    await deleteDoc(profileRef);
  } catch (error) {
    console.error('Errore eliminazione profilo:', error);
    throw error;
  }
};

/**
 * FUNZIONE PRINCIPALE: Elimina account utente
 */
export const deleteUserAccount = async (
  userId: string,
  onProgress?: ProgressCallback
): Promise<void> => {
  try {
    onProgress?.('Caricamento dati...');

    // 1. Carica profilo e viaggi
    const profile = await loadUserProfile(userId, '');
    const trips = await loadUserTrips(userId);

    // 2. Esci da tutti i viaggi
    onProgress?.(`Rimozione da ${trips.length} viaggi...`);
    for (const trip of trips) {
      try {
        await leaveTrip(trip.id, userId);
      } catch (error) {
        console.error(`Errore uscita trip ${trip.id}:`, error);
      }
    }

    // 3. Elimina avatar Storage
    if (profile.avatarPath) {
      onProgress?.('Eliminazione avatar...');
      try {
        await deleteImageFromStorage(profile.avatarPath);
      } catch (error) {
        console.warn('Errore eliminazione avatar:', error);
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
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }

    // Redirect a login
    window.location.href = '/';
  } catch (error) {
    console.error('Errore eliminazione account:', error);
    throw error;
  }
};
