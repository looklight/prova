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

// ============= GESTIONE USERNAME UNIVOCI =============

/**
 * 🔍 Controlla se un username è già usato da qualcun altro
 * Usa collectionGroup per query veloce su tutti i profili
 * @param {string} username - Username da verificare
 * @param {string} currentUserId - ID utente corrente (per escluderlo dal check)
 * @returns {Promise<boolean>} true se già usato, false se disponibile
 */
export const checkUsernameExists = async (username, currentUserId = null) => {
  try {
    const cleanUsername = username.trim().toLowerCase();
    
    if (!cleanUsername || cleanUsername.length < 3) {
      return true; // Considera non valido
    }

    // Query su TUTTI i profili (in tutte le sottocollezioni 'profile')
    const profilesQuery = query(
      collectionGroup(db, 'profile'),
      where('username', '==', cleanUsername),
      limit(1)  // Basta trovarne uno
    );
    
    const snapshot = await getDocs(profilesQuery);
    
    // Se trova risultati, controlla che non sia l'utente corrente
    if (!snapshot.empty) {
      const foundDoc = snapshot.docs[0];
      const userId = foundDoc.ref.parent.parent.id;  // Risale al parent userId
      
      // Se è l'utente corrente, username è "disponibile" (è il suo)
      if (currentUserId && userId === currentUserId) {
        return false;
      }
      
      return true; // Username già usato da qualcun altro
    }
    
    return false; // Disponibile
  } catch (error) {
    console.error('❌ Errore check username:', error);
    throw error;
  }
};

/**
 * 🎲 Genera username univoco per nuovo utente
 * Prova fino a trovare uno libero
 * @param {string} email - Email dell'utente
 * @returns {Promise<string>} Username univoco generato
 */
