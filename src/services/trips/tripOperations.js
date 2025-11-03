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

// ============= FUNZIONI PER I VIAGGI =============

/**
 * ⭐ Sottoscrivi ai viaggi dell'utente in tempo reale
 * Query su /trips dove userId è in sharing.memberIds
 */
export const subscribeToUserTrips = (userId, onTripsUpdate, onError) => {
  try {
    const tripsRef = collection(db, 'trips');
    
    // ⭐ Query: viaggi dove l'utente è membro
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    // Listener real-time
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snapshot) => {
        const trips = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          // ⭐ Filtra solo membri con status 'active'
          const member = data.sharing?.members?.[userId];
          if (member && member.status === 'active') {
            trips.push({
              id: docSnap.id,
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
 * ⭐ Crea un nuovo viaggio nella collection globale /trips
 */
export const createTrip = async (trip, userProfile) => {
  try {
    const tripRef = doc(db, 'trips', trip.id.toString());
    
    // ⭐ Prepara metadata
    const metadata = trip.metadata || {
      name: trip.name || 'Nuovo Viaggio',
      image: trip.image || null,
      destinations: [],
      description: ''
    };
    
    // ⭐ Prepara sharing con owner come primo membro
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
      // Retrocompatibilità
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
    // ⭐ Verifica permessi
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
    
    // ⭐ CASO 1: Ultimo membro → Elimina viaggio
    if (activeMembers.length === 1) {
      console.log('🗑️ Ultimo membro, eliminazione viaggio...');
      await deleteDoc(tripRef);
      console.log('✅ Viaggio eliminato definitivamente');
      return { action: 'deleted' };
    }
    
    // ⭐ CASO 2: Owner che abbandona → Promuovi primo member a owner
    if (members[userId].role === 'owner') {
      const otherMembers = activeMembers.filter(
        ([id, member]) => id !== userId && member.role === 'member'
      );
      
      if (otherMembers.length > 0) {
        const [newOwnerId] = otherMembers[0];
        console.log(`👑 Promozione ${newOwnerId} a owner`);
        
        await updateDoc(tripRef, {
          [`sharing.members.${newOwnerId}.role`]: 'owner',
          [`sharing.members.${userId}.status`]: 'left',
          'sharing.memberIds': arrayRemove(userId),
          'updatedAt': new Date()
        });
        
        console.log('✅ Member promosso a owner, hai abbandonato il viaggio');
        return { action: 'left', newOwner: newOwnerId };
      } else {
        // Non ci sono altri member, elimina il viaggio
        console.log('🗑️ Nessun altro membro, eliminazione viaggio...');
        await deleteDoc(tripRef);
        console.log('✅ Viaggio eliminato definitivamente');
        return { action: 'deleted' };
      }
    }
    
    // ⭐ CASO 3: Member che abbandona
    await updateDoc(tripRef, {
      [`sharing.members.${userId}.status`]: 'left',
      'sharing.memberIds': arrayRemove(userId),
      'updatedAt': new Date()
    });
    
    console.log('✅ Hai abbandonato il viaggio');
    return { action: 'left' };
    
  } catch (error) {
    console.error('❌ Errore abbandono viaggio:', error);
    throw error;
  }
};

/**
 * ⭐ Elimina viaggio per un utente (wrapper di leaveTrip)
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

// 🆕 Aggiorna profilo utente in tutti i viaggi condivisi
export const updateUserProfileInTrips = async (userId, updates) => {
  try {
    const tripsRef = collection(db, 'trips');
    
    // ✅ Query corretta: cerca dove userId è nell'array memberIds
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
      
      // ✅ Aggiorna solo se membro è attivo
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