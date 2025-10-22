import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy 
} from 'firebase/firestore';

// ============= FUNZIONI PER I VIAGGI =============

/**
 * Carica tutti i viaggi di un utente
 */
export const loadUserTrips = async (userId) => {
  try {
    const tripsRef = collection(db, 'users', userId, 'trips');
    const q = query(tripsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const trips = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      trips.push({
        id: doc.id,
        ...data,
        // Converti Timestamp Firebase in Date JavaScript
        startDate: data.startDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        days: data.days.map(day => ({
          ...day,
          date: day.date?.toDate() || new Date()
        }))
      });
    });
    
    console.log('✅ Viaggi caricati:', trips.length);
    return trips;
  } catch (error) {
    console.error('❌ Errore caricamento viaggi:', error);
    throw error;
  }
};

/**
 * Salva un nuovo viaggio
 */
export const saveTrip = async (userId, trip) => {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', trip.id.toString());
    
    const tripData = {
      ...trip,
      // Converti Date in Timestamp Firebase
      startDate: trip.startDate,
      createdAt: trip.createdAt || new Date(),
      updatedAt: new Date(),
      days: trip.days.map(day => ({
        ...day,
        date: day.date
      }))
    };
    
    await setDoc(tripRef, tripData);
    console.log('✅ Viaggio salvato:', trip.id);
    return trip;
  } catch (error) {
    console.error('❌ Errore salvataggio viaggio:', error);
    throw error;
  }
};

/**
 * Aggiorna un viaggio esistente
 */
export const updateTrip = async (userId, tripId, updates) => {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', tripId.toString());
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    // Se ci sono days, converti le date
    if (updates.days) {
      updateData.days = updates.days.map(day => ({
        ...day,
        date: day.date
      }));
    }
    
    await updateDoc(tripRef, updateData);
    console.log('✅ Viaggio aggiornato:', tripId);
  } catch (error) {
    console.error('❌ Errore aggiornamento viaggio:', error);
    throw error;
  }
};

/**
 * Elimina un viaggio
 */
export const deleteTrip = async (userId, tripId) => {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', tripId.toString());
    await deleteDoc(tripRef);
    console.log('✅ Viaggio eliminato:', tripId);
  } catch (error) {
    console.error('❌ Errore eliminazione viaggio:', error);
    throw error;
  }
};

/**
 * Carica un singolo viaggio
 */
export const loadTrip = async (userId, tripId) => {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', tripId.toString());
    const snapshot = await getDoc(tripRef);
    
    if (!snapshot.exists()) {
      throw new Error('Viaggio non trovato');
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      days: data.days.map(day => ({
        ...day,
        date: day.date?.toDate() || new Date()
      }))
    };
  } catch (error) {
    console.error('❌ Errore caricamento viaggio:', error);
    throw error;
  }
};

// ============= FUNZIONI PER IL PROFILO =============

/**
 * Genera display name e username di default dall'email
 */
export const generateDefaultProfile = (email) => {
  const emailPart = email.split('@')[0];
  
  // Display Name: email pulita con maiuscole
  const displayName = emailPart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  
  // Username: email + numero random (4 cifre)
  const cleanEmail = emailPart.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  const username = `${cleanEmail}_${random}`;
  
  return { displayName, username };
};

/**
 * Crea o carica il profilo utente
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
      const newProfile = {
        displayName: defaults.displayName,
        username: defaults.username,
        email: userEmail,
        avatar: null,
        bio: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(profileRef, newProfile);
      console.log('✅ Nuovo profilo creato');
      return newProfile;
    }
  } catch (error) {
    console.error('❌ Errore caricamento profilo:', error);
    throw error;
  }
};

/**
 * Aggiorna il profilo utente
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'info');
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    await updateDoc(profileRef, updateData);
    console.log('✅ Profilo aggiornato');
  } catch (error) {
    console.error('❌ Errore aggiornamento profilo:', error);
    throw error;
  }
};

// ============= UTILITY: RIDIMENSIONAMENTO IMMAGINI =============

/**
 * Ridimensiona un'immagine mantenendo le proporzioni
 * @param {File} file - File immagine caricato
 * @param {number} maxWidth - Larghezza massima (default: 400px)
 * @param {number} maxHeight - Altezza massima (default: 400px)
 * @param {number} quality - Qualità JPEG (0-1, default: 0.8)
 * @returns {Promise<string>} - Data URL immagine ridimensionata
 */
export const resizeImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcola nuove dimensioni mantenendo proporzioni
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Crea canvas per ridimensionare
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converti in data URL (JPEG compresso)
        const resizedDataURL = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedDataURL);
      };
      
      img.onerror = () => reject(new Error('Errore nel caricamento dell\'immagine'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsDataURL(file);
  });
};