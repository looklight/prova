import { db } from '../../firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, addDoc, arrayUnion } from 'firebase/firestore';
import { getUserRole } from './permissions';
import { addMemberToTrip } from './memberManagement';

// ============= FUNZIONI PER LINK DI CONDIVISIONE =============

/**
 * 🔗 Genera link di condivisione per un viaggio (sempre come member)
 */
export const generateShareLink = async (tripId, invitedBy) => {
  const linkRef = await addDoc(collection(db, 'trips', String(tripId), 'shareLinks'), {
    invitedBy,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usedBy: [],
    isActive: true
  });

  // ✅ FIX: Genera URL completo con formato /join/:tripId/:linkId
  const shareUrl = `${window.location.origin}/join/${tripId}/${linkRef.id}`;
  
  // Salva l'URL nel documento (opzionale, ma utile)
  await updateDoc(linkRef, { shareUrl });
  
  console.log('✅ Link generato:', shareUrl);
  return shareUrl;  // ⭐ Ritorna URL completo
};

/**
 * 🔗 Accedi a un viaggio tramite link condivisione
 */
export const joinViaShareLink = async (tripId, linkId, userId, userProfile) => {
  try {
    // Valida il link
    const linkRef = doc(db, 'trips', String(tripId), 'shareLinks', linkId);
    const linkSnap = await getDoc(linkRef);
    
    if (!linkSnap.exists()) {
      throw new Error('Link non valido');
    }
    
    const linkData = linkSnap.data();
    
    // Verifica se attivo
    if (!linkData.isActive) {
      throw new Error('Questo link è stato disattivato');
    }
    
    // Verifica scadenza
    if (linkData.expiresAt.toDate() < new Date()) {
      throw new Error('Questo link è scaduto');
    }
    
    // Carica trip
    const tripRef = doc(db, 'trips', String(tripId));
    const tripSnap = await getDoc(tripRef);
    
    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }
    
    const trip = tripSnap.data();
    
    // Verifica se già membro
    if (trip.sharing?.memberIds?.includes(userId)) {
      throw new Error('Sei già membro di questo viaggio');
    }
    
    // Aggiungi come membro
    await addMemberToTrip(
      tripId,
      userId,
      userProfile,
      linkData.invitedBy
    );
    
    // Traccia uso link
    await updateDoc(linkRef, {
      usedBy: arrayUnion(userId)
    });
    
    console.log('✅ Utente aggiunto via link come member:', userProfile.username);
    return trip;
  } catch (error) {
    console.error('❌ Errore accesso via link:', error);
    throw error;
  }
};

/**
 * 🗑️ Disattiva link di condivisione
 */
export const disableShareLink = async (tripId, userId) => {
  try {
    const userRole = await getUserRole(tripId, userId);
    if (userRole !== 'owner') {
      throw new Error('Solo il proprietario può disattivare il link');
    }

    const tripRef = doc(db, 'trips', tripId.toString());
    await updateDoc(tripRef, {
      'sharing.shareLink.isActive': false,
      'updatedAt': new Date()
    });

    console.log('✅ Link condivisione disattivato');
  } catch (error) {
    console.error('❌ Errore disattivazione link:', error);
    throw error;
  }
};