export const generateUniqueUsername = async (email) => {
  const emailPart = email.split('@')[0];
  const cleanEmail = emailPart.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  // Prova fino a 10 volte a trovare username libero
  for (let attempt = 0; attempt < 10; attempt++) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${cleanEmail}_${random}`;
    
    const exists = await checkUsernameExists(candidate);
    if (!exists) {
      console.log(`✅ Username univoco generato: ${candidate}`);
      return candidate;
    }
  }
  
  // Fallback: aggiungi timestamp
  const timestamp = Date.now().toString().slice(-4);
  return `${cleanEmail}_${timestamp}`;
};

/**
 * ✅ Valida formato username (stile Instagram)
 * Permette: lettere, numeri, underscore e punto
 * Lunghezza: 3-30 caratteri
 * @param {string} username - Username da validare
 * @returns {boolean} true se valido
 */
export const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  
  const clean = username.trim().toLowerCase();
  
  // Lunghezza 3-30 caratteri (come Instagram)
  if (clean.length < 3 || clean.length > 30) return false;
  
  // Solo a-z, 0-9, underscore e punto (come Instagram)
  const validPattern = /^[a-z0-9_.]+$/;
  if (!validPattern.test(clean)) return false;
  
  return true;
};

// ============= FUNZIONI PER IL PROFILO =============

/**
 * Genera display name di default dall'email
 */
export const generateDefaultProfile = (email) => {
  const emailPart = email.split('@')[0];
  
  // Display Name: email pulita con maiuscole
  const displayName = emailPart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  
  return { displayName };
};

/**
 * Crea o carica il profilo utente
 * ⭐ MODIFICATA: Genera username univoco per nuovi utenti
 */
export const loadUserProfile = async (userId, userEmail) => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    const snapshot = await getDoc(profileRef);
    
    if (snapshot.exists()) {
      console.log('✅ Profilo esistente caricato');
      return snapshot.data();
    } else {
      // Profilo non esiste, creane uno nuovo
      const defaults = generateDefaultProfile(userEmail);
      
      // ⭐ Genera username univoco
      const uniqueUsername = await generateUniqueUsername(userEmail);
      
      const newProfile = {
        displayName: defaults.displayName,
        username: uniqueUsername,
        email: userEmail,
        avatar: null,
        bio: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedTripIds: [] // 📦 Array per viaggi archiviati
      };
      
      await setDoc(profileRef, newProfile);
      console.log('✅ Nuovo profilo creato con username:', uniqueUsername);
      return newProfile;
    }
  } catch (error) {
    console.error('❌ Errore caricamento profilo:', error);
    throw error;
  }
};

/**
 * ⭐ MODIFICATA: Aggiorna il profilo utente
 * Ora usa setDoc con merge:true invece di updateDoc
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    await setDoc(profileRef, updateData, { merge: true });
    console.log('✅ Profilo aggiornato');
  } catch (error) {
    console.error('❌ Errore aggiornamento profilo:', error);
    throw error;
  }
};

// ============= FUNZIONE PER RICERCA USERNAME (Step 2) =============

/**
 * 🔍 Cerca utenti per username (ricerca parziale)
 */
export const searchUsersByUsername = async (searchTerm, limitCount = 10) => {
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
    const users = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const userId = docSnap.ref.parent.parent.id;
      
      users.push({
        uid: userId,
        username: data.username,
        displayName: data.displayName || 'Utente',
        avatar: data.avatar || null,
        email: data.email || null
      });
    });
    
    console.log(`🔍 Trovati ${users.length} utenti per "${searchTerm}"`);
    return users;
  } catch (error) {
    console.error('❌ Errore ricerca username:', error);
    throw error;
  }
};

// ============= FUNZIONE PER PROFILO PUBBLICO =============

/**
 * 🔍 Carica il profilo pubblico di un utente
 * Restituisce gli stessi dati visibili in ProfileView
 * @param {string} userId - ID dell'utente da caricare
 * @returns {Promise<Object|null>} Dati profilo pubblico o null
 */
export const loadPublicProfile = async (userId) => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      console.warn(`⚠️ Profilo pubblico non trovato per userId: ${userId}`);
      // Restituisci dati base minimi
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
    
    console.log(`✅ Profilo pubblico caricato: ${data.username}`);
    
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
    console.error('❌ Errore caricamento profilo pubblico:', error);
    return null;
  }
};

/**
 * 🔄 Aggiorna profilo utente in TUTTI i viaggi dove è membro
 */
export const updateUserProfileInTrips = async (userId, updates) => {
  try {
    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ Nessun viaggio da aggiornare');
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
    console.log(`✅ Profilo aggiornato in ${snapshot.size} viaggi`);
  } catch (error) {
    console.error('❌ Errore aggiornamento profilo nei viaggi:', error);
    throw error;
  }
};

// ============= 📦 FUNZIONI ARCHIVIAZIONE VIAGGI =============

/**
 * 📦 Archivia un viaggio per l'utente
 * Aggiunge l'ID del viaggio all'array archivedTripIds nel profilo
 * @param {string} userId - ID utente
 * @param {string|number} tripId - ID del viaggio da archiviare
 */
export const archiveTrip = async (userId, tripId) => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    
    await setDoc(profileRef, {
      archivedTripIds: arrayUnion(String(tripId)),
      updatedAt: new Date()
    }, { merge: true });
    
    console.log(`📦 Viaggio ${tripId} archiviato per utente ${userId}`);
  } catch (error) {
    console.error('❌ Errore archiviazione viaggio:', error);
    throw error;
  }
};

/**
 * ↩️ Disarchivia un viaggio per l'utente
 * Rimuove l'ID del viaggio dall'array archivedTripIds nel profilo
 * @param {string} userId - ID utente
 * @param {string|number} tripId - ID del viaggio da disarchiviare
 */
export const unarchiveTrip = async (userId, tripId) => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    
    await setDoc(profileRef, {
      archivedTripIds: arrayRemove(String(tripId)),
      updatedAt: new Date()
    }, { merge: true });
    
    console.log(`↩️ Viaggio ${tripId} disarchiviato per utente ${userId}`);
  } catch (error) {
    console.error('❌ Errore disarchiviazione viaggio:', error);
    throw error;
  }
};