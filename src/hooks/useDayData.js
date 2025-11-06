import { useState, useEffect } from 'react';
import { CATEGORIES } from '../constants';

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
  }, [currentDay.id]); // ⭐ SOLO currentDay.id, NON trip.data

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
  }, [currentDay.id]); // ⭐ SOLO currentDay.id, NON trip.data

  // ✅ Update categoria - aggiorna stato locale E Firebase
  const updateCategory = (catId, field, value) => {
    // 🆕 Aggiorna PRIMA lo stato locale per UI reattiva
    setCategoryData(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [field]: value
      }
    }));

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
        updatedCellData.hasSplitCost = false;
      } else {
        updatedCellData.costBreakdown = null;
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
      } else {
        updatedCellData.costBreakdown = null;
        updatedCellData.hasSplitCost = false;
      }
    }
    
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
    
    // Aggiorna stato locale
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

  const removeOtherExpense = (expenseId) => {
    const key = `${currentDay.id}-otherExpenses`;
    
    let updated;
    
    if (otherExpenses.length === 1) {
      updated = [{ id: Date.now(), title: '', cost: '', costBreakdown: null, hasSplitCost: false }];
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

  // 🆕 Aggiungi nuova spesa
  const addOtherExpense = () => {
    const key = `${currentDay.id}-otherExpenses`;
    
    const newExpense = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: '',
      cost: '',
      costBreakdown: null,
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