// services/invites/linkInvites.js
import { db } from '../../firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { createLinkInviteAcceptedNotification } from '../notifications/inviteNotifications';
import { trackInviteLinkGenerated, trackInvitationAccepted } from '../analyticsService';

/**
 * Genera un token univoco per il link invito
 */
const generateToken = () => {
  // Genera token casuale (16 caratteri)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Genera link invito per un viaggio
 * Invalida eventuali link precedenti attivi
 */
export const generateInviteLink = async (tripId, userId) => {
  try {
    // Carica info viaggio
    const tripRef = doc(db, 'trips', String(tripId));
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Viaggio non trovato');
    }

    const trip = tripSnap.data();

    // Verifica che l'utente sia owner
    const userInfo = trip.sharing?.members?.[userId];
    if (!userInfo || userInfo.role !== 'owner') {
      throw new Error('Solo il proprietario può generare link invito');
    }

    // Invalida link precedenti per questo viaggio
    const invitesRef = collection(db, 'invites');
    const oldLinksQuery = query(
      invitesRef,
      where('tripId', '==', String(tripId)),
      where('status', '==', 'active')
    );
    const oldLinksSnap = await getDocs(oldLinksQuery);

    const batch = [];
    oldLinksSnap.forEach(docSnap => {
      batch.push(updateDoc(docSnap.ref, { status: 'expired' }));
    });
    await Promise.all(batch);

    console.log(`🔗 Invalidati ${batch.length} link precedenti`);

    // Genera nuovo token
    const token = generateToken();
    const inviteRef = doc(db, 'invites', token);

    // Crea invito
    const inviteData = {
      token,
      tripId: String(tripId),
      tripName: trip.metadata?.name || trip.name || 'Viaggio',
      tripImage: trip.metadata?.image || trip.image || null,
      invitedBy: userId,
      invitedByName: userInfo.displayName || 'Owner',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 giorni
      status: 'active',
      usedBy: []
    };

    await setDoc(inviteRef, inviteData);

    // 📊 Track generazione link
    trackInviteLinkGenerated(tripId);

    console.log('✅ Link invito generato:', token);
    return token;
  } catch (error) {
    console.error('❌ Errore generazione link:', error);
    throw error;
  }
};

/**
 * Valida un token invito e restituisce i dettagli
 */
export const getInviteDetails = async (token) => {
  try {
    const inviteRef = doc(db, 'invites', token);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('Link invito non valido');
    }

    const invite = inviteSnap.data();

    // Converti timestamp
    const expiresAt = invite.expiresAt?.toDate?.() ?? new Date(invite.expiresAt);
    const createdAt = invite.createdAt?.toDate?.() ?? new Date(invite.createdAt);

    // Verifica scadenza
    if (expiresAt < new Date() || invite.status !== 'active') {
      throw new Error('Link invito scaduto');
    }

    return {
      ...invite,
      expiresAt,
      createdAt
    };
  } catch (error) {
    console.error('❌ Errore validazione link:', error);
    throw error;
  }
};

/**
 * Accetta invito tramite link
 * Aggiunge l'utente come member al viaggio
 */
export const acceptInviteLink = async (token, userId, userProfile) => {
  try {
    console.log('🔍 STEP 1: Validazione token...');
    // Valida token
    const invite = await getInviteDetails(token);
    console.log('✅ STEP 1: Token valido', invite);

    console.log('🔍 STEP 2: Verifica se utente già membro...');
    const tripRef = doc(db, 'trips', invite.tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      // Viaggio eliminato, rimuovi invito orfano
      console.log('🗑️ Viaggio non trovato, elimino invito orfano...');
      const inviteRef = doc(db, 'invites', token);
      await deleteDoc(inviteRef);
      throw new Error('Questo viaggio non esiste più');
    }

    const trip = tripSnap.data();

    // ⭐ CONTROLLO CRITICO: Verifica se utente già membro
    if (trip.sharing?.memberIds?.includes(userId)) {
      const memberInfo = trip.sharing.members?.[userId];

      if (memberInfo?.role === 'owner') {
        throw new Error('Sei già il proprietario di questo viaggio');
      }

      if (memberInfo?.status === 'active') {
        throw new Error('Sei già membro di questo viaggio');
      }

      // Se status è "removed", può ri-entrare
      console.log('ℹ️ Utente era membro rimosso, può rientrare');
    }

    console.log('✅ STEP 2: Utente non è membro, può entrare');

    console.log('🔍 STEP 3: Preparazione update...');
    const updateData = {
      'sharing.memberIds': arrayUnion(userId),
      [`sharing.members.${userId}`]: {
        role: 'member',
        status: 'active',
        addedAt: new Date(),
        addedBy: invite.invitedBy,
        joinedVia: 'link',
        displayName: userProfile.displayName || 'Utente',
        username: userProfile.username || null,
        avatar: userProfile.avatar || null
      },
      'updatedAt': new Date()
    };

    console.log('✅ STEP 3: Dati preparati');
    console.log('🔍 STEP 4: Esecuzione updateDoc...');

    await updateDoc(tripRef, updateData);
    console.log('✅ STEP 4: Update completato!');

    // Aggiorna invito (tracking utilizzo + dettagli)
    console.log('🔍 STEP 5: Aggiornamento tracking invito...');
    const inviteRef = doc(db, 'invites', token);
    await updateDoc(inviteRef, {
      usedBy: arrayUnion(userId),
      [`usageDetails.${userId}`]: {
        acceptedAt: new Date(),
        displayName: userProfile.displayName || 'Utente',
        avatar: userProfile.avatar || null,
        username: userProfile.username || null
      }
    });

    console.log('✅ STEP 5: Tracking completato!');

    // Crea notifica per owner
    console.log('🔍 STEP 6: Creazione notifica per owner...');
    await createLinkInviteAcceptedNotification(
      invite.invitedBy,
      invite.tripId,
      invite.tripName,
      userProfile
    );
    console.log('✅ STEP 6: Notifica creata!');
    console.log(`✅ Invito accettato tramite link: ${userProfile.username || userProfile.displayName}`);

    // 📊 Track accettazione invito
    const newMemberCount = Object.keys(trip.sharing?.members || {}).length + 1;
    trackInvitationAccepted(invite.tripId, invite.tripName, 'link', newMemberCount);

    return {
      tripId: invite.tripId,
      tripName: invite.tripName
    };
  } catch (error) {
    console.error('❌ Errore accettazione invito:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    throw error;
  }
};

/**
 * Ottieni link attivo per un viaggio (se esiste)
 */
export const getActiveInviteLink = async (tripId) => {
  try {
    const invitesRef = collection(db, 'invites');
    const q = query(
      invitesRef,
      where('tripId', '==', String(tripId)),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Prendi il primo (dovrebbe essercene solo uno)
    const invite = snapshot.docs[0].data();
    const expiresAt = invite.expiresAt?.toDate?.() ?? new Date(invite.expiresAt);

    // Verifica scadenza
    if (expiresAt < new Date()) {
      // Invalida se scaduto
      await updateDoc(snapshot.docs[0].ref, { status: 'expired' });
      return null;
    }

    return {
      ...invite,
      expiresAt,
      createdAt: invite.createdAt?.toDate?.() ?? new Date(invite.createdAt)
    };
  } catch (error) {
    console.error('❌ Errore caricamento link attivo:', error);
    return null;
  }
};

/**
 * Invalida manualmente un link invito
 */
export const invalidateInviteLink = async (token) => {
  try {
    const inviteRef = doc(db, 'invites', token);
    await updateDoc(inviteRef, {
      status: 'expired'
    });
    console.log('🗑️ Link invito invalidato:', token);
  } catch (error) {
    console.error('❌ Errore invalidazione link:', error);
    throw error;
  }
};

/**
 * 📊 Ottieni statistiche utilizzo link invito
 * @param {string} token - Token del link
 * @returns {Object} - { totalUses, users: [...] }
 */
export const getInviteLinkStats = async (token) => {
  try {
    const inviteRef = doc(db, 'invites', token);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return null;
    }

    const invite = inviteSnap.data();
    const usedBy = invite.usedBy || [];
    const usageDetails = invite.usageDetails || {};

    // Costruisci array con dettagli utenti
    const users = usedBy.map(userId => {
      const details = usageDetails[userId] || {};
      return {
        userId,
        displayName: details.displayName || 'Utente',
        avatar: details.avatar || null,
        username: details.username || null,
        acceptedAt: details.acceptedAt?.toDate() || null
      };
    }).sort((a, b) => {
      // Ordina per data decrescente (più recenti prima)
      if (!a.acceptedAt) return 1;
      if (!b.acceptedAt) return -1;
      return b.acceptedAt - a.acceptedAt;
    });

    return {
      totalUses: usedBy.length,
      users
    };
  } catch (error) {
    console.error('❌ Errore caricamento statistiche:', error);
    return null;
  }
};