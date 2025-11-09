/**
 * 📦 useDayData
 * 
 * @description Hook per gestione stato locale dei dati di un singolo giorno
 * @usage Usato da: DayDetailView
 * 
 * Funzionalità:
 * - Gestisce categoryData (tutte le categorie del giorno)
 * - Gestisce otherExpenses (spese aggiuntive)
 * - Auto-assegnazione costi all'utente corrente
 * - Sincronizzazione con Firebase in background
 * - Aggiunta automatica nuova spesa vuota
 */

import { useState, useEffect } from 'react';
import { CATEGORIES } from '../utils/constants';

export const useDayData = (trip, currentDay, onUpdateTrip, currentUserId) => {
  // ✅ Inizializza con dati validi
  const [categoryData, setCategoryData] = useState(() => {
    const data = {};
    CATEGORIES.forEach(cat => {
      const key = `${currentDay.id}-${cat.id}`;
      const cellData = trip.data[key] || {};
      
      data[cat.id] = {
        title: cellData.title || '',
        cost: cellData.cost || '',
        costBreakdown: cellData.costBreakdown || null,
        participants: cellData.participants || null,
        hasSplitCost: cellData.hasSplitCost || false,
        bookingStatus: cellData.bookingStatus || 'na',
        transportMode: cellData.transportMode || 'treno',
        links: cellData.links || [],
        images: cellData.images || [],
        videos: cellData.videos || [],
        mediaNotes: cellData.mediaNotes || [],
        notes: cellData.notes || ''
      };
    });
    return data;
  });

  const [otherExpenses, setOtherExpenses] = useState(() => {
    const key = `${currentDay.id}-otherExpenses`;
    const expenses = trip.data[key] || [{ id: 1, title: '', cost: '' }];
    
    return expenses.map(exp => ({
      id: exp.id,
      title: exp.title || '',
      cost: exp.cost || '',
      costBreakdown: exp.costBreakdown || null,
      participants: exp.participants || null,
      hasSplitCost: exp.hasSplitCost || false
    }));
  });

  // ✅ SOLO quando cambia il giorno (non trip.data!)
  useEffect(() => {
    const data = {};
    
    CATEGORIES.forEach(cat => {
      const key = `${currentDay.id}-${cat.id}`;
      const cellData = trip.data[key] || {};
      
      data[cat.id] = {
        title: cellData.title || '',
        cost: cellData.cost || '',
        costBreakdown: cellData.costBreakdown || null,
        participants: cellData.participants || null,
        hasSplitCost: cellData.hasSplitCost || false,
        bookingStatus: cellData.bookingStatus || 'na',
        transportMode: cellData.transportMode || 'treno',
        links: cellData.links || [],
        images: cellData.images || [],
        videos: cellData.videos || [],
        mediaNotes: cellData.mediaNotes || [],
        notes: cellData.notes || ''
      };
    });
    
    setCategoryData(data);
  }, [currentDay.id]);

  useEffect(() => {
    const key = `${currentDay.id}-otherExpenses`;
    const expenses = trip.data[key] || [{ id: 1, title: '', cost: '' }];
    
    const expensesWithBreakdown = expenses.map(exp => ({
      id: exp.id,
      title: exp.title || '',
      cost: exp.cost || '',
      costBreakdown: exp.costBreakdown || null,
      participants: exp.participants || null,
      hasSplitCost: exp.hasSplitCost || false
    }));
    
    setOtherExpenses(expensesWithBreakdown);
  }, [currentDay.id]);

  // Aggiungi automaticamente una nuova spesa vuota quando l'ultima viene compilata
  useEffect(() => {
    const lastExpense = otherExpenses[otherExpenses.length - 1];
    
    if (lastExpense && (lastExpense.title.trim() !== '' || lastExpense.cost.trim() !== '')) {
      const hasEmptyExpense = otherExpenses.some(exp => 
        exp.title.trim() === '' && exp.cost.trim() === ''
      );
      
      if (!hasEmptyExpense) {
        addOtherExpense();
      }
    }
  }, [otherExpenses]);

  // Helper per ottenere partecipanti di default
  const getDefaultParticipants = () => {
    return Object.keys(trip.sharing.members)
      .filter(uid => trip.sharing.members[uid].status === 'active');
  };

  // ✅ Update categoria - aggiorna stato locale E Firebase
  const updateCategory = (catId, field, value) => {
    const key = `${currentDay.id}-${catId}`;
    const currentData = trip.data[key] || {};
    
    let updatedCellData = {
      ...currentData,
      [field]: value
    };

    // AUTO-ASSEGNAZIONE: Quando si modifica 'cost', crea/aggiorna breakdown
    if (field === 'cost' && value !== undefined) {
      const amount = parseFloat(value) || 0;
      
      if (amount > 0) {
        updatedCellData.costBreakdown = [
          { userId: currentUserId, amount: amount }
        ];
        updatedCellData.participants = getDefaultParticipants();
        updatedCellData.hasSplitCost = false;
        console.log('✅ [updateCategory] Breakdown creato:', updatedCellData.costBreakdown);
      } else {
        updatedCellData.costBreakdown = null;
        updatedCellData.participants = null;
        updatedCellData.hasSplitCost = false;
        updatedCellData.cost = '';
      }
    }

    // Ricalcola hasSplitCost e totale quando si aggiorna costBreakdown
    if (field === 'costBreakdown') {
      if (Array.isArray(value) && value.length > 0) {
        updatedCellData.hasSplitCost = value.length > 1;
        const total = value.reduce((sum, entry) => sum + entry.amount, 0);
        updatedCellData.cost = total.toString();
        if (!updatedCellData.participants) {
          updatedCellData.participants = getDefaultParticipants();
        }
      } else {
        updatedCellData.costBreakdown = null;
        updatedCellData.participants = null;
        updatedCellData.hasSplitCost = false;
      }
    }

    // CRITICAL FIX: Aggiorna stato locale CON TUTTI I CAMPI
    setCategoryData(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        ...updatedCellData
      }
    }));

    console.log('💾 [updateCategory] Stato locale aggiornato:', catId, updatedCellData);
    
    const updatedData = {
      ...trip.data,
      [key]: updatedCellData
    };
    
    // Salva su Firebase in background (non blocca UI)
    onUpdateTrip({ ...trip, data: updatedData });
  };

  const updateOtherExpense = (expenseId, field, value) => {
    const key = `${currentDay.id}-otherExpenses`;
    
    const updated = otherExpenses.map(exp => {
      if (exp.id !== expenseId) return exp;
      
      let updatedExpense = {
        ...exp,
        [field]: value
      };

      // AUTO-ASSEGNAZIONE: Quando si modifica 'cost', crea/aggiorna breakdown
      if (field === 'cost' && value !== undefined) {
        const amount = parseFloat(value) || 0;
        
        if (amount > 0) {
          updatedExpense.costBreakdown = [
            { userId: currentUserId, amount: amount }
          ];
          updatedExpense.participants = getDefaultParticipants();
          updatedExpense.hasSplitCost = false;
          console.log('✅ [updateOtherExpense] Breakdown creato:', updatedExpense.costBreakdown);
        } else {
          updatedExpense.costBreakdown = null;
          updatedExpense.participants = null;
          updatedExpense.hasSplitCost = false;
          updatedExpense.cost = '';
        }
      }

      // Ricalcola quando si aggiorna costBreakdown
      if (field === 'costBreakdown') {
        if (Array.isArray(value) && value.length > 0) {
          updatedExpense.hasSplitCost = value.length > 1;
          const total = value.reduce((sum, entry) => sum + entry.amount, 0);
          updatedExpense.cost = total.toString();
          if (!updatedExpense.participants) {
            updatedExpense.participants = getDefaultParticipants();
          }
        } else {
          updatedExpense.costBreakdown = null;
          updatedExpense.participants = null;
          updatedExpense.hasSplitCost = false;
        }
      }
      
      return updatedExpense;
    });
    
    // IMPORTANTE: Aggiorna stato locale PRIMA
    setOtherExpenses(updated);
    
    console.log('💾 [updateOtherExpense] Stato locale aggiornato:', updated.find(e => e.id === expenseId));
    
    // Poi aggiorna Firebase
    const updatedData = {
      ...trip.data,
      [key]: updated
    };
    
    onUpdateTrip({
      ...trip,
      data: updatedData
    });
  };

  const removeOtherExpense = (expenseId) => {
    const key = `${currentDay.id}-otherExpenses`;
    
    let updated;
    
    if (otherExpenses.length === 1) {
      updated = [{ id: Date.now(), title: '', cost: '', costBreakdown: null, participants: null, hasSplitCost: false }];
    } else {
      updated = otherExpenses.filter(exp => exp.id !== expenseId);
    }
    
    setOtherExpenses(updated);
    
    const updatedData = {
      ...trip.data,
      [key]: updated
    };
    
    onUpdateTrip({
      ...trip,
      data: updatedData
    });
  };

  // Aggiungi nuova spesa
  const addOtherExpense = () => {
    const key = `${currentDay.id}-otherExpenses`;
    
    const newExpense = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: '',
      cost: '',
      costBreakdown: null,
      participants: null,
      hasSplitCost: false
    };
    
    const updated = [...otherExpenses, newExpense];
    
    setOtherExpenses(updated);
    
    const updatedData = {
      ...trip.data,
      [key]: updated
    };
    
    onUpdateTrip({
      ...trip,
      data: updatedData
    });
    
    console.log('✅ Nuova spesa aggiunta:', newExpense.id);
  };

  return {
    categoryData,
    otherExpenses,
    updateCategory,
    updateOtherExpense,
    removeOtherExpense,
    addOtherExpense
  };
};