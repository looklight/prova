import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

// ============= FUNZIONI PER I VIAGGI =============

/**
 * Carica tutti i viaggi di un utente (snapshot singolo)
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
 * ⭐ NUOVA: Sottoscrivi ai viaggi in tempo reale
 * Restituisce una funzione per cancellare la sottoscrizione
 */
export const subscribeToUserTrips = (userId, onTripsUpdate, onError) => {
  try {
    const tripsRef = collection(db, 'users', userId, 'trips');
    const q = query(tripsRef, orderBy('createdAt', 'desc'));
    
    // Listener real-time
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
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
        
        console.log('🔄 Viaggi aggiornati in tempo reale:', trips.length);
        onTripsUpdate(trips);
      },
      (error) => {
        console.error('❌ Errore listener viaggi:', error);
        if (onError) onError(error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Errore sottoscrizione viaggi:', error);
    throw error;
  }
};

/**
 * Salva un nuovo viaggio
 */
export const saveTrip = async (userId, trip) => {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', trip.id.toString());
    
    // 🆕 Prepara metadata (supporta sia formato vecchio che nuovo)
    const metadata = trip.metadata || {
      name: trip.name || 'Nuovo Viaggio',
      image: trip.image || null,
      destinations: [],
      description: ''
    };
    
    // 🆕 Prepara sharing info (per futuro multiutente)
    const sharing = trip.sharing || {
      owner: userId,
      members: {
        [userId]: {
          role: 'owner',
          addedAt: new Date(),
          addedBy: userId
        }
      },
      isPublic: false,
      shareLink: null
    };
    
    const tripData = {
      ...trip,
      // 🆕 Nuovi campi strutturati
      metadata,
      sharing,
      // Retrocompatibilità: mantieni anche i campi vecchi
      name: metadata.name,
      image: metadata.image,
      // Date
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
 * ⭐ MODIFICATA: Aggiorna un viaggio esistente
 * Strategia: prima verifica se esiste, poi usa updateDoc o setDoc di conseguenza
 */
export const updateTrip = async (userId, tripId, updates) => {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', tripId.toString());
    
    // Prepara i dati da salvare
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    // Se ci sono days, assicurati che siano formattati correttamente
    if (updates.days) {
      updateData.days = updates.days.map(day => ({
        ...day,
        date: day.date
      }));
    }
    
    // ⭐ Verifica se il documento esiste
    const docSnap = await getDoc(tripRef);
    
    if (docSnap.exists()) {
      // Documento esiste: usa updateDoc per fare merge corretto
      await updateDoc(tripRef, updateData);
    } else {
      // Documento non esiste: usa setDoc per crearlo
      await setDoc(tripRef, updateData);
    }
    
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
 * 🆕 NUOVA: Aggiorna solo i metadata di un viaggio
 * Usata dal modal di modifica info viaggio
 */
export const updateTripMetadata = async (userId, tripId, metadata) => {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', tripId.toString());
    
    await updateDoc(tripRef, {
      'metadata': metadata,
      // Retrocompatibilità: aggiorna anche i campi vecchi
      'name': metadata.name || 'Nuovo Viaggio',
      'image': metadata.image || null,
      'updatedAt': new Date()
    });
    
    console.log('✅ Metadata viaggio aggiornati:', tripId);
  } catch (error) {
    console.error('❌ Errore aggiornamento metadata:', error);
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