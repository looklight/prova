import { db } from '../firebase';
import { 
  collectionGroup,
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  query,
  where,
  limit
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
 * ✅ Valida formato username
 * @param {string} username - Username da validare
 * @returns {boolean} true se valido
 */
export const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  
  const clean = username.trim().toLowerCase();
  
  // Lunghezza 3-20 caratteri
  if (clean.length < 3 || clean.length > 20) return false;
  
  // Solo a-z, 0-9, underscore
  const validPattern = /^[a-z0-9_]+$/;
  if (!validPattern.test(clean)) return false;
  
  // Non può iniziare/finire con underscore
  if (clean.startsWith('_') || clean.endsWith('_')) return false;
  
  // Non può avere __ consecutivi
  if (clean.includes('__')) return false;
  
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
        updatedAt: new Date()
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