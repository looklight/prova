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
  
  console.log('🔍 calculateTripCost - trip.days:', trip.days);
  console.log('🔍 calculateTripCost - trip.data:', trip.data);
  
  trip.days.forEach(day => {
    console.log('🔍 Processing day:', day.id);
    
    // Costi categorie (escludi base e note)
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'base' && cat.id !== 'note') {
        const cellData = trip.data[`${day.id}-${cat.id}`];
        if (cellData?.cost) {
          const cost = parseFloat(cellData.cost) || 0;
          console.log(`  ✅ ${cat.id}: ${cost}€`);
          total += cost;
        }
      }
    });
    
    // Aggiungi altre spese del giorno (campo separato)
    const otherExpenses = trip.data[`${day.id}-otherExpenses`];
    console.log('🔍 otherExpenses for day:', otherExpenses);
    
    if (otherExpenses && Array.isArray(otherExpenses)) {
      otherExpenses.forEach(expense => {
        if (expense.cost) {
          const cost = parseFloat(expense.cost) || 0;
          console.log(`  💸 ${expense.title}: ${cost}€`);
          total += cost;
        }
      });
    }
  });
  
  console.log('🔍 Total calculated:', total);
  return total;
};

// 🆕 NUOVE FUNZIONI PER BREAKDOWN

/**
 * Calcola il totale da un breakdown
 */
export const calculateBreakdownTotal = (breakdown) => {
  if (!breakdown || !Array.isArray(breakdown)) return 0;
  return breakdown.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
};

/**
 * Ottiene tutte le spese di un utente in un viaggio
 */
export const getUserTripExpenses = (trip, userId) => {
  const expenses = [];
  
  trip.days.forEach(day => {
    // Controlla categorie
    CATEGORIES.forEach(cat => {
      if (cat.id === 'base' || cat.id === 'note') return;
      
      const cellData = trip.data[`${day.id}-${cat.id}`];
      if (!cellData) return;
      
      // Se ha breakdown, cerca contributi utente
      if (cellData.costBreakdown && Array.isArray(cellData.costBreakdown)) {
        const userEntry = cellData.costBreakdown.find(e => e.userId === userId);
        if (userEntry && userEntry.amount > 0) {
          expenses.push({
            dayId: day.id,
            dayNumber: day.number,
            category: cat.label,
            categoryEmoji: cat.emoji,
            amount: userEntry.amount,
            hasBreakdown: true
          });
        }
      }
    });
    
    // Controlla altre spese
    const otherExpenses = trip.data[`${day.id}-otherExpenses`];
    if (otherExpenses && Array.isArray(otherExpenses)) {
      otherExpenses.forEach(expense => {
        if (expense.costBreakdown && Array.isArray(expense.costBreakdown)) {
          const userEntry = expense.costBreakdown.find(e => e.userId === userId);
          if (userEntry && userEntry.amount > 0) {
            expenses.push({
              dayId: day.id,
              dayNumber: day.number,
              category: expense.title || 'Altra Spesa',
              categoryEmoji: '💸',
              amount: userEntry.amount,
              hasBreakdown: true
            });
          }
        }
      });
    }
  });
  
  return expenses;
};

/**
 * Calcola il totale spese di un utente in un viaggio
 */
export const getUserTotalInTrip = (trip, userId) => {
  const expenses = getUserTripExpenses(trip, userId);
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
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


// Mappa categorie a gruppi (SOLO quelle con costi)
export const CATEGORY_GROUPS = {
  'pernottamento': ['pernottamento'],
  'attivita': ['attivita1', 'attivita2', 'attivita3'],
  'spostamenti': ['spostamenti1', 'spostamenti2'],
  'ristori': ['ristori1', 'ristori2'],
  'altri': ['other'] // Altre spese
};

// Icone per categorie aggregate
export const CATEGORY_ICONS = {
  'pernottamento': '🛏️',
  'attivita': '💡',
  'spostamenti': '🚡',
  'ristori': '🍽️',
  'altri': '💰'
};

// Label per categorie aggregate
export const CATEGORY_LABELS = {
  'pernottamento': 'Pernottamento',
  'attivita': 'Attività',
  'spostamenti': 'Spostamenti',
  'ristori': 'Ristori',
  'altri': 'Altre Spese'
};

// Calcola costi per categoria aggregata
export const calculateCategoryGroupCost = (trip, groupKey) => {
  let total = 0;
  const details = [];

  // Caso speciale: "altri" = altre spese
  if (groupKey === 'altri') {
    trip.days.forEach(day => {
      const key = `${day.id}-otherExpenses`;
      const expenses = trip.data[key] || [];
      expenses.forEach(exp => {
        const cost = parseFloat(exp.cost) || 0;
        if (cost > 0) {
          total += cost;
          details.push({
            dayNumber: day.number,
            categoryId: 'other',
            title: exp.title || 'Altra spesa',
            cost: cost
          });
        }
      });
    });
  } else {
    // Categorie normali
    const categoryIds = CATEGORY_GROUPS[groupKey] || [];
    
    trip.days.forEach(day => {
      categoryIds.forEach(catId => {
        const key = `${day.id}-${catId}`;
        const cellData = trip.data[key];
        
        if (cellData?.cost) {
          const cost = parseFloat(cellData.cost) || 0;
          if (cost > 0) {
            total += cost;
            details.push({
              dayNumber: day.number,
              categoryId: catId,
              title: cellData.title || '',
              cost: cost
            });
          }
        }
      });
    });
  }

  return { total, details };
};

// Calcola budget suggerito
export const getSuggestedBudget = (trip) => {
  const activeMembers = Object.values(trip.sharing?.members || {})
    .filter(m => m.status === 'active').length || 1;
  
  const totalBudget = activeMembers * trip.days.length * 100;
  
  const percentages = {
    pernottamento: 0.40,
    ristori: 0.25,
    spostamenti: 0.15,
    attivita: 0.15,
    altri: 0.05
  };
  
  const categories = {};
  Object.keys(percentages).forEach(cat => {
    categories[cat] = Math.round(totalBudget * percentages[cat]);
  });
  
  return {
    total: totalBudget,
    categories
  };
};