/**
 * Utility per calcoli costi viaggi
 */

import { CATEGORIES } from './constants';

/**
 * Calcola il costo totale di un singolo giorno
 * Include categorie + altre spese
 */
export const calculateDayCost = (day, tripData) => {
  let total = 0;
  
  // Somma costi categorie (escludi base e note)
  CATEGORIES.forEach(cat => {
    if (cat.id !== 'base' && cat.id !== 'note') {
      const cellData = tripData[`${day.id}-${cat.id}`];
      if (cellData?.cost) {
        total += parseFloat(cellData.cost) || 0;
      }
    }
  });
  
  // Somma altre spese dal campo separato
  const otherExpenses = tripData[`${day.id}-otherExpenses`];
  if (otherExpenses && Array.isArray(otherExpenses)) {
    otherExpenses.forEach(expense => {
      if (expense.cost) {
        total += parseFloat(expense.cost) || 0;
      }
    });
  }
  
  return total;
};

/**
 * Calcola il costo totale dell'intero viaggio
 */
export const calculateTripCost = (trip) => {
  let total = 0;
  
  trip.days.forEach(day => {
    // Costi categorie (escludi base e note)
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'base' && cat.id !== 'note') {
        const cellData = trip.data[`${day.id}-${cat.id}`];
        if (cellData?.cost) {
          total += parseFloat(cellData.cost) || 0;
        }
      }
    });
    
    // Aggiungi altre spese del giorno (campo separato)
    const otherExpenses = trip.data[`${day.id}-otherExpenses`];
    if (otherExpenses && Array.isArray(otherExpenses)) {
      otherExpenses.forEach(expense => {
        if (expense.cost) {
          total += parseFloat(expense.cost) || 0;
        }
      });
    }
  });
  
  return total;
};

/**
 * Raggruppa costi per categoria in tutto il viaggio
 */
export const getCostsByCategory = (trip) => {
  const costs = {};
  
  CATEGORIES.forEach(cat => {
    if (cat.id !== 'base' && cat.id !== 'note') {
      costs[cat.id] = {
        label: cat.label,
        emoji: cat.emoji,
        total: 0,
        count: 0
      };
    }
  });
  
  // Aggiungi categoria per altre spese
  costs['other'] = {
    label: 'Altre Spese',
    emoji: '💸',
    total: 0,
    count: 0
  };
  
  trip.days.forEach(day => {
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'base' && cat.id !== 'note') {
        const cellData = trip.data[`${day.id}-${cat.id}`];
        if (cellData?.cost) {
          const cost = parseFloat(cellData.cost) || 0;
          costs[cat.id].total += cost;
          if (cost > 0) costs[cat.id].count++;
        }
      }
    });
    
    // Conta altre spese dal campo separato
    const otherExpenses = trip.data[`${day.id}-otherExpenses`];
    if (otherExpenses && Array.isArray(otherExpenses)) {
      otherExpenses.forEach(expense => {
        if (expense.cost) {
          const cost = parseFloat(expense.cost) || 0;
          costs['other'].total += cost;
          if (cost > 0) costs['other'].count++;
        }
      });
    }
  });
  
  return costs;
};

/**
 * Calcola statistiche costi per il viaggio
 */
export const getCostStats = (trip) => {
  const totalCost = calculateTripCost(trip);
  const numDays = trip.days.length;
  const avgPerDay = numDays > 0 ? totalCost / numDays : 0;
  
  const costsByCategory = getCostsByCategory(trip);
  
  // Trova categoria più costosa
  let maxCategory = null;
  let maxCost = 0;
  Object.entries(costsByCategory).forEach(([catId, data]) => {
    if (data.total > maxCost) {
      maxCost = data.total;
      maxCategory = { id: catId, ...data };
    }
  });
  
  return {
    total: totalCost,
    numDays,
    avgPerDay,
    costsByCategory,
    maxCategory
  };
};