// ============================================
// ALTROVE - Trip Permissions
// Funzioni helper per permessi
// ============================================

import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

type UserRole = 'owner' | 'member' | null;

interface TripMember {
  role: 'owner' | 'member';
  status: 'active' | 'left' | 'removed';
}

interface TripSharing {
  members?: Record<string, TripMember>;
}

interface TripData {
  sharing?: TripSharing;
}

/**
 * Ottiene il ruolo dell'utente in un viaggio
 */
export const getUserRole = async (tripId: string | number, userId: string): Promise<UserRole> => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return null;
    }

    const trip = tripSnap.data() as TripData;
    const member = trip.sharing?.members?.[userId];

    if (!member || member.status !== 'active') {
      return null;
    }

    return member.role;
  } catch (error) {
    console.error('❌ Errore verifica ruolo:', error);
    return null;
  }
};

/**
 * Verifica se l'utente può modificare il viaggio
 * Sia owner che member possono modificare
 */
export const canEdit = async (tripId: string | number, userId: string): Promise<boolean> => {
  const role = await getUserRole(tripId, userId);
  return role === 'owner' || role === 'member';
};

/**
 * Verifica se l'utente può eliminare il viaggio
 * Solo l'owner può eliminare
 */
export const canDelete = async (tripId: string | number, userId: string): Promise<boolean> => {
  const role = await getUserRole(tripId, userId);
  return role === 'owner';
};

/**
 * Verifica se l'utente è membro attivo del viaggio
 */
export const isActiveMember = async (tripId: string | number, userId: string): Promise<boolean> => {
  const role = await getUserRole(tripId, userId);
  return role !== null;
};
