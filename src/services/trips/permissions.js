import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

// ============= FUNZIONI HELPER PER PERMESSI =============

/**
 * Ottiene il ruolo dell'utente in un viaggio
 * @returns 'owner' | 'member' | null
 */
export const getUserRole = async (tripId, userId) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);
    
    if (!tripSnap.exists()) {
      return null;
    }
    
    const trip = tripSnap.data();
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
export const canEdit = async (tripId, userId) => {
  const role = await getUserRole(tripId, userId);
  return role === 'owner' || role === 'member';
};

/**
 * Verifica se l'utente può eliminare il viaggio
 * Solo l'owner può eliminare
 */
export const canDelete = async (tripId, userId) => {
  const role = await getUserRole(tripId, userId);
  return role === 'owner';
};

/**
 * Verifica se l'utente è membro attivo del viaggio
 */
export const isActiveMember = async (tripId, userId) => {
  const role = await getUserRole(tripId, userId);
  return role !== null;
};