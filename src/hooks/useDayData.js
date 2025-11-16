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
 * - ✅ SYNC OTTIMIZZATA: Aggiorna UI quando trip.data cambia (es. da breakdown modal)
 * - ✅ RESET CHIRURGICO: Breakdown vuoto resetta solo costi, non title/media
 */

import { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '../utils/constants';

// 🔧 Helper per normalizzare otherExpenses (oggetto o array → array)
const normalizeExpenses = (expenses) => {
  if (!expenses) return [{ id: 1, title: '', cost: '' }];
  
  // Se è già un array, usalo
  if (Array.isArray(expenses)) return expenses;
  
  // Se è un oggetto, converti in array (rimuovi chiavi non-numeriche)
  const entries = Object.entries(expenses)
    .filter(([key]) => !isNaN(parseInt(key))) // Solo chiavi numeriche
    .map(([_, value]) => value);
  
  return entries.length > 0 ? entries : [{ id: 1, title: '', cost: '' }];
};

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
    const expensesRaw = trip.data[key];
    const expenses = normalizeExpenses(expensesRaw); // 🔧 Normalizza
    
    return expenses.map(exp => ({
      id: exp.id,
      title: exp.title || '',
      cost: exp.cost || '',
      costBreakdown: exp.costBreakdown || null,
      participants: exp.participants || null,
      hasSplitCost: exp.hasSplitCost || false
    }));
  });

  // Ref per evitare loop quando aggiorni TU stesso
  const isLocalUpdateRef = useRef(false);

  // ✅ Sincronizza categoryData quando trip.data cambia (es. da breakdown modal)
  useEffect(() => {
    // Salta se l'update viene da questo stesso hook (evita loop)
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }

    console.log('🔄 [useDayData] Sync categoryData da trip.data');
    
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
  }, [currentDay.id, trip.data]);

  // ✅ Sincronizza otherExpenses quando trip.data cambia
  useEffect(() => {
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }

    console.log('🔄 [useDayData] Sync otherExpenses da trip.data');
    
    const key = `${currentDay.id}-otherExpenses`;
    const expensesRaw = trip.data[key];
    const expenses = normalizeExpenses(expensesRaw);
    
    const expensesWithBreakdown = expenses.map(exp => ({
      id: exp.id,
      title: exp.title || '',
      cost: exp.cost || '',
      costBreakdown: exp.costBreakdown || null,
      participants: exp.participants || null,
      hasSplitCost: exp.hasSplitCost || false
    }));
    
    setOtherExpenses(expensesWithBreakdown);
  }, [currentDay.id, trip.data]);

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

    // 🔧 FIX: Gestisci costBreakdown PRIMA (ha priorità massima)
    if (field === 'costBreakdown') {
      if (Array.isArray(value) && value.length > 0) {
        // Breakdown normale con contributi
        updatedCellData.hasSplitCost = value.length > 1;
        const total = value.reduce((sum, entry) => sum + entry.amount, 0);
        updatedCellData.cost = total.toString();
        updatedCellData.costBreakdown = value;
        if (!updatedCellData.participants) {
          updatedCellData.participants = getDefaultParticipants();
        }
        console.log('✅ [updateCategory] Breakdown aggiornato:', value);
      } else {
        // 🆕 Breakdown vuoto/null = reset SOLO costi (non title/media)
        updatedCellData.costBreakdown = null;
        updatedCellData.participants = null;
        updatedCellData.hasSplitCost = false;
        updatedCellData.cost = ''; // ← Reset costo
        console.log('🧹 [updateCategory] Reset costi (title/media intatti)');
      }
    }
    // 🔧 FIX: Se modifichi 'participants', NON toccare il breakdown
    else if (field === 'participants') {
      // Salva solo participants, lascia breakdown intatto
      console.log('✅ [updateCategory] Participants aggiornati:', value);
    }
    // AUTO-ASSEGNAZIONE: SOLO se modifichi 'cost' E non esiste già breakdown VALIDO
    else if (field === 'cost' && value !== undefined) {
      const amount = parseFloat(value) || 0;
      
      if (amount > 0) {
        // 🔧 FIX: Verifica se esiste breakdown VALIDO (con dati)
        const hasValidBreakdown = currentData.costBreakdown && 
                                   Array.isArray(currentData.costBreakdown) &&
                                   currentData.costBreakdown.length > 0 &&
                                   currentData.costBreakdown.some(e => e.amount > 0);
        
        if (!hasValidBreakdown) {
          // SOLO prima assegnazione (breakdown vuoto/null)
          updatedCellData.costBreakdown = [
            { userId: currentUserId, amount: amount }
          ];
          updatedCellData.participants = getDefaultParticipants();
          updatedCellData.hasSplitCost = false;
          console.log('✅ [updateCategory] Breakdown creato (prima volta)');
        } else {
          // 🔧 Breakdown valido esiste → aggiorna SOLO totali proporzionalmente
          const oldTotal = currentData.costBreakdown.reduce((sum, e) => sum + e.amount, 0);
          
          // Se il totale è identico, NON fare nulla (evita loop infiniti)
          if (Math.abs(amount - oldTotal) > 0.01) {
            const ratio = amount / oldTotal;
            updatedCellData.costBreakdown = currentData.costBreakdown.map(entry => ({
              ...entry,
              amount: Math.round(entry.amount * ratio * 100) / 100
            }));
            console.log('✅ [updateCategory] Breakdown aggiornato proporzionalmente');
          } else {
            // Totale identico → mantieni breakdown esistente
            updatedCellData.costBreakdown = currentData.costBreakdown;
          }
        }
      } else {
        // Cost = 0 → reset tutto
        updatedCellData.costBreakdown = null;
        updatedCellData.participants = null;
        updatedCellData.hasSplitCost = false;
        updatedCellData.cost = '';
      }
    }

    // Marca come update locale (evita loop in useEffect)
    isLocalUpdateRef.current = true;

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

      // 🔧 FIX: Stessa logica delle categorie
      if (field === 'costBreakdown') {
        if (Array.isArray(value) && value.length > 0) {
          updatedExpense.hasSplitCost = value.length > 1;
          const total = value.reduce((sum, entry) => sum + entry.amount, 0);
          updatedExpense.cost = total.toString();
          updatedExpense.costBreakdown = value;
          if (!updatedExpense.participants) {
            updatedExpense.participants = getDefaultParticipants();
          }
          console.log('✅ [updateOtherExpense] Breakdown aggiornato:', value);
        } else {
          // 🆕 Breakdown vuoto = reset SOLO costi (title intatto)
          updatedExpense.costBreakdown = null;
          updatedExpense.participants = null;
          updatedExpense.hasSplitCost = false;
          updatedExpense.cost = ''; // ← Reset costo
          console.log('🧹 [updateOtherExpense] Reset costi (title intatto)');
        }
      }
      else if (field === 'participants') {
        // Salva solo participants, lascia breakdown intatto
        console.log('✅ [updateOtherExpense] Participants aggiornati:', value);
      }
      else if (field === 'cost' && value !== undefined) {
        const amount = parseFloat(value) || 0;
        
        if (amount > 0) {
          const hasValidBreakdown = exp.costBreakdown && 
                                     Array.isArray(exp.costBreakdown) &&
                                     exp.costBreakdown.length > 0 &&
                                     exp.costBreakdown.some(e => e.amount > 0);
          
          if (!hasValidBreakdown) {
            updatedExpense.costBreakdown = [
              { userId: currentUserId, amount: amount }
            ];
            updatedExpense.participants = getDefaultParticipants();
            updatedExpense.hasSplitCost = false;
            console.log('✅ [updateOtherExpense] Breakdown creato (prima volta)');
          } else {
            const oldTotal = exp.costBreakdown.reduce((sum, e) => sum + e.amount, 0);
            
            if (Math.abs(amount - oldTotal) > 0.01) {
              const ratio = amount / oldTotal;
              updatedExpense.costBreakdown = exp.costBreakdown.map(entry => ({
                ...entry,
                amount: Math.round(entry.amount * ratio * 100) / 100
              }));
              console.log('✅ [updateOtherExpense] Breakdown aggiornato proporzionalmente');
            } else {
              updatedExpense.costBreakdown = exp.costBreakdown;
            }
          }
        } else {
          updatedExpense.costBreakdown = null;
          updatedExpense.participants = null;
          updatedExpense.hasSplitCost = false;
          updatedExpense.cost = '';
        }
      }
      
      return updatedExpense;
    });
    
    // Marca come update locale
    isLocalUpdateRef.current = true;
    
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
    
    isLocalUpdateRef.current = true;
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
    
    isLocalUpdateRef.current = true;
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