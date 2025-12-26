// ============================================
// ALTROVE - Profile Service
// Gestione profili utente e username
// ============================================

import { db } from '../firebase';
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
  collection,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// Types
export interface UserProfile {
  displayName: string;
  username: string | null;
  email: string;
  avatar: string | null;
  avatarPath?: string;
  bio: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  archivedTripIds?: string[];
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  username: string | null;
  avatar: string | null;
  email?: string | null;
  bio?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface SearchedUser {
  uid: string;
  username: string;
  displayName: string;
  avatar: string | null;
  email: string | null;
}

export interface ProfileUpdates {
  displayName?: string;
  username?: string;
  avatar?: string | null;
  avatarPath?: string;
  bio?: string;
}

// ============= GESTIONE USERNAME UNIVOCI =============

/**
 * Controlla se un username è già usato da qualcun altro
 */
export const checkUsernameExists = async (
  username: string,
  currentUserId: string | null = null
): Promise<boolean> => {
  try {
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      return true; // Considera non valido
    }

    const profilesQuery = query(
      collectionGroup(db, 'profile'),
      where('username', '==', cleanUsername),
      limit(1)
    );

    const snapshot = await getDocs(profilesQuery);

    if (!snapshot.empty) {
      const foundDoc = snapshot.docs[0];
      const userId = foundDoc.ref.parent.parent?.id;

      if (currentUserId && userId === currentUserId) {
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Errore check username:', error);
    throw error;
  }
};

/**
 * Genera username univoco per nuovo utente
 */
export const generateUniqueUsername = async (email: string): Promise<string> => {
  const emailPart = email.split('@')[0];
  const cleanEmail = emailPart.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  for (let attempt = 0; attempt < 10; attempt++) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${cleanEmail}_${random}`;

    const exists = await checkUsernameExists(candidate);
    if (!exists) {
      return candidate;
    }
  }

  const timestamp = Date.now().toString().slice(-4);
  return `${cleanEmail}_${timestamp}`;
};

/**
 * Valida formato username (stile Instagram)
 */
export const isValidUsername = (username: string): boolean => {
  if (!username || typeof username !== 'string') return false;

  const clean = username.trim().toLowerCase();

  if (clean.length < 3 || clean.length > 30) return false;

  const validPattern = /^[a-z0-9_.]+$/;
  if (!validPattern.test(clean)) return false;

  return true;
};

// ============= FUNZIONI PER IL PROFILO =============

/**
 * Genera display name di default dall'email
 */
export const generateDefaultProfile = (email: string): { displayName: string } => {
  const emailPart = email.split('@')[0];

  const displayName = emailPart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return { displayName };
};

/**
 * Crea o carica il profilo utente
 */
export const loadUserProfile = async (
  userId: string,
  userEmail: string
): Promise<UserProfile> => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    const snapshot = await getDoc(profileRef);

    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    } else {
      const defaults = generateDefaultProfile(userEmail);
      const uniqueUsername = await generateUniqueUsername(userEmail);

      const newProfile: UserProfile = {
        displayName: defaults.displayName,
        username: uniqueUsername,
        email: userEmail,
        avatar: null,
        bio: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedTripIds: []
      };

      await setDoc(profileRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    console.error('Errore caricamento profilo:', error);
    throw error;
  }
};

/**
 * Aggiorna il profilo utente
 */
export const updateUserProfile = async (
  userId: string,
  updates: ProfileUpdates
): Promise<void> => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');

    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    await setDoc(profileRef, updateData, { merge: true });
  } catch (error) {
    console.error('Errore aggiornamento profilo:', error);
    throw error;
  }
};

// ============= FUNZIONE PER RICERCA USERNAME =============

/**
 * Cerca utenti per username (ricerca parziale)
 */
export const searchUsersByUsername = async (
  searchTerm: string,
  limitCount: number = 10
): Promise<SearchedUser[]> => {
  try {
    const cleanSearch = searchTerm.trim().toLowerCase();

    if (!cleanSearch || cleanSearch.length < 2) {
      return [];
    }

    const profilesRef = collectionGroup(db, 'profile');

    const q = query(
      profilesRef,
      where('username', '>=', cleanSearch),
      where('username', '<', cleanSearch + '\uf8ff'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const users: SearchedUser[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const userId = docSnap.ref.parent.parent?.id;

      if (userId) {
        users.push({
          uid: userId,
          username: data.username,
          displayName: data.displayName || 'Utente',
          avatar: data.avatar || null,
          email: data.email || null
        });
      }
    });

    return users;
  } catch (error) {
    console.error('Errore ricerca username:', error);
    throw error;
  }
};

// ============= FUNZIONE PER PROFILO PUBBLICO =============

/**
 * Carica il profilo pubblico di un utente
 */
export const loadPublicProfile = async (userId: string): Promise<PublicProfile> => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return {
        uid: userId,
        displayName: 'Utente',
        username: null,
        avatar: null,
        createdAt: null,
        bio: null
      };
    }

    const data = profileSnap.data();

    return {
      uid: userId,
      displayName: data.displayName || 'Utente',
      username: data.username || null,
      avatar: data.avatar || null,
      email: data.email || null,
      bio: data.bio || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };
  } catch (error) {
    console.error('Errore caricamento profilo pubblico:', error);
    return {
      uid: userId,
      displayName: 'Utente',
      username: null,
      avatar: null
    };
  }
};

/**
 * Aggiorna profilo utente in TUTTI i viaggi dove è membro
 */
export const updateUserProfileInTrips = async (
  userId: string,
  updates: ProfileUpdates
): Promise<void> => {
  try {
    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);

    snapshot.forEach(docSnap => {
      const tripRef = doc(db, 'trips', docSnap.id);
      batch.update(tripRef, {
        [`sharing.members.${userId}.displayName`]: updates.displayName,
        [`sharing.members.${userId}.username`]: updates.username || null,
        [`sharing.members.${userId}.avatar`]: updates.avatar || null,
        'updatedAt': new Date()
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Errore aggiornamento profilo nei viaggi:', error);
    throw error;
  }
};

// ============= FUNZIONI ARCHIVIAZIONE VIAGGI =============

/**
 * Archivia un viaggio per l'utente
 */
export const archiveTrip = async (
  userId: string,
  tripId: string | number
): Promise<void> => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');

    await setDoc(profileRef, {
      archivedTripIds: arrayUnion(String(tripId)),
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Errore archiviazione viaggio:', error);
    throw error;
  }
};

/**
 * Disarchivia un viaggio per l'utente
 */
export const unarchiveTrip = async (
  userId: string,
  tripId: string | number
): Promise<void> => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');

    await setDoc(profileRef, {
      archivedTripIds: arrayRemove(String(tripId)),
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Errore disarchiviazione viaggio:', error);
    throw error;
  }
};
