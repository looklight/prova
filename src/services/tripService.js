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
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { CATEGORIES } from '../utils/constants';

// ============= FUNZIONI HELPER PER PERMESSI =============

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

export const canEdit = async (tripId, userId) => {
  const role = await getUserRole(tripId, userId);
  return role === 'owner' || role === 'member';
};

export const canDelete = async (tripId, userId) => {
  const role = await getUserRole(tripId, userId);
  return role === 'owner';
};

export const isActiveMember = async (tripId, userId) => {
  const role = await getUserRole(tripId, userId);
  return role !== null;
};

// ============= HELPER: CALCOLA SNAPSHOT SPESE =============

const calculateMemberExpenseSnapshot = (trip, userId) => {
  const snapshot = {
    totalPaid: 0,
    byCategory: {}
  };

  trip.days.forEach(day => {
    CATEGORIES.forEach(cat => {
      if (cat.id === 'base' || cat.id === 'note' || cat.id === 'otherExpenses') return;

      const key = `${day.id}-${cat.id}`;
      const cellData = trip.data[key];

      if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
        cellData.costBreakdown.forEach(entry => {
          if (entry.userId === userId) {
            snapshot.totalPaid += entry.amount;
            const categoryKey = cat.label;
            if (!snapshot.byCategory[categoryKey]) {
              snapshot.byCategory[categoryKey] = 0;
            }
            snapshot.byCategory[categoryKey] += entry.amount;
          }
        });
      }
    });

    const otherExpensesKey = `${day.id}-otherExpenses`;
    const otherExpenses = trip.data[otherExpensesKey];

    if (otherExpenses && Array.isArray(otherExpenses)) {
      otherExpenses.forEach(expense => {
        if (expense.costBreakdown && Array.isArray(expense.costBreakdown)) {
          expense.costBreakdown.forEach(entry => {
            if (entry.userId === userId) {
              snapshot.totalPaid += entry.amount;
              const categoryKey = 'Altre Spese';
              if (!snapshot.byCategory[categoryKey]) {
                snapshot.byCategory[categoryKey] = 0;
              }
              snapshot.byCategory[categoryKey] += entry.amount;
            }
          });
        }
      });
    }
  });

  return snapshot;
};

// ============= HELPER: APPLICA PULIZIA BREAKDOWN =============

const applyBreakdownCleanup = (trip, userId) => {
  const updated = JSON.parse(JSON.stringify(trip));

  updated.days.forEach(day => {
    CATEGORIES.forEach(cat => {
      if (cat.id === 'base' || cat.id === 'note' || cat.id === 'otherExpenses') return;

      const key = `${day.id}-${cat.id}`;
      const cellData = updated.data[key];

      if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
        const newBreakdown = cellData.costBreakdown.filter(entry => entry.userId !== userId);

        if (newBreakdown.length === 0) {
          updated.data[key] = {
            title: '',
            cost: '',
            costBreakdown: null,
            hasSplitCost: false,
            participants: null,
            bookingStatus: 'na',
            transportMode: 'none',
            links: [],
            images: [],
            videos: [],
            mediaNotes: [],
            notes: ''
          };
        } else {
          updated.data[key].costBreakdown = newBreakdown;
          const newTotal = newBreakdown.reduce((sum, e) => sum + e.amount, 0);
          updated.data[key].cost = newTotal.toString();

          if (updated.data[key].participants) {
            const newParticipants = updated.data[key].participants.filter(uid => uid !== userId);
            updated.data[key].participants = newParticipants.length > 0 ? newParticipants : null;
          }
        }
      }
    });

    const otherExpensesKey = `${day.id}-otherExpenses`;
    if (updated.data[otherExpensesKey] && Array.isArray(updated.data[otherExpensesKey])) {
      updated.data[otherExpensesKey] = updated.data[otherExpensesKey]
        .map(expense => {
          if (!expense.costBreakdown || !Array.isArray(expense.costBreakdown)) {
            return expense;
          }

          const newBreakdown = expense.costBreakdown.filter(entry => entry.userId !== userId);

          if (newBreakdown.length === 0) {
            return null;
          }

          const newTotal = newBreakdown.reduce((sum, e) => sum + e.amount, 0);
          const newParticipants = expense.participants
            ? expense.participants.filter(uid => uid !== userId)
            : null;

          return {
            ...expense,
            costBreakdown: newBreakdown,
            cost: newTotal.toString(),
            participants: newParticipants && newParticipants.length > 0 ? newParticipants : null
          };
        })
        .filter(expense => expense !== null);
    }
  });

  return updated;
};

// ============= FUNZIONI PER I VIAGGI =============

export const subscribeToUserTrips = (userId, onTripsUpdate, onError) => {
  try {
    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('sharing.memberIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
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

export const saveTrip = async (userId, trip) => {
  console.warn('⚠️ saveTrip è deprecata, usa createTrip con userProfile');
  const userProfile = {
    uid: userId,
    displayName: 'Utente',
    username: null,
    avatar: null
  };
  return createTrip(trip, userProfile);
};

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

export const leaveTrip = async (tripId, userId) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());

    return await runTransaction(db, async (transaction) => {
      const tripDoc = await transaction.get(tripRef);

      if (!tripDoc.exists()) {
        throw new Error('Viaggio non trovato');
      }

      const trip = tripDoc.data();
      const members = trip.sharing.members;

      if (!members[userId] || members[userId].status !== 'active') {
        throw new Error('Non sei membro di questo viaggio');
      }

      const activeMembers = Object.entries(members).filter(
        ([id, member]) => member.status === 'active'
      );

      if (activeMembers.length === 1) {
        console.log('🗑️ Ultimo membro, eliminazione viaggio...');

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

      console.log('📸 Calcolo snapshot spese...');
      const expenseSnapshot = calculateMemberExpenseSnapshot(trip, userId);

      console.log('🧹 Pulizia breakdown...');
      const updated = applyBreakdownCleanup(trip, userId);

      const memberInfo = members[userId];
      const snapshotEntry = {
        userId,
        displayName: memberInfo.displayName,
        username: memberInfo.username || null,
        avatar: memberInfo.avatar || null,
        removedAt: new Date(),
        totalPaid: expenseSnapshot.totalPaid,
        byCategory: expenseSnapshot.byCategory
      };

      if (members[userId].role === 'owner') {
        const otherMembers = activeMembers.filter(
          ([id, member]) => id !== userId && member.role === 'member'
        );

        if (otherMembers.length > 0) {
          const [newOwnerId] = otherMembers[0];
          console.log(`👑 Promozione ${newOwnerId} a owner`);

          updated.sharing.members[newOwnerId].role = 'owner';
          updated.sharing.members[userId].status = 'left';
          updated.sharing.memberIds = updated.sharing.memberIds.filter(id => id !== userId);

          if (!updated.history) updated.history = { removedMembers: [] };
          if (!updated.history.removedMembers) updated.history.removedMembers = [];
          updated.history.removedMembers.push(snapshotEntry);

          updated.updatedAt = new Date();

          transaction.set(tripRef, updated);
          console.log('✅ Member promosso a owner');
          return { action: 'left', newOwner: newOwnerId };
        } else {
          console.log('🗑️ Nessun altro membro, eliminazione viaggio...');

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

      updated.sharing.members[userId].status = 'left';
      updated.sharing.memberIds = updated.sharing.memberIds.filter(id => id !== userId);

      if (!updated.history) updated.history = { removedMembers: [] };
      if (!updated.history.removedMembers) updated.history.removedMembers = [];
      updated.history.removedMembers.push(snapshotEntry);

      updated.updatedAt = new Date();

      transaction.set(tripRef, updated);
      console.log('✅ Hai abbandonato il viaggio');
      return { action: 'left' };
    });
  } catch (error) {
    console.error('❌ Errore abbandono viaggio:', error);
    throw error;
  }
};

export const deleteTripForUser = async (userId, tripId) => {
  return leaveTrip(tripId, userId);
};

export const deleteTrip = async (userId, tripId) => {
  try {
    const role = await getUserRole(tripId, userId);
    if (role !== 'owner') {
      throw new Error('Solo il proprietario può eliminare il viaggio');
    }

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

// ============= FUNZIONI PER GESTIONE MEMBRI =============

export const addMemberToTrip = async (tripId, invitedUserId, invitedUserProfile, role, invitedBy) => {
  try {
    const inviterRole = await getUserRole(tripId, invitedBy);
    if (inviterRole !== 'owner') {
      throw new Error('Solo il proprietario può invitare altri utenti');
    }

    const tripRef = doc(db, 'trips', tripId.toString());

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

export const removeMemberFromTrip = async (tripId, memberIdToRemove, removedBy) => {
  try {
    const removerRole = await getUserRole(tripId, removedBy);
    if (removerRole !== 'owner') {
      throw new Error('Solo il proprietario può rimuovere membri');
    }

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

export const changeMemberRole = async (tripId, memberId, newRole, changedBy) => {
  try {
    const changerRole = await getUserRole(tripId, changedBy);
    if (changerRole !== 'owner') {
      throw new Error('Solo il proprietario può cambiare i ruoli');
    }

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

// ============= FUNZIONI PER INVITI (resto identico) =============

export const inviteMemberByUsername = async (tripId, invitedUserId, invitedUserProfile, role, invitedBy) => {
  try {
    const inviterRole = await getUserRole(tripId, invitedBy);
    if (inviterRole !== 'owner') {
      throw new Error('Solo il proprietario può invitare altri utenti');
    }

    const tripRef = doc(db, 'trips', tripId.toString());
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const trip = tripSnap.data();
    if (trip.sharing.memberIds.includes(invitedUserId)) {
      throw new Error('Questo utente è già membro del viaggio');
    }

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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

export const acceptInvitation = async (invitationId, tripId, userId, userProfile) => {
  try {
    const inviteRef = doc(db, 'trips', tripId.toString(), 'invitations', invitationId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('Invito non trovato');
    }

    const invite = inviteSnap.data();

    if (invite.invitedUserId !== userId) {
      throw new Error('Questo invito non è per te');
    }

    if (invite.status !== 'pending') {
      throw new Error('Questo invito non è più valido');
    }

    if (invite.expiresAt.toDate() < new Date()) {
      throw new Error('Questo invito è scaduto');
    }

    await addMemberToTrip(
      tripId,
      userId,
      userProfile,
      invite.role,
      invite.invitedBy
    );

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

export const rejectInvitation = async (invitationId, tripId, userId) => {
  try {
    const inviteRef = doc(db, 'trips', tripId.toString(), 'invitations', invitationId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('Invito non trovato');
    }

    const invite = inviteSnap.data();

    if (invite.invitedUserId !== userId) {
      throw new Error('Questo invito non è per te');
    }

    if (invite.status !== 'pending') {
      throw new Error('Questo invito non è più valido');
    }

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

export const loadPendingInvitations = async (userId) => {
  try {
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

export const generateShareLink = async (tripId, userId, role = 'viewer') => {
  try {
    const userRole = await getUserRole(tripId, userId);
    if (userRole !== 'owner') {
      throw new Error('Solo il proprietario può generare link di condivisione');
    }

    const token = `share_${tripId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const tripRef = doc(db, 'trips', tripId.toString());
    await updateDoc(tripRef, {
      'sharing.shareLink': {
        token,
        role,
        createdBy: userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

export const joinViaShareLink = async (token, userId, userProfile) => {
  try {
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

    if (trip.sharing.shareLink.expiresAt.toDate() < new Date()) {
      throw new Error('Questo link è scaduto');
    }

    if (trip.sharing.memberIds.includes(userId)) {
      throw new Error('Sei già membro di questo viaggio');
    }

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

    console.log(`✅ Link condivisione disattivato`);
  } catch (error) {
    console.error('❌ Errore disattivazione link:', error);
    throw error;
  }
};

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

    if (targetMember.role === 'owner') {
      throw new Error('Non puoi modificare il ruolo del proprietario');
    }

    if (newRole === 'owner') {
      throw new Error('Non puoi assegnare il ruolo di proprietario');
    }

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

export const removeMember = async (tripId, targetUserId) => {
  try {
    const tripRef = doc(db, 'trips', tripId.toString());

    return await runTransaction(db, async (transaction) => {
      const tripDoc = await transaction.get(tripRef);

      if (!tripDoc.exists()) {
        throw new Error('Viaggio non trovato');
      }

      const trip = tripDoc.data();
      const targetMember = trip.sharing?.members?.[targetUserId];

      if (!targetMember) {
        throw new Error('Membro non trovato');
      }

      if (targetMember.role === 'owner') {
        throw new Error('Non puoi rimuovere il proprietario');
      }

      console.log('📸 Calcolo snapshot spese...');
      const expenseSnapshot = calculateMemberExpenseSnapshot(trip, targetUserId);

      console.log('🧹 Pulizia breakdown...');
      const updated = applyBreakdownCleanup(trip, targetUserId);

      const snapshotEntry = {
        userId: targetUserId,
        displayName: targetMember.displayName,
        username: targetMember.username || null,
        avatar: targetMember.avatar || null,
        removedAt: new Date(),
        totalPaid: expenseSnapshot.totalPaid,
        byCategory: expenseSnapshot.byCategory
      };

      updated.sharing.members[targetUserId].status = 'removed';
      updated.sharing.members[targetUserId].removedAt = new Date();
      updated.sharing.memberIds = updated.sharing.memberIds.filter(id => id !== targetUserId);

      if (!updated.history) updated.history = { removedMembers: [] };
      if (!updated.history.removedMembers) updated.history.removedMembers = [];
      updated.history.removedMembers.push(snapshotEntry);

      updated.updatedAt = new Date();

      transaction.set(tripRef, updated);
      console.log(`✅ Membro rimosso con snapshot: ${targetUserId}`);
      return { action: 'removed' };
    });
  } catch (error) {
    console.error('❌ Errore rimozione membro:', error);
    throw error;
  }
};