import { db } from '../firebase';
import {
  collection,
  collectionGroup,
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
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';

// ============= FUNZIONI HELPER PER PERMESSI =============

/**
 * Ottiene il ruolo dell'utente in un viaggio
 * @returns 'owner' | 'editor' | 'viewer' | null
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
 */
export const canEdit = async (tripId, userId) => {
  const role = await getUserRole(tripId, userId);
  return role === 'owner' || role === 'editor';
};

/**
 * Verifica se l'utente può eliminare il viaggio
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

// ============= FUNZIONI PER I VIAGGI =============

/**
 * ⭐ NUOVA: Sottoscrivi ai viaggi dell'utente in tempo reale
 * Query su /trips dove userId è in sharing.memberIds
 */
export const subscribeToUserTrips = (userId, onTripsUpdate, onError) => {
  try {
    const tripsRef = collection(db, 'trips');

    // ⭐ Query: viaggi dove l'utente è membro
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    // Listener real-time
    const unsubscribe = onSnapshot(q,
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
 * ⭐ MODIFICATA: Crea un nuovo viaggio nella collection globale /trips
 * @param {Object} trip - Dati del viaggio
 * @param {Object} userProfile - Profilo completo dell'utente (displayName, username, avatar)
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
      memberIds: [userProfile.uid],  // Array per query
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
 * Salva un viaggio (alias per retrocompatibilità)
 * @deprecated Usa createTrip invece
 */
export const saveTrip = async (userId, trip) => {
  console.warn('⚠️ saveTrip è deprecata, usa createTrip con userProfile');
  // Per retrocompatibilità temporanea
  const userProfile = {
    uid: userId,
    displayName: 'Utente',
    username: null,
    avatar: null
  };
  return createTrip(trip, userProfile);
};

/**
 * ⭐ MODIFICATA: Aggiorna un viaggio esistente
 * Verifica permessi prima di aggiornare
 */
export const updateTrip = async (userId, tripId, updates) => {
  try {
    // ⭐ Verifica permessi
    const hasPermission = await canEdit(tripId, userId);
    if (!hasPermission) {
      throw new Error('Non hai i permessi per modificare questo viaggio');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

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

    // Verifica se il documento esiste
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
 * ⭐ NUOVA: Aggiorna solo i metadata di un viaggio
 * Solo owner può modificare metadata
 */
export const updateTripMetadata = async (userId, tripId, metadata) => {
  try {
    // ⭐ Solo owner può modificare metadata
    const role = await getUserRole(tripId, userId);
    if (role !== 'owner') {
      throw new Error('Solo il proprietario può modificare le informazioni del viaggio');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

    await updateDoc(tripRef, {
      'metadata': metadata,
      // Retrocompatibilità
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
 * ⭐ NUOVA: Abbandona un viaggio (logica WhatsApp)
 * - Se sei owner → promuovi primo editor a owner
 * - Se sei ultimo membro → elimina trip
 * - Altrimenti → imposta status 'left'
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
    const memberIds = trip.sharing.memberIds;

    // Verifica che l'utente sia membro
    if (!members[userId] || members[userId].status !== 'active') {
      throw new Error('Non sei membro di questo viaggio');
    }

    // Conta membri attivi
    const activeMembers = Object.entries(members).filter(
      ([id, member]) => member.status === 'active'
    );

    // ⭐ CASO 1: Ultimo membro → Elimina viaggio + inviti
    if (activeMembers.length === 1) {
      console.log('🗑️ Ultimo membro, eliminazione viaggio...');

      // ⭐ Pulizia inviti link
      const invitesRef = collection(db, 'invites');
      const invitesQuery = query(invitesRef, where('tripId', '==', String(tripId)));
      const invitesSnap = await getDocs(invitesQuery);

      if (!invitesSnap.empty) {
        const batch = writeBatch(db);
        invitesSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`🗑️ Eliminati ${invitesSnap.size} inviti link collegati`);
      }

      await deleteDoc(tripRef);
      console.log('✅ Viaggio eliminato definitivamente');
      return { action: 'deleted' };
    }

    // ⭐ CASO 2: Owner che abbandona → Promuovi primo member
    if (members[userId].role === 'owner') {
      const otherMembers = activeMembers.filter(
        ([id, member]) => id !== userId && member.role === 'member'
      );

      if (otherMembers.length > 0) {
        // Promuovi primo member a owner
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
        // Nessun altro membro, elimina viaggio + inviti
        console.log('🗑️ Nessun altro membro, eliminazione viaggio...');

        // ⭐ Pulizia inviti link
        const invitesRef = collection(db, 'invites');
        const invitesQuery = query(invitesRef, where('tripId', '==', String(tripId)));
        const invitesSnap = await getDocs(invitesQuery);

        if (!invitesSnap.empty) {
          const batch = writeBatch(db);
          invitesSnap.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`🗑️ Eliminati ${invitesSnap.size} inviti link collegati`);
        }

        await deleteDoc(tripRef);
        console.log('✅ Viaggio eliminato definitivamente');
        return { action: 'deleted' };
      }
    }

    // ⭐ CASO 3: Member che abbandona → Imposta status left
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
 * ⭐ NUOVA: Elimina viaggio per un utente (wrapper di leaveTrip)
 * Usato dall'UI per "eliminare" un viaggio
 */
export const deleteTripForUser = async (userId, tripId) => {
  return leaveTrip(tripId, userId);
};

/**
 * Elimina un viaggio (hard delete - solo per owner)
 * @deprecated Usa leaveTrip per logica WhatsApp
 */
export const deleteTrip = async (userId, tripId) => {
  try {
    // Verifica permessi
    const role = await getUserRole(tripId, userId);
    if (role !== 'owner') {
      throw new Error('Solo il proprietario può eliminare il viaggio');
    }

    // ⭐ Pulizia inviti link
    const invitesRef = collection(db, 'invites');
    const invitesQuery = query(invitesRef, where('tripId', '==', String(tripId)));
    const invitesSnap = await getDocs(invitesQuery);

    if (!invitesSnap.empty) {
      const batch = writeBatch(db);
      invitesSnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`🗑️ Eliminati ${invitesSnap.size} inviti link`);
    }

    const tripRef = doc(db, 'trips', tripId.toString());
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
    const tripRef = doc(db, 'trips', tripId.toString());
    const snapshot = await getDoc(tripRef);

    if (!snapshot.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const data = snapshot.data();

    // Verifica che l'utente sia membro attivo
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
 * Carica tutti i viaggi di un utente (snapshot singolo)
 * @deprecated Usa subscribeToUserTrips per real-time
 */
export const loadUserTrips = async (userId) => {
  try {
    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const trips = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Filtra solo membri attivi
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

    console.log('✅ Viaggi caricati:', trips.length);
    return trips;
  } catch (error) {
    console.error('❌ Errore caricamento viaggi:', error);
    throw error;
  }
};

// ============= FUNZIONI PER GESTIONE MEMBRI (Ready per Step 2) =============

/**
 * 🔜 Step 2: Aggiunge un membro a un viaggio
 * @param {string} tripId - ID del viaggio
 * @param {string} invitedUserId - ID utente da aggiungere
 * @param {Object} invitedUserProfile - Profilo completo (displayName, username, avatar)
 * @param {string} role - Ruolo: 'editor' | 'viewer'
 * @param {string} invitedBy - ID utente che invita
 */
export const addMemberToTrip = async (tripId, invitedUserId, invitedUserProfile, role, invitedBy) => {
  try {
    // Verifica che chi invita sia owner
    const inviterRole = await getUserRole(tripId, invitedBy);
    if (inviterRole !== 'owner') {
      throw new Error('Solo il proprietario può invitare altri utenti');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

    // Aggiungi membro
    await updateDoc(tripRef, {
      'sharing.memberIds': arrayUnion(invitedUserId),
      [`sharing.members.${invitedUserId}`]: {
        role: role,
        status: 'active',
        addedAt: new Date(),
        addedBy: invitedBy,
        displayName: invitedUserProfile.displayName || 'Utente',
        username: invitedUserProfile.username || null,
        avatar: invitedUserProfile.avatar || null
      },
      'updatedAt': new Date()
    });

    console.log('✅ Membro aggiunto al viaggio:', invitedUserId);
  } catch (error) {
    console.error('❌ Errore aggiunta membro:', error);
    throw error;
  }
};

/**
 * 🔜 Step 2: Rimuove un membro dal viaggio
 */
export const removeMemberFromTrip = async (tripId, memberIdToRemove, removedBy) => {
  try {
    // Verifica che chi rimuove sia owner
    const removerRole = await getUserRole(tripId, removedBy);
    if (removerRole !== 'owner') {
      throw new Error('Solo il proprietario può rimuovere membri');
    }

    // Non puoi rimuovere te stesso (usa leaveTrip)
    if (memberIdToRemove === removedBy) {
      throw new Error('Usa leaveTrip per abbandonare il viaggio');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

    await updateDoc(tripRef, {
      'sharing.memberIds': arrayRemove(memberIdToRemove),
      [`sharing.members.${memberIdToRemove}.status`]: 'removed',
      'updatedAt': new Date()
    });

    console.log('✅ Membro rimosso dal viaggio:', memberIdToRemove);
  } catch (error) {
    console.error('❌ Errore rimozione membro:', error);
    throw error;
  }
};

/**
 * 🔜 Step 3: Cambia ruolo di un membro
 */
export const changeMemberRole = async (tripId, memberId, newRole, changedBy) => {
  try {
    // Verifica che chi cambia sia owner
    const changerRole = await getUserRole(tripId, changedBy);
    if (changerRole !== 'owner') {
      throw new Error('Solo il proprietario può cambiare i ruoli');
    }

    // Non puoi cambiare il tuo ruolo
    if (memberId === changedBy) {
      throw new Error('Non puoi cambiare il tuo ruolo');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

    await updateDoc(tripRef, {
      [`sharing.members.${memberId}.role`]: newRole,
      'updatedAt': new Date()
    });

    console.log(`✅ Ruolo cambiato: ${memberId} → ${newRole}`);
  } catch (error) {
    console.error('❌ Errore cambio ruolo:', error);
    throw error;
  }
};

// ============= FUNZIONI PER INVITI (Step 2) =============

/**
 * 📧 Invita un utente per username
 * @param {string} tripId - ID del viaggio
 * @param {string} invitedUserId - ID utente da invitare
 * @param {Object} invitedUserProfile - Profilo utente (displayName, username, avatar)
 * @param {string} role - Ruolo: 'editor' | 'viewer'
 * @param {string} invitedBy - ID utente che invita (deve essere owner)
 * @returns {Promise<string>} - ID dell'invito creato
 */
export const inviteMemberByUsername = async (tripId, invitedUserId, invitedUserProfile, role, invitedBy) => {
  try {
    // Verifica che chi invita sia owner
    const inviterRole = await getUserRole(tripId, invitedBy);
    if (inviterRole !== 'owner') {
      throw new Error('Solo il proprietario può invitare altri utenti');
    }

    // Verifica che l'utente non sia già membro
    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const trip = tripSnap.data();
    if (trip.sharing.memberIds.includes(invitedUserId)) {
      throw new Error('Questo utente è già membro del viaggio');
    }

    // Verifica che non ci sia già un invito pendente
    const invitationsRef = collection(db, 'trips', tripId.toString(), 'invitations');
    const existingInvitesQuery = query(
      invitationsRef,
      where('invitedUserId', '==', invitedUserId),
      where('status', '==', 'pending')
    );
    const existingSnap = await getDocs(existingInvitesQuery);

    if (!existingSnap.empty) {
      throw new Error('Hai già inviato un invito a questo utente');
    }

    // Crea l'invito
    const inviteId = `inv_${Date.now()}`;
    const inviteRef = doc(db, 'trips', tripId.toString(), 'invitations', inviteId);

    const inviteData = {
      invitedUserId,
      invitedUsername: invitedUserProfile.username,
      invitedDisplayName: invitedUserProfile.displayName,
      role,
      status: 'pending',
      invitedBy,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
      tripId,
      tripName: trip.metadata?.name || trip.name || 'Viaggio'
    };

    await setDoc(inviteRef, inviteData);

    console.log(`✅ Invito creato: ${invitedUserProfile.username} → ${role}`);
    return inviteId;
  } catch (error) {
    console.error('❌ Errore creazione invito:', error);
    throw error;
  }
};

/**
 * ✅ Accetta un invito
 * @param {string} invitationId - ID dell'invito
 * @param {string} tripId - ID del viaggio
 * @param {string} userId - ID utente che accetta
 * @param {Object} userProfile - Profilo completo utente
 */
export const acceptInvitation = async (invitationId, tripId, userId, userProfile) => {
  try {
    const inviteRef = doc(db, 'trips', tripId.toString(), 'invitations', invitationId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('Invito non trovato');
    }

    const invite = inviteSnap.data();

    // Verifica che l'invito sia per te
    if (invite.invitedUserId !== userId) {
      throw new Error('Questo invito non è per te');
    }

    // Verifica che sia ancora pendente
    if (invite.status !== 'pending') {
      throw new Error('Questo invito non è più valido');
    }

    // Verifica scadenza
    if (invite.expiresAt.toDate() < new Date()) {
      throw new Error('Questo invito è scaduto');
    }

    // Aggiungi come membro del viaggio
    await addMemberToTrip(
      tripId,
      userId,
      userProfile,
      invite.role,
      invite.invitedBy
    );

    // Aggiorna status invito
    await updateDoc(inviteRef, {
      status: 'accepted',
      acceptedAt: new Date()
    });

    console.log(`✅ Invito accettato: ${userProfile.username} → ${invite.role}`);
  } catch (error) {
    console.error('❌ Errore accettazione invito:', error);
    throw error;
  }
};

/**
 * ❌ Rifiuta un invito
 * @param {string} invitationId - ID dell'invito
 * @param {string} tripId - ID del viaggio
 * @param {string} userId - ID utente che rifiuta
 */
export const rejectInvitation = async (invitationId, tripId, userId) => {
  try {
    const inviteRef = doc(db, 'trips', tripId.toString(), 'invitations', invitationId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('Invito non trovato');
    }

    const invite = inviteSnap.data();

    // Verifica che l'invito sia per te
    if (invite.invitedUserId !== userId) {
      throw new Error('Questo invito non è per te');
    }

    // Verifica che sia ancora pendente
    if (invite.status !== 'pending') {
      throw new Error('Questo invito non è più valido');
    }

    // Aggiorna status invito
    await updateDoc(inviteRef, {
      status: 'rejected',
      rejectedAt: new Date()
    });

    console.log(`❌ Invito rifiutato da ${userId}`);
  } catch (error) {
    console.error('❌ Errore rifiuto invito:', error);
    throw error;
  }
};

/**
 * 📋 Carica inviti pendenti per un utente
 * @param {string} userId - ID utente
 * @returns {Promise<Array>} - Lista inviti pendenti
 */
export const loadPendingInvitations = async (userId) => {
  try {
    // Query su tutti i viaggi per trovare inviti per questo utente
    // Nota: richiede collectionGroup query
    const invitationsRef = collectionGroup(db, 'invitations');
    const q = query(
      invitationsRef,
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('invitedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const invitations = [];

    snapshot.forEach(docSnap => {
      invitations.push({
        id: docSnap.id,
        ...docSnap.data(),
        invitedAt: docSnap.data().invitedAt?.toDate(),
        expiresAt: docSnap.data().expiresAt?.toDate()
      });
    });

    console.log(`✅ Inviti pendenti caricati: ${invitations.length}`);
    return invitations;
  } catch (error) {
    console.error('❌ Errore caricamento inviti:', error);
    throw error;
  }
};

/**
 * 🔄 Sottoscrivi agli inviti pendenti (real-time)
 * @param {string} userId - ID utente
 * @param {Function} onInvitationsUpdate - Callback con inviti aggiornati
 * @param {Function} onError - Callback errori
 * @returns {Function} - Funzione unsubscribe
 */
export const subscribeToPendingInvitations = (userId, onInvitationsUpdate, onError) => {
  try {
    const invitationsRef = collectionGroup(db, 'invitations');
    const q = query(
      invitationsRef,
      where('invitedUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('invitedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const invitations = [];
        snapshot.forEach(docSnap => {
          invitations.push({
            id: docSnap.id,
            ...docSnap.data(),
            invitedAt: docSnap.data().invitedAt?.toDate(),
            expiresAt: docSnap.data().expiresAt?.toDate()
          });
        });

        console.log(`🔄 Inviti pendenti aggiornati: ${invitations.length}`);
        onInvitationsUpdate(invitations);
      },
      (error) => {
        console.error('❌ Errore listener inviti:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Errore sottoscrizione inviti:', error);
    throw error;
  }
};

/**
 * 🔗 Genera link di condivisione per un viaggio
 * @param {string} tripId - ID del viaggio
 * @param {string} userId - ID utente (deve essere owner)
 * @param {string} role - Ruolo per chi usa il link: 'editor' | 'viewer'
 * @returns {Promise<string>} - Token del link
 */
export const generateShareLink = async (tripId, userId, role = 'viewer') => {
  try {
    // Verifica che sia owner
    const userRole = await getUserRole(tripId, userId);
    if (userRole !== 'owner') {
      throw new Error('Solo il proprietario può generare link di condivisione');
    }

    // Genera token univoco
    const token = `share_${tripId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Salva in sharing.shareLink
    const tripRef = doc(db, 'trips', tripId.toString());
    await updateDoc(tripRef, {
      'sharing.shareLink': {
        token,
        role,
        createdBy: userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 giorni
        isActive: true
      },
      'updatedAt': new Date()
    });

    console.log(`✅ Link condivisione generato: ${token}`);
    return token;
  } catch (error) {
    console.error('❌ Errore generazione link:', error);
    throw error;
  }
};

/**
 * 🔗 Accedi a un viaggio tramite link condivisione
 * @param {string} token - Token del link
 * @param {string} userId - ID utente che usa il link
 * @param {Object} userProfile - Profilo utente
 */
export const joinViaShareLink = async (token, userId, userProfile) => {
  try {
    // Cerca il viaggio con questo token
    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('sharing.shareLink.token', '==', token),
      where('sharing.shareLink.isActive', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Link non valido o scaduto');
    }

    const tripSnap = snapshot.docs[0];
    const trip = tripSnap.data();
    const tripId = tripSnap.id;

    // Verifica scadenza
    if (trip.sharing.shareLink.expiresAt.toDate() < new Date()) {
      throw new Error('Questo link è scaduto');
    }

    // Verifica che non sia già membro
    if (trip.sharing.memberIds.includes(userId)) {
      throw new Error('Sei già membro di questo viaggio');
    }

    // Aggiungi come membro
    await addMemberToTrip(
      tripId,
      userId,
      userProfile,
      trip.sharing.shareLink.role,
      trip.sharing.shareLink.createdBy
    );

    console.log(`✅ Utente aggiunto via link: ${userProfile.username}`);
    return tripId;
  } catch (error) {
    console.error('❌ Errore accesso via link:', error);
    throw error;
  }
};

/**
 * 🗑️ Disattiva link di condivisione
 * @param {string} tripId - ID del viaggio
 * @param {string} userId - ID utente (deve essere owner)
 */
export const disableShareLink = async (tripId, userId) => {
  try {
    // Verifica che sia owner
    const userRole = await getUserRole(tripId, userId);
    if (userRole !== 'owner') {
      throw new Error('Solo il proprietario può disattivare il link');
    }

    const tripRef = doc(db, 'trips', tripId.toString());
    await updateDoc(tripRef, {
      'sharing.shareLink.isActive': false,
      'updatedAt': new Date()
    });

    console.log(`✅ Link condivisione disattivato`);
  } catch (error) {
    console.error('❌ Errore disattivazione link:', error);
    throw error;
  }
};

/**
 * ⭐ NUOVO: Cambia il ruolo di un membro
 * @param {string} tripId - ID del viaggio
 * @param {string} targetUserId - ID del membro da modificare
 * @param {'editor' | 'viewer'} newRole - Nuovo ruolo
 */
export const updateMemberRole = async (tripId, targetUserId, newRole) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const trip = tripSnap.data();
    const targetMember = trip.sharing?.members?.[targetUserId];

    if (!targetMember) {
      throw new Error('Membro non trovato');
    }

    // Non si può modificare il ruolo dell'owner
    if (targetMember.role === 'owner') {
      throw new Error('Non puoi modificare il ruolo del proprietario');
    }

    // Non si può assegnare ruolo owner
    if (newRole === 'owner') {
      throw new Error('Non puoi assegnare il ruolo di proprietario');
    }

    // Aggiorna il ruolo
    await updateDoc(tripRef, {
      [`sharing.members.${targetUserId}.role`]: newRole,
      'updatedAt': new Date()
    });

    console.log(`✅ Ruolo aggiornato: ${targetUserId} → ${newRole}`);
  } catch (error) {
    console.error('❌ Errore cambio ruolo:', error);
    throw error;
  }
};

/**
 * ⭐ NUOVO: Rimuove un membro dal viaggio
 * @param {string} tripId - ID del viaggio
 * @param {string} targetUserId - ID del membro da rimuovere
 */
export const removeMember = async (tripId, targetUserId) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const trip = tripSnap.data();
    const targetMember = trip.sharing?.members?.[targetUserId];

    if (!targetMember) {
      throw new Error('Membro non trovato');
    }

    // Non si può rimuovere l'owner
    if (targetMember.role === 'owner') {
      throw new Error('Non puoi rimuovere il proprietario');
    }

    // Cambia status a 'removed' e rimuovi da memberIds
    await updateDoc(tripRef, {
      [`sharing.members.${targetUserId}.status`]: 'removed',
      [`sharing.members.${targetUserId}.removedAt`]: new Date(),
      'sharing.memberIds': arrayRemove(targetUserId),
      'updatedAt': new Date()
    });

    console.log(`✅ Membro rimosso: ${targetUserId}`);
  } catch (error) {
    console.error('❌ Errore rimozione membro:', error);
    throw error;
  }
};