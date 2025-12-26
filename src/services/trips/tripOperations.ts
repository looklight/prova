// ============================================
// ALTROVE - Trip Operations
// Operazioni CRUD viaggi
// ============================================

import { db } from '../../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  runTransaction,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { canEdit } from './permissions';
import { calculateUserSnapshot, removeUserFromBreakdowns } from '../../utils/costsUtils';
import { cleanupTripImages, cleanupTripCover } from '../../utils/storageCleanup';
import { deleteRemindersByTrip } from '../notifications/reminderService';
import { confirmMediaInData } from '../pendingMediaService';

// ============= TYPES =============

interface UserProfile {
  uid: string;
  displayName?: string;
  username?: string | null;
  avatar?: string | null;
}

interface TripMember {
  role: 'owner' | 'member';
  status: 'active' | 'left' | 'removed';
  addedAt: Date;
  addedBy: string;
  displayName?: string;
  username?: string | null;
  avatar?: string | null;
}

interface TripSharing {
  memberIds: string[];
  members: Record<string, TripMember>;
  invitations?: Record<string, unknown>;
  shareLink?: string | null;
}

interface TripMetadata {
  name?: string;
  image?: string | null;
  imagePath?: string;
  destinations?: string[];
  description?: string;
}

interface TripDay {
  date: Date | Timestamp | string | number;
  [key: string]: unknown;
}

interface Trip {
  id: string | number;
  name?: string;
  image?: string | null;
  metadata?: TripMetadata;
  sharing?: TripSharing;
  history?: {
    removedMembers?: ExpenseSnapshot[];
  };
  days: TripDay[];
  data?: Record<string, unknown>;
  startDate?: Date | Timestamp | string | number;
  createdAt?: Date | Timestamp | string | number;
  updatedAt?: Date | Timestamp | string | number;
}

interface ExpenseSnapshot {
  userId: string;
  displayName?: string;
  username?: string | null;
  avatar?: string | null;
  removedAt: Date;
  totalPaid: number;
  byCategory: Record<string, unknown>;
}

interface TripUpdates {
  days?: TripDay[];
  [key: string]: unknown;
}

interface ProfileUpdates {
  displayName?: string;
  username?: string | null;
  avatar?: string | null;
}

type TripCallback = (trips: Trip[]) => void;
type ErrorCallback = (error: Error) => void;

type LeaveResult =
  | { action: 'deleted' }
  | { action: 'left'; newOwner?: string };

// ============= HELPER PER CONVERSIONE DATE =============

/**
 * Converte in modo sicuro un Timestamp Firebase in Date
 */
const safeConvertToDate = (timestamp: unknown): Date => {
  if (!timestamp) return new Date();

  if (timestamp instanceof Date) return timestamp;

  if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
    const ts = timestamp as { toDate: () => Date };
    try {
      return ts.toDate();
    } catch (error) {
      console.error('❌ Errore conversione Timestamp:', error);
      return new Date();
    }
  }

  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) return date;
  }

  if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
    const ts = timestamp as { seconds: number };
    return new Date(ts.seconds * 1000);
  }

  console.warn('⚠️ Formato timestamp non riconosciuto:', timestamp);
  return new Date();
};

// ============= HELPER PER LEAVE TRIP =============

/**
 * Cleanup completo delle risorse di un viaggio (immagini, cover, inviti, reminder).
 * Da chiamare prima di eliminare un viaggio.
 */
const cleanupTripResources = async (trip: Trip, tripId: string | number): Promise<void> => {
  // Cleanup immagini dei giorni
  try {
    console.log('🧹 Cleanup immagini dei giorni...');
    const result = await cleanupTripImages(trip);
    console.log(`✅ ${result.deletedCount} immagini eliminate`);

    if (trip.metadata?.imagePath || trip.metadata?.image) {
      console.log('🧹 Cleanup cover viaggio...');
      const coverReference = trip.metadata.imagePath || trip.metadata.image;
      if (coverReference) {
        await cleanupTripCover(coverReference);
      }
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
    invitesSnap.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
    console.log(`🗑️ Eliminati ${invitesSnap.size} inviti link`);
  }

  // Cleanup reminder
  try {
    await deleteRemindersByTrip(String(tripId));
    console.log('🧹 Reminder viaggio eliminati');
  } catch (reminderError) {
    console.error('⚠️ Errore cleanup reminder:', reminderError);
  }
};

/**
 * Risultato del calcolo snapshot e pulizia breakdown
 */
interface SnapshotCalculationResult {
  expenseSnapshot: { total: number; byCategory: Record<string, unknown> };
  cleanedData: Record<string, unknown>;
}

/**
 * Calcola lo snapshot delle spese di un utente e pulisce i suoi riferimenti dai breakdown.
 * Include verifica della pulizia con log di eventuali riferimenti residui.
 */
const calculateSnapshotAndCleanBreakdowns = (
  trip: Trip,
  userId: string
): SnapshotCalculationResult => {
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

  // Verifica pulizia
  let remainingReferences = 0;
  Object.keys(cleanedData).forEach(key => {
    const cellData = cleanedData[key];

    if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
      if (cellData.costBreakdown.some((entry: { userId: string }) => entry.userId === userId)) {
        console.warn(`⚠️ Riferimento residuo trovato in ${key}`);
        remainingReferences++;
      }
    }

    if (key.endsWith('-otherExpenses') && Array.isArray(cellData)) {
      cellData.forEach((expense: { costBreakdown?: Array<{ userId: string }> }, idx: number) => {
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

  return { expenseSnapshot, cleanedData };
};

/**
 * Crea l'entry per lo storico dei membri rimossi
 */
const createExpenseSnapshotEntry = (
  userId: string,
  memberInfo: TripMember,
  expenseSnapshot: { total: number; byCategory: Record<string, unknown> }
): ExpenseSnapshot => {
  const entry: ExpenseSnapshot = {
    userId,
    displayName: memberInfo.displayName,
    username: memberInfo.username || null,
    avatar: memberInfo.avatar || null,
    removedAt: new Date(),
    totalPaid: expenseSnapshot.total,
    byCategory: expenseSnapshot.byCategory
  };

  console.log('💾 Salvataggio snapshot:', {
    userId,
    totalPaid: entry.totalPaid,
    categories: Object.keys(entry.byCategory)
  });

  return entry;
};

/**
 * Oggetto di update per rimozione membro
 */
interface MemberRemovalUpdate {
  sharing: TripSharing;
  data: Record<string, unknown>;
  history: { removedMembers: ExpenseSnapshot[] };
  updatedAt: Date;
}

/**
 * Costruisce l'oggetto di update per rimuovere un membro dal viaggio.
 * Gestisce anche la promozione di un nuovo owner se specificato.
 */
const buildMemberRemovalUpdate = (
  trip: Trip,
  userId: string,
  cleanedData: Record<string, unknown>,
  snapshotEntry: ExpenseSnapshot,
  newOwnerId?: string
): MemberRemovalUpdate => {
  const updatedMembers: Record<string, TripMember> = {
    ...trip.sharing?.members
  };

  // Aggiorna lo status del membro che esce
  if (updatedMembers[userId]) {
    updatedMembers[userId] = {
      ...updatedMembers[userId],
      status: 'left'
    };
  }

  // Se c'è un nuovo owner, promuovilo
  if (newOwnerId && updatedMembers[newOwnerId]) {
    updatedMembers[newOwnerId] = {
      ...updatedMembers[newOwnerId],
      role: 'owner'
    };
  }

  return {
    sharing: {
      ...trip.sharing!,
      members: updatedMembers,
      memberIds: trip.sharing?.memberIds?.filter(id => id !== userId) || []
    },
    data: cleanedData,
    history: {
      removedMembers: [
        ...(trip.history?.removedMembers || []),
        snapshotEntry
      ]
    },
    updatedAt: new Date()
  };
};

// ============= FUNZIONI PER I VIAGGI =============

/**
 * Sottoscrivi ai viaggi dell'utente in tempo reale
 */
export const subscribeToUserTrips = (
  userId: string,
  onTripsUpdate: TripCallback,
  onError?: ErrorCallback
): Unsubscribe => {
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
        const trips: Trip[] = [];
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
              days: data.days.map((day: TripDay) => ({
                ...day,
                date: safeConvertToDate(day.date)
              }))
            } as Trip);
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
 * Crea un nuovo viaggio
 */
export const createTrip = async (trip: Trip, userProfile: UserProfile): Promise<Trip> => {
  try {
    const tripRef = doc(db, 'trips', trip.id.toString());

    const metadata: TripMetadata = trip.metadata || {
      name: trip.name || 'Nuovo Viaggio',
      image: trip.image || null,
      destinations: [],
      description: ''
    };

    const sharing: TripSharing = {
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
 * Aggiorna un viaggio esistente
 */
export const updateTrip = async (
  userId: string,
  tripId: string | number,
  updates: TripUpdates
): Promise<void> => {
  try {
    const hasPermission = await canEdit(tripId, userId);
    if (!hasPermission) {
      throw new Error('Non hai i permessi per modificare questo viaggio');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date()
    };

    if (updates.days) {
      updateData.days = updates.days.map(day => ({
        ...day,
        date: day.date
      }));
    }

    // Rimuovi campi undefined (Firebase non li accetta)
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    const docSnap = await getDoc(tripRef);

    if (docSnap.exists()) {
      await updateDoc(tripRef, cleanUpdateData);
    } else {
      await setDoc(tripRef, cleanUpdateData);
    }

    // Conferma media salvati (per cleanup orfani)
    confirmMediaInData(cleanUpdateData);

    console.log('✅ Viaggio aggiornato:', tripId);
  } catch (error) {
    console.error('❌ Errore aggiornamento viaggio:', error);
    throw error;
  }
};

/**
 * Aggiorna solo i metadata di un viaggio
 */
export const updateTripMetadata = async (
  userId: string,
  tripId: string | number,
  metadata: TripMetadata
): Promise<void> => {
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
 * Abbandona un viaggio (logica completa con transaction + cleanup + snapshot)
 */
export const leaveTrip = async (
  tripId: string | number,
  userId: string
): Promise<LeaveResult> => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());

    return await runTransaction(db, async (transaction) => {
      const tripDoc = await transaction.get(tripRef);

      if (!tripDoc.exists()) {
        throw new Error('Viaggio non trovato');
      }

      const tripData = tripDoc.data();
      const trip: Trip = {
        id: tripDoc.id,
        ...tripData,
        days: tripData.days.map((day: TripDay) => ({
          ...day,
          date: safeConvertToDate(day.date)
        }))
      } as Trip;

      const members = trip.sharing?.members || {};

      if (!members[userId] || members[userId].status !== 'active') {
        throw new Error('Non sei membro di questo viaggio');
      }

      const activeMembers = Object.entries(members).filter(
        ([_, member]) => member.status === 'active'
      );

      const isOwner = members[userId].role === 'owner';
      const otherActiveMembers = activeMembers.filter(([id]) => id !== userId);
      const membersToPromote = otherActiveMembers.filter(([_, m]) => m.role === 'member');

      // CASO: Elimina viaggio (ultimo membro o owner senza successori)
      if (activeMembers.length === 1 || (isOwner && membersToPromote.length === 0)) {
        console.log('🗑️ Eliminazione viaggio (ultimo membro o nessun successore)...');
        await cleanupTripResources(trip, tripId);
        transaction.delete(tripRef);
        console.log('✅ Viaggio eliminato definitivamente');
        return { action: 'deleted' as const };
      }

      // CASO: Membro esce (con eventuale promozione a owner)
      const { expenseSnapshot, cleanedData } = calculateSnapshotAndCleanBreakdowns(trip, userId);
      const snapshotEntry = createExpenseSnapshotEntry(userId, members[userId], expenseSnapshot);

      let newOwnerId: string | undefined;
      if (isOwner && membersToPromote.length > 0) {
        [newOwnerId] = membersToPromote[0];
        console.log(`👑 Promozione ${newOwnerId} a owner`);
      }

      const updateData = buildMemberRemovalUpdate(trip, userId, cleanedData, snapshotEntry, newOwnerId);
      transaction.update(tripRef, updateData);

      if (newOwnerId) {
        console.log('✅ Member promosso a owner + Snapshot salvato');
        return { action: 'left' as const, newOwner: newOwnerId };
      }

      console.log('✅ Hai abbandonato il viaggio + Snapshot salvato');
      return { action: 'left' as const };
    });
  } catch (error) {
    console.error('❌ Errore abbandono viaggio:', error);
    throw error;
  }
};

/**
 * Elimina viaggio per un utente (usa leaveTrip)
 */
export const deleteTripForUser = async (
  userId: string,
  tripId: string | number
): Promise<LeaveResult> => {
  return leaveTrip(tripId, userId);
};

/**
 * Carica un singolo viaggio
 */
export const loadTrip = async (userId: string, tripId: string | number): Promise<Trip> => {
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
      days: data.days.map((day: TripDay) => ({
        ...day,
        date: safeConvertToDate(day.date)
      }))
    } as Trip;
  } catch (error) {
    console.error('❌ Errore caricamento viaggio:', error);
    throw error;
  }
};

/**
 * Carica tutti i viaggi di un utente (snapshot singolo, non real-time)
 */
export const loadUserTrips = async (userId: string): Promise<Trip[]> => {
  try {
    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const trips: Trip[] = [];
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
          days: data.days.map((day: TripDay) => ({
            ...day,
            date: safeConvertToDate(day.date)
          }))
        } as Trip);
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
export const updateUserProfileInTrips = async (
  userId: string,
  updates: ProfileUpdates
): Promise<number> => {
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
        const updatePath: Record<string, unknown> = { updatedAt: new Date() };

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
