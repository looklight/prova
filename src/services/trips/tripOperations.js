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
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { canEdit } from './permissions';
import { calculateUserSnapshot, removeUserFromBreakdowns } from '../../utils/costsUtils';
import { cleanupTripImages, cleanupTripCover } from '../../utils/storageCleanup';

// ============= HELPER PER CONVERSIONE DATE =============

/**
 * Converte in modo sicuro un Timestamp Firebase in Date
 */
const safeConvertToDate = (timestamp) => {
  if (!timestamp) return new Date();
  
  if (timestamp instanceof Date) return timestamp;
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (error) {
      console.error('❌ Errore conversione Timestamp:', error);
      return new Date();
    }
  }
  
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) return date;
  }
  
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }
  
  console.warn('⚠️ Formato timestamp non riconosciuto:', timestamp);
  return new Date();
};

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
              startDate: safeConvertToDate(data.startDate),
              createdAt: safeConvertToDate(data.createdAt),
              updatedAt: safeConvertToDate(data.updatedAt),
              days: data.days.map(day => ({
                ...day,
                date: safeConvertToDate(day.date)
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
      history: { removedMembers: [] },
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
    const hasPermission = await canEdit(tripId, userId);
    if (!hasPermission) {
      throw new Error('Non hai i permessi per modificare questo viaggio');
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
 * ⭐ Abbandona un viaggio (logica completa con transaction + cleanup + snapshot)
 */
export const leaveTrip = async (tripId, userId) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());

    return await runTransaction(db, async (transaction) => {
      const tripDoc = await transaction.get(tripRef);

      if (!tripDoc.exists()) {
        throw new Error('Viaggio non trovato');
      }

      const trip = {
        id: tripDoc.id,
        ...tripDoc.data(),
        // Converti date per cleanup immagini
        days: tripDoc.data().days.map(day => ({
          ...day,
          date: safeConvertToDate(day.date)
        }))
      };

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

        // Cleanup immagini (fuori dalla transaction)
        try {
          console.log('🧹 Cleanup immagini dei giorni...');
          const result = await cleanupTripImages(trip);
          console.log(`✅ ${result.deletedCount} immagini eliminate`);

          if (trip.metadata?.imagePath || trip.metadata?.image) {
            console.log('🧹 Cleanup cover viaggio...');
            const coverReference = trip.metadata.imagePath || trip.metadata.image;
            await cleanupTripCover(coverReference);
          }
        } catch (cleanupError) {
          console.error('⚠️ Errore cleanup immagini:', cleanupError);
        }

        // Elimina inviti link
        const invitesRef = collection(db, 'invites');
        const invitesQuery = query(invitesRef, where('tripId', '==', String(tripId)));
        const invitesSnap = await getDocs(invitesQuery);

        if (!invitesSnap.empty) {
          const batch = writeBatch(db);
          invitesSnap.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`🗑️ Eliminati ${invitesSnap.size} inviti link`);
        }

        transaction.delete(tripRef);
        console.log('✅ Viaggio eliminato definitivamente');
        return { action: 'deleted' };
      }

      // ⭐ CASO 2: Owner che abbandona
      if (members[userId].role === 'owner') {
        const otherMembers = activeMembers.filter(
          ([id, member]) => id !== userId && member.role === 'member'
        );

        if (otherMembers.length > 0) {
          // Promuovi primo member a owner
          const [newOwnerId] = otherMembers[0];
          console.log(`👑 Promozione ${newOwnerId} a owner`);

          // 📸 Calcola snapshot spese (con dettaglio completo)
          console.log('📸 Calcolo snapshot spese...');
          const expenseSnapshot = calculateUserSnapshot(trip, userId);
          
          console.log('🔍 DEBUG - Snapshot calcolato:', {
            total: expenseSnapshot.total,
            categoriesCount: Object.keys(expenseSnapshot.byCategory).length,
            categories: Object.keys(expenseSnapshot.byCategory)
          });

          // 🧹 Pulisci breakdown (con clonazione profonda)
          console.log('🧹 Pulizia breakdown...');
          const cleanedData = removeUserFromBreakdowns(
            JSON.parse(JSON.stringify(trip.data)),
            userId
          );

          // ✅ Verifica che la pulizia sia avvenuta
          let remainingReferences = 0;
          Object.keys(cleanedData).forEach(key => {
            const cellData = cleanedData[key];
            
            if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
              if (cellData.costBreakdown.some(entry => entry.userId === userId)) {
                console.warn(`⚠️ Riferimento residuo trovato in ${key}`);
                remainingReferences++;
              }
            }
            
            if (key.endsWith('-otherExpenses') && Array.isArray(cellData)) {
              cellData.forEach((expense, idx) => {
                if (expense?.costBreakdown && Array.isArray(expense.costBreakdown)) {
                  if (expense.costBreakdown.some(entry => entry.userId === userId)) {
                    console.warn(`⚠️ Riferimento residuo trovato in ${key}[${idx}]`);
                    remainingReferences++;
                  }
                }
              });
            }
          });

          if (remainingReferences > 0) {
            console.error(`❌ ATTENZIONE: ${remainingReferences} riferimenti non rimossi!`);
          } else {
            console.log('✅ Tutti i riferimenti rimossi correttamente');
          }

          const memberInfo = members[userId];
          
          // ⭐ SALVA SNAPSHOT COMPLETO (con dettaglio items per categoria)
          const snapshotEntry = {
            userId,
            displayName: memberInfo.displayName,
            username: memberInfo.username || null,
            avatar: memberInfo.avatar || null,
            removedAt: new Date(),
            totalPaid: expenseSnapshot.total,  // ← Usa .total da calculateUserSnapshot
            byCategory: expenseSnapshot.byCategory  // ← Struttura completa con items
          };

          console.log('💾 Salvataggio snapshot:', {
            userId,
            totalPaid: snapshotEntry.totalPaid,
            categories: Object.keys(snapshotEntry.byCategory)
          });

          const updatedSharing = {
            ...trip.sharing,
            members: {
              ...trip.sharing.members,
              [newOwnerId]: {
                ...trip.sharing.members[newOwnerId],
                role: 'owner'
              },
              [userId]: {
                ...trip.sharing.members[userId],
                status: 'left'
              }
            },
            memberIds: trip.sharing.memberIds.filter(id => id !== userId)
          };

          const updatedHistory = {
            removedMembers: [
              ...(trip.history?.removedMembers || []),
              snapshotEntry
            ]
          };

          transaction.update(tripRef, {
            sharing: updatedSharing,
            data: cleanedData,
            history: updatedHistory,
            updatedAt: new Date()
          });

          console.log('✅ Member promosso a owner + Snapshot salvato');
          return { action: 'left', newOwner: newOwnerId };
        } else {
          // Nessun altro membro, elimina viaggio
          console.log('🗑️ Nessun altro membro, eliminazione viaggio...');

          try {
            await cleanupTripImages(trip);
            
            if (trip.metadata?.imagePath || trip.metadata?.image) {
              const coverReference = trip.metadata.imagePath || trip.metadata.image;
              await cleanupTripCover(coverReference);
            }
          } catch (cleanupError) {
            console.error('⚠️ Errore cleanup immagini:', cleanupError);
          }

          const invitesRef = collection(db, 'invites');
          const invitesQuery = query(invitesRef, where('tripId', '==', String(tripId)));
          const invitesSnap = await getDocs(invitesQuery);

          if (!invitesSnap.empty) {
            const batch = writeBatch(db);
            invitesSnap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }

          transaction.delete(tripRef);
          console.log('✅ Viaggio eliminato definitivamente');
          return { action: 'deleted' };
        }
      }

      // ⭐ CASO 3: Member normale che abbandona
      console.log('📸 Calcolo snapshot spese...');
      const expenseSnapshot = calculateUserSnapshot(trip, userId);
      
      console.log('🔍 DEBUG - Snapshot calcolato:', {
        total: expenseSnapshot.total,
        categoriesCount: Object.keys(expenseSnapshot.byCategory).length,
        categories: Object.keys(expenseSnapshot.byCategory)
      });

      console.log('🧹 Pulizia breakdown...');
      const cleanedData = removeUserFromBreakdowns(
        JSON.parse(JSON.stringify(trip.data)),
        userId
      );

      // ✅ Verifica pulizia
      let remainingReferences = 0;
      Object.keys(cleanedData).forEach(key => {
        const cellData = cleanedData[key];
        
        if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
          if (cellData.costBreakdown.some(entry => entry.userId === userId)) {
            console.warn(`⚠️ Riferimento residuo trovato in ${key}`);
            remainingReferences++;
          }
        }
        
        if (key.endsWith('-otherExpenses') && Array.isArray(cellData)) {
          cellData.forEach((expense, idx) => {
            if (expense?.costBreakdown && Array.isArray(expense.costBreakdown)) {
              if (expense.costBreakdown.some(entry => entry.userId === userId)) {
                console.warn(`⚠️ Riferimento residuo trovato in ${key}[${idx}]`);
                remainingReferences++;
              }
            }
          });
        }
      });

      if (remainingReferences > 0) {
        console.error(`❌ ATTENZIONE: ${remainingReferences} riferimenti non rimossi!`);
      } else {
        console.log('✅ Tutti i riferimenti rimossi correttamente');
      }

      const memberInfo = members[userId];
      
      // ⭐ SALVA SNAPSHOT COMPLETO
      const snapshotEntry = {
        userId,
        displayName: memberInfo.displayName,
        username: memberInfo.username || null,
        avatar: memberInfo.avatar || null,
        removedAt: new Date(),
        totalPaid: expenseSnapshot.total,  // ← Usa .total
        byCategory: expenseSnapshot.byCategory  // ← Struttura completa
      };

      console.log('💾 Salvataggio snapshot:', {
        userId,
        totalPaid: snapshotEntry.totalPaid,
        categories: Object.keys(snapshotEntry.byCategory)
      });

      const updatedSharing = {
        ...trip.sharing,
        members: {
          ...trip.sharing.members,
          [userId]: {
            ...trip.sharing.members[userId],
            status: 'left'
          }
        },
        memberIds: trip.sharing.memberIds.filter(id => id !== userId)
      };

      const updatedHistory = {
        removedMembers: [
          ...(trip.history?.removedMembers || []),
          snapshotEntry
        ]
      };

      transaction.update(tripRef, {
        sharing: updatedSharing,
        data: cleanedData,
        history: updatedHistory,
        updatedAt: new Date()
      });

      console.log('✅ Hai abbandonato il viaggio + Snapshot salvato');
      return { action: 'left' };
    });
  } catch (error) {
    console.error('❌ Errore abbandono viaggio:', error);
    throw error;
  }
};

/**
 * ⭐ Elimina viaggio per un utente (usa leaveTrip)
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
      startDate: safeConvertToDate(data.startDate),
      createdAt: safeConvertToDate(data.createdAt),
      updatedAt: safeConvertToDate(data.updatedAt),
      days: data.days.map(day => ({
        ...day,
        date: safeConvertToDate(day.date)
      }))
    };
  } catch (error) {
    console.error('❌ Errore caricamento viaggio:', error);
    throw error;
  }
};

/**
 * Carica tutti i viaggi di un utente (snapshot singolo, non real-time)
 */
export const loadUserTrips = async (userId) => {
  try {
    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const trips = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const member = data.sharing?.members?.[userId];
      if (member && member.status === 'active') {
        trips.push({
          id: docSnap.id,
          ...data,
          startDate: safeConvertToDate(data.startDate),
          createdAt: safeConvertToDate(data.createdAt),
          updatedAt: safeConvertToDate(data.updatedAt),
          days: data.days.map(day => ({
            ...day,
            date: safeConvertToDate(day.date)
          }))
        });
      }
    });

    console.log('✅ Viaggi caricati:', trips.length);
    return trips;
  } catch (error) {
    console.error('❌ Errore caricamento viaggi:', error);
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