import { db } from '../../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import { getUserRole, canEdit } from './permissions';
import { calculateUserSnapshot, removeUserFromBreakdowns } from '../../utils/costsUtils';
import { cleanupTripImages, cleanupTripCover } from '../../utils/storageCleanup';

// ============= FUNZIONI PER I VIAGGI =============

/**
 * ⭐ Sottoscrivi ai viaggi dell'utente in tempo reale
 */
export const subscribeToUserTrips = (userId, onTripsUpdate, onError) => {
  try {
    const tripsRef = collection(db, 'trips');
    
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snapshot) => {
        const trips = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          const member = data.sharing?.members?.[userId];
          if (member && member.status === 'active') {
            trips.push({
              id: docSnap.id,
              ...data,
              startDate: data.startDate?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              days: data.days.map(day => ({
                ...day,
                date: day.date?.toDate() || new Date()
              }))
            });
          }
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
 * ⭐ Crea un nuovo viaggio
 */
export const createTrip = async (trip, userProfile) => {
  try {
    const tripRef = doc(db, 'trips', trip.id.toString());
    
    const metadata = trip.metadata || {
      name: trip.name || 'Nuovo Viaggio',
      image: trip.image || null,
      destinations: [],
      description: ''
    };
    
    const sharing = {
      memberIds: [userProfile.uid],
      members: {
        [userProfile.uid]: {
          role: 'owner',
          status: 'active',
          addedAt: new Date(),
          addedBy: userProfile.uid,
          displayName: userProfile.displayName || 'Utente',
          username: userProfile.username || null,
          avatar: userProfile.avatar || null
        }
      },
      invitations: {},
      shareLink: null
    };
    
    const tripData = {
      ...trip,
      metadata,
      sharing,
      costHistory: [],
      name: metadata.name,
      image: metadata.image,
      startDate: trip.startDate,
      createdAt: trip.createdAt || new Date(),
      updatedAt: new Date(),
      days: trip.days.map(day => ({
        ...day,
        date: day.date
      }))
    };
    
    await setDoc(tripRef, tripData);
    console.log('✅ Viaggio creato in /trips:', trip.id);
    return trip;
  } catch (error) {
    console.error('❌ Errore creazione viaggio:', error);
    throw error;
  }
};

/**
 * ⭐ Aggiorna un viaggio esistente
 */
export const updateTrip = async (userId, tripId, updates) => {
  try {
    const hasPermission = await canEdit(tripId, userId);
    if (!hasPermission) {
      throw new Error('Non hai i permessi per modificare questo viaggio');
    }
    
    const tripRef = doc(db, 'trips', tripId.toString());
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    if (updates.days) {
      updateData.days = updates.days.map(day => ({
        ...day,
        date: day.date
      }));
    }
    
    const docSnap = await getDoc(tripRef);
    
    if (docSnap.exists()) {
      await updateDoc(tripRef, updateData);
    } else {
      await setDoc(tripRef, updateData);
    }
    
    console.log('✅ Viaggio aggiornato:', tripId);
  } catch (error) {
    console.error('❌ Errore aggiornamento viaggio:', error);
    throw error;
  }
};

/**
 * ⭐ Aggiorna solo i metadata di un viaggio
 */
export const updateTripMetadata = async (userId, tripId, metadata) => {
  try {
    const role = await getUserRole(tripId, userId);
    if (role !== 'owner') {
      throw new Error('Solo il proprietario può modificare le informazioni del viaggio');
    }
    
    const tripRef = doc(db, 'trips', tripId.toString());
    
    await updateDoc(tripRef, {
      'metadata': metadata,
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
 * ⭐ Abbandona un viaggio (logica WhatsApp)
 */
export const leaveTrip = async (tripId, userId) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const trip = tripSnap.data();
    const members = trip.sharing.members;

    if (!members[userId] || members[userId].status !== 'active') {
      throw new Error('Non sei membro di questo viaggio');
    }

    const activeMembers = Object.entries(members).filter(
      ([id, member]) => member.status === 'active'
    );

    // ⭐ CASO 1: Ultimo membro → Elimina viaggio CON CLEANUP
    if (activeMembers.length === 1) {
      console.log('🗑️ Ultimo membro, eliminazione viaggio...');

      try {
        const tripForCleanup = {
          id: tripSnap.id,
          ...trip,
          days: trip.days.map(day => ({
            ...day,
            date: day.date?.toDate?.() || day.date
          }))
        };

        console.log('🧹 Cleanup immagini dei giorni...');
        const result = await cleanupTripImages(tripForCleanup);
        console.log(`✅ ${result.deletedCount} immagini eliminate`);

        // ⭐ SEMPLIFICATO: cleanupTripCover gestisce sia path che URL
        if (trip.metadata?.imagePath || trip.metadata?.image) {
          console.log('🧹 Cleanup cover viaggio...');
          const coverReference = trip.metadata.imagePath || trip.metadata.image;
          await cleanupTripCover(coverReference);
        }
        
      } catch (cleanupError) {
        console.error('⚠️ Errore cleanup immagini:', cleanupError);
      }

      await deleteDoc(tripRef);
      console.log('✅ Viaggio eliminato definitivamente');
      return { action: 'deleted' };
    }

    // [... resto del codice invariato fino a ...]

    // ⭐ CASO 2: Owner che abbandona
    if (members[userId].role === 'owner') {
      const otherMembers = activeMembers.filter(
        ([id, member]) => id !== userId && member.role === 'member'
      );

      if (otherMembers.length > 0) {
        // ... promozione owner (codice invariato)
      } else {
        console.log('🗑️ Nessun altro membro, eliminazione viaggio...');

        try {
          const tripForCleanup = {
            id: tripSnap.id,
            ...trip,
            days: trip.days.map(day => ({
              ...day,
              date: day.date?.toDate?.() || day.date
            }))
          };

          await cleanupTripImages(tripForCleanup);
          
          // ⭐ SEMPLIFICATO: cleanupTripCover gestisce sia path che URL
          if (trip.metadata?.imagePath || trip.metadata?.image) {
            const coverReference = trip.metadata.imagePath || trip.metadata.image;
            await cleanupTripCover(coverReference);
          }
          
        } catch (cleanupError) {
          console.error('⚠️ Errore cleanup immagini:', cleanupError);
        }

        await deleteDoc(tripRef);
        console.log('✅ Viaggio eliminato definitivamente');
        return { action: 'deleted' };
      }
    }

    // ... resto funzione invariato
  } catch (error) {
    console.error('❌ Errore abbandono viaggio:', error);
    throw error;
  }
};

/**
 * ⭐ Elimina viaggio per un utente
 */
export const deleteTripForUser = async (userId, tripId) => {
  return leaveTrip(tripId, userId);
};

/**
 * Carica un singolo viaggio
 */
export const loadTrip = async (userId, tripId) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());
    const snapshot = await getDoc(tripRef);
    
    if (!snapshot.exists()) {
      throw new Error('Viaggio non trovato');
    }
    
    const data = snapshot.data();
    
    const member = data.sharing?.members?.[userId];
    if (!member || member.status !== 'active') {
      throw new Error('Non hai accesso a questo viaggio');
    }
    
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

/**
 * Aggiorna profilo utente in tutti i viaggi condivisi
 */
export const updateUserProfileInTrips = async (userId, updates) => {
  try {
    const tripsRef = collection(db, 'trips');
    
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const member = data.sharing?.members?.[userId];
      
      if (member && member.status === 'active') {
        const tripRef = docSnap.ref;
        const updatePath = { updatedAt: new Date() };
        
        if (updates.displayName !== undefined) {
          updatePath[`sharing.members.${userId}.displayName`] = updates.displayName;
        }
        if (updates.username !== undefined) {
          updatePath[`sharing.members.${userId}.username`] = updates.username;
        }
        if (updates.avatar !== undefined) {
          updatePath[`sharing.members.${userId}.avatar`] = updates.avatar;
        }
        
        batch.update(tripRef, updatePath);
        updatedCount++;
      }
    });
    
    await batch.commit();
    
    console.log(`✅ Profilo aggiornato in ${updatedCount} viaggi`);
    return updatedCount;
  } catch (error) {
    console.error('❌ Errore aggiornamento profilo nei viaggi:', error);
    throw error;
  }
};