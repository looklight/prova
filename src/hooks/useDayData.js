import { useState, useEffect } from 'react';
import { CATEGORIES } from '../constants';

export const useDayData = (trip, currentDay, onUpdateTrip, currentUserId) => {
  // 🆕 CORRETTO: Inizializza subito con dati validi
  const [categoryData, setCategoryData] = useState(() => {
    const data = {};
    CATEGORIES.forEach(cat => {
      const key = `${currentDay.id}-${cat.id}`;
      const cellData = trip.data[key] || {};
      
      data[cat.id] = {
        title: cellData.title || '',
        cost: cellData.cost || '',
        costBreakdown: cellData.costBreakdown || null,
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
      hasSplitCost: exp.hasSplitCost || false
    }));
  });

  // Aggiorna quando cambia currentDay
  useEffect(() => {
    const data = {};
    
    CATEGORIES.forEach(cat => {
      const key = `${currentDay.id}-${cat.id}`;
      const cellData = trip.data[key] || {};
      
      data[cat.id] = {
        title: cellData.title || '',
        cost: cellData.cost || '',
        costBreakdown: cellData.costBreakdown || null,
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
  }, [currentDay.id, trip.data]);

  useEffect(() => {
    const key = `${currentDay.id}-otherExpenses`;
    const expenses = trip.data[key] || [{ id: 1, title: '', cost: '' }];
    
    const expensesWithBreakdown = expenses.map(exp => ({
      id: exp.id,
      title: exp.title || '',
      cost: exp.cost || '',
      costBreakdown: exp.costBreakdown || null,
      hasSplitCost: exp.hasSplitCost || false
    }));
    
    setOtherExpenses(expensesWithBreakdown);
  }, [currentDay.id, trip.data]);

  // 🆕 AGGIORNATO: Update categoria con auto-assegnazione
  const updateCategory = (catId, field, value) => {
    const key = `${currentDay.id}-${catId}`;
    const currentData = trip.data[key] || {};
    
    let updatedCellData = {
      ...currentData,
      [field]: value
    };

    // 🆕 AUTO-ASSEGNAZIONE: Quando si modifica 'cost', crea/aggiorna breakdown
    if (field === 'cost' && value !== undefined) {
      const amount = parseFloat(value) || 0;
      
      if (amount > 0) {
        // Crea breakdown automaticamente associato all'utente corrente
        updatedCellData.costBreakdown = [
          { userId: currentUserId, amount: amount }
        ];
        updatedCellData.hasSplitCost = false; // Solo 1 utente
      } else {
        // Se costo = 0 o vuoto, rimuovi breakdown
        updatedCellData.costBreakdown = null;
        updatedCellData.hasSplitCost = false;
        updatedCellData.cost = '';
      }
    }

    // 🆕 Ricalcola hasSplitCost e totale quando si aggiorna costBreakdown
    if (field === 'costBreakdown') {
      if (Array.isArray(value) && value.length > 0) {
        updatedCellData.hasSplitCost = value.length > 1;
        
        // Ricalcola totale
        const total = value.reduce((sum, entry) => sum + entry.amount, 0);
        updatedCellData.cost = total.toString();
      } else {
        // Se breakdown viene cancellato
        updatedCellData.costBreakdown = null;
        updatedCellData.hasSplitCost = false;
      }
    }
    
    const updatedData = {
      ...trip.data,
      [key]: updatedCellData
    };
    
    onUpdateTrip({ ...trip, data: updatedData });
  };

  const updateOtherExpense = (expenseId, field, value) => {
    const key = `${currentDay.id}-otherExpenses`;
    
    // 🆕 Ottieni expenses dallo stato locale, non da trip
    const currentExpenses = [...otherExpenses];
    
    const updated = currentExpenses.map(exp => {
      if (exp.id !== expenseId) return exp;
      
      let updatedExpense = {
        ...exp,
        [field]: value
      };

      if (field === 'cost' && value !== undefined) {
        const amount = parseFloat(value) || 0;
        
        if (amount > 0) {
          updatedExpense.costBreakdown = [
            { userId: currentUserId, amount: amount }
          ];
          updatedExpense.hasSplitCost = false;
        } else {
          updatedExpense.costBreakdown = null;
          updatedExpense.hasSplitCost = false;
          updatedExpense.cost = '';
        }
      }

      if (field === 'costBreakdown') {
        if (Array.isArray(value) && value.length > 0) {
          updatedExpense.hasSplitCost = value.length > 1;
          const total = value.reduce((sum, entry) => sum + entry.amount, 0);
          updatedExpense.cost = total.toString();
        } else {
          updatedExpense.costBreakdown = null;
          updatedExpense.hasSplitCost = false;
        }
      }
      
      return updatedExpense;
    });
    
    // 🆕 Aggiorna subito lo stato locale
    setOtherExpenses(updated);
    
    // 🆕 Aggiorna Firebase con i dati corretti
    const updatedData = {
      ...trip.data,
      [key]: updated
    };
    
    onUpdateTrip({
      ...trip,
      data: updatedData
    });
  };

  // 🆕 FIX: removeOtherExpense con stato locale
  const removeOtherExpense = (expenseId) => {
    const key = `${currentDay.id}-otherExpenses`;
    const currentExpenses = [...otherExpenses];
    
    let updated;
    
    if (currentExpenses.length === 1) {
      // Se è l'unica spesa, resettala invece di rimuoverla
      updated = [{ id: Date.now(), title: '', cost: '', costBreakdown: null, hasSplitCost: false }];
    } else {
      // Rimuovi la spesa
      updated = currentExpenses.filter(exp => exp.id !== expenseId);
    }
    
    // Aggiorna lo stato locale
    setOtherExpenses(updated);
    
    // Aggiorna Firebase
    const updatedData = {
      ...trip.data,
      [key]: updated
    };
    
    onUpdateTrip({
      ...trip,
      data: updatedData
    });
  };

  return {
    categoryData,
    otherExpenses,
    updateCategory,
    updateOtherExpense,
    removeOtherExpense
  };
};