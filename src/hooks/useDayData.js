/**
 * 📦 useDayData - ALTROVE VERSION
 *
 * @description Hook per gestione stato locale dei dati di un singolo giorno
 * @usage Usato da: DayDetailView
 *
 * STRUTTURA DATI ALTROVE:
 * - destinazione: { title } - stringa con destinazioni separate da " → "
 * - attivita: { activities: Activity[] } - array di attività
 * - pernottamento: { title, bookingStatus, cost, ... } - singolo oggetto
 * - note: { notes } - testo libero
 *
 * Funzionalità:
 * - Gestisce categoryData (destinazione, attivita, pernottamento, note)
 * - Auto-assegnazione costi all'utente corrente
 * - Sincronizzazione con Firebase in background
 * - Supporto array attività multiple
 */

import { useState, useEffect, useRef } from 'react';

// Nuove categorie Altrove
const ALTROVE_CATEGORIES = ['destinazione', 'attivita', 'pernottamento', 'note'];

// Struttura vuota per una singola attività
const createEmptyActivity = (id) => ({
  id: id || `activity-${Date.now()}`,
  title: '',
  type: 'generic',
  bookingStatus: 'na',
  startTime: null,
  endTime: null,
  cost: '',
  costBreakdown: null,
  participants: null,
  participantsUpdatedAt: null,
  hasSplitCost: false,
  location: null,
  links: [],
  images: [],
  videos: [],
  mediaNotes: [],
  showInCalendar: true
});

// Struttura vuota per pernottamento
const createEmptyAccommodation = () => ({
  title: '',
  bookingStatus: 'na',
  cost: '',
  costBreakdown: null,
  participants: null,
  participantsUpdatedAt: null,
  hasSplitCost: false,
  location: null,
  startTime: '',  // Check-in (unificato)
  endTime: '',    // Check-out (unificato)
  links: [],
  images: [],
  videos: [],
  mediaNotes: []
});

// Helper per normalizzare activities (assicura che sia array)
const normalizeActivities = (activities) => {
  if (!activities) return [];
  if (Array.isArray(activities)) return activities;
  return [];
};

export const useDayData = (trip, currentDay, onUpdateTrip, currentUserId) => {
  // ============================================
  // STATE INITIALIZATION
  // ============================================

  const [categoryData, setCategoryData] = useState(() => {
    const data = {};

    // Destinazione
    const destKey = `${currentDay.id}-destinazione`;
    const destData = trip.data[destKey] || {};
    data.destinazione = {
      title: destData.title || ''
    };

    // Attività (array)
    const actKey = `${currentDay.id}-attivita`;
    const actData = trip.data[actKey] || {};
    data.attivita = {
      activities: normalizeActivities(actData.activities)
    };

    // Pernottamento
    const accKey = `${currentDay.id}-pernottamento`;
    const accData = trip.data[accKey] || {};
    data.pernottamento = {
      title: accData.title || '',
      bookingStatus: accData.bookingStatus || 'na',
      cost: accData.cost || '',
      costBreakdown: accData.costBreakdown || null,
      participants: accData.participants || null,
      participantsUpdatedAt: accData.participantsUpdatedAt || null,
      hasSplitCost: accData.hasSplitCost || false,
      location: accData.location || null,
      startTime: accData.startTime || '',
      endTime: accData.endTime || '',
      links: accData.links || [],
      images: accData.images || [],
      videos: accData.videos || [],
      mediaNotes: accData.mediaNotes || []
    };

    // Note
    const noteKey = `${currentDay.id}-note`;
    const noteData = trip.data[noteKey] || {};
    data.note = {
      notes: noteData.notes || ''
    };

    return data;
  });

  // Ref per evitare loop quando aggiorni TU stesso
  const isLocalUpdateRef = useRef(false);

  // ============================================
  // SYNC EFFECTS
  // ============================================

  // Sincronizza categoryData quando trip.data cambia
  useEffect(() => {
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }

    console.log('🔄 [useDayData] Sync categoryData da trip.data');

    const data = {};

    // Destinazione
    const destKey = `${currentDay.id}-destinazione`;
    const destData = trip.data[destKey] || {};
    data.destinazione = {
      title: destData.title || ''
    };

    // Attività
    const actKey = `${currentDay.id}-attivita`;
    const actData = trip.data[actKey] || {};
    data.attivita = {
      activities: normalizeActivities(actData.activities)
    };

    // Pernottamento
    const accKey = `${currentDay.id}-pernottamento`;
    const accData = trip.data[accKey] || {};
    data.pernottamento = {
      title: accData.title || '',
      bookingStatus: accData.bookingStatus || 'na',
      cost: accData.cost || '',
      costBreakdown: accData.costBreakdown || null,
      participants: accData.participants || null,
      participantsUpdatedAt: accData.participantsUpdatedAt || null,
      hasSplitCost: accData.hasSplitCost || false,
      location: accData.location || null,
      startTime: accData.startTime || '',
      endTime: accData.endTime || '',
      links: accData.links || [],
      images: accData.images || [],
      videos: accData.videos || [],
      mediaNotes: accData.mediaNotes || []
    };

    // Note
    const noteKey = `${currentDay.id}-note`;
    const noteData = trip.data[noteKey] || {};
    data.note = {
      notes: noteData.notes || ''
    };

    setCategoryData(data);
  }, [currentDay.id, trip.data]);

  // ============================================
  // HELPERS
  // ============================================

  const getDefaultParticipants = () => {
    if (!trip.sharing?.members) return [currentUserId];
    return Object.keys(trip.sharing.members)
      .filter(uid => trip.sharing.members[uid].status === 'active');
  };

  // Helper per gestire auto-assegnazione costi
  const handleCostUpdate = (currentData, value, currentUserId) => {
    const amount = parseFloat(value) || 0;
    let result = { cost: value };

    if (amount > 0) {
      const hasValidBreakdown = currentData.costBreakdown &&
        Array.isArray(currentData.costBreakdown) &&
        currentData.costBreakdown.length > 0 &&
        currentData.costBreakdown.some(e => e.amount > 0);

      if (!hasValidBreakdown) {
        // Prima assegnazione
        result.costBreakdown = [{ userId: currentUserId, amount }];
        result.participants = getDefaultParticipants();
        result.participantsUpdatedAt = new Date();
        result.hasSplitCost = false;
      } else {
        const oldTotal = currentData.costBreakdown.reduce((sum, e) => sum + e.amount, 0);
        if (Math.abs(amount - oldTotal) > 0.01) {
          const ratio = amount / oldTotal;
          result.costBreakdown = currentData.costBreakdown.map(entry => ({
            ...entry,
            amount: Math.round(entry.amount * ratio * 100) / 100
          }));
        }
      }
    } else {
      // Reset costi
      result.cost = '';
      result.costBreakdown = null;
      result.participants = null;
      result.participantsUpdatedAt = null;
      result.hasSplitCost = false;
    }

    return result;
  };

  // ============================================
  // UPDATE FUNCTIONS
  // ============================================

  /**
   * Aggiorna un campo di una categoria
   * Per attività, usa updateActivities() invece
   */
  const updateCategory = (catId, field, value) => {
    const key = `${currentDay.id}-${catId}`;
    const currentData = trip.data[key] || {};

    let updatedCellData = {
      ...currentData,
      [field]: value
    };

    // Gestione speciale per costBreakdown
    if (field === 'costBreakdown') {
      if (Array.isArray(value) && value.length > 0) {
        updatedCellData.hasSplitCost = value.length > 1;
        const total = value.reduce((sum, entry) => sum + entry.amount, 0);
        updatedCellData.cost = total.toString();
        updatedCellData.costBreakdown = value;
        console.log('✅ [updateCategory] Breakdown aggiornato');
      } else {
        updatedCellData.costBreakdown = null;
        updatedCellData.participants = null;
        updatedCellData.participantsUpdatedAt = null;
        updatedCellData.hasSplitCost = false;
        updatedCellData.cost = '';
        console.log('🧹 [updateCategory] Reset costi');
      }
    }
    // Gestione participants
    else if (field === 'participants') {
      updatedCellData.participants = value;
      updatedCellData.participantsUpdatedAt = new Date();
    }
    // Gestione cost con auto-assegnazione
    else if (field === 'cost' && catId !== 'attivita') {
      const costUpdates = handleCostUpdate(currentData, value, currentUserId);
      updatedCellData = { ...updatedCellData, ...costUpdates };
    }

    // Marca come update locale
    isLocalUpdateRef.current = true;

    // Aggiorna stato locale
    setCategoryData(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        ...updatedCellData
      }
    }));

    console.log('💾 [updateCategory]', catId, field);

    // Salva su Firebase
    const updatedData = {
      ...trip.data,
      [key]: updatedCellData
    };

    onUpdateTrip({ ...trip, data: updatedData });
  };

  /**
   * Aggiorna più campi di una categoria atomicamente
   */
  const updateCategoryMultiple = (catId, fieldsObject) => {
    const key = `${currentDay.id}-${catId}`;
    const currentData = trip.data[key] || {};

    const updatedCellData = {
      ...currentData,
      ...fieldsObject
    };

    isLocalUpdateRef.current = true;

    setCategoryData(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        ...updatedCellData
      }
    }));

    console.log('💾 [updateCategoryMultiple]', catId, Object.keys(fieldsObject));

    const updatedData = {
      ...trip.data,
      [key]: updatedCellData
    };

    onUpdateTrip({ ...trip, data: updatedData });
  };

  /**
   * 🆕 Aggiorna l'intero array di attività
   */
  const updateActivities = (activities) => {
    const key = `${currentDay.id}-attivita`;

    isLocalUpdateRef.current = true;

    setCategoryData(prev => ({
      ...prev,
      attivita: {
        ...prev.attivita,
        activities
      }
    }));

    console.log('💾 [updateActivities] Aggiornate', activities.length, 'attività');

    const updatedData = {
      ...trip.data,
      [key]: { activities }
    };

    onUpdateTrip({ ...trip, data: updatedData });
  };

  /**
   * 🆕 Aggiorna una singola attività nell'array
   */
  const updateActivity = (activityId, updates) => {
    const currentActivities = categoryData.attivita?.activities || [];
    
    const updatedActivities = currentActivities.map(act => {
      if (act.id !== activityId) return act;

      let updatedAct = { ...act, ...updates };

      // Gestione cost con auto-assegnazione
      if ('cost' in updates) {
        const costUpdates = handleCostUpdate(act, updates.cost, currentUserId);
        updatedAct = { ...updatedAct, ...costUpdates };
      }

      return updatedAct;
    });

    updateActivities(updatedActivities);
  };

  /**
   * 🆕 Aggiungi nuova attività
   */
  const addActivity = () => {
    const currentActivities = categoryData.attivita?.activities || [];
    const newActivity = createEmptyActivity();
    
    // Auto-mostra nel calendario se meno di 3
    newActivity.showInCalendar = currentActivities.filter(a => a.showInCalendar).length < 3;

    updateActivities([...currentActivities, newActivity]);
    
    return newActivity.id;
  };

  /**
   * 🆕 Rimuovi attività
   */
  const removeActivity = (activityId) => {
    const currentActivities = categoryData.attivita?.activities || [];
    updateActivities(currentActivities.filter(act => act.id !== activityId));
  };

  /**
   * Riordina attività
   */
  const reorderActivities = (fromIndex, toIndex) => {
    const currentActivities = [...(categoryData.attivita?.activities || [])];
    const [removed] = currentActivities.splice(fromIndex, 1);
    currentActivities.splice(toIndex, 0, removed);
    updateActivities(currentActivities);
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // Dati
    categoryData,

    // Update categoria generici
    updateCategory,
    updateCategoryMultiple,

    // Attività specifiche
    updateActivities,
    updateActivity,
    addActivity,
    removeActivity,
    reorderActivities,

    // Helpers
    createEmptyActivity,
    createEmptyAccommodation
  };
};