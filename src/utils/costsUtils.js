/**
 * Utility per calcoli costi viaggi
 */

import { CATEGORIES } from './constants';

/**
 * 🆕 Filtra un breakdown per includere solo membri attivi
 * @param {Array} breakdown - Array di { userId, amount }
 * @param {Object} tripMembers - Oggetto trip.sharing.members
 * @returns {Array} Breakdown filtrato
 */
export const filterActiveBreakdown = (breakdown, tripMembers) => {
  if (!breakdown || !Array.isArray(breakdown) || !tripMembers) return [];
  
  return breakdown.filter(entry => {
    const member = tripMembers[entry.userId];
    return member && member.status === 'active';
  });
};

/**
 * 🆕 Calcola il totale da un breakdown considerando solo membri attivi
 */
export const calculateActiveBreakdownTotal = (breakdown, tripMembers) => {
  const activeBreakdown = filterActiveBreakdown(breakdown, tripMembers);
  return activeBreakdown.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
};

/**
 * Calcola il costo totale di un singolo giorno
 * Include categorie + altre spese (solo membri attivi)
 */
export const calculateDayCost = (day, tripData, tripMembers = null) => {
  let total = 0;
  
  // Somma costi categorie (escludi base e note)
  CATEGORIES.forEach(cat => {
    if (cat.id !== 'base' && cat.id !== 'note') {
      const cellData = tripData[`${day.id}-${cat.id}`];
      if (cellData?.cost) {
        // Se ha breakdown e tripMembers, usa solo membri attivi
        if (cellData.costBreakdown && tripMembers) {
          total += calculateActiveBreakdownTotal(cellData.costBreakdown, tripMembers);
        } else {
          total += parseFloat(cellData.cost) || 0;
        }
      }
    }
  });
  
  // Somma altre spese dal campo separato
  const otherExpenses = tripData[`${day.id}-otherExpenses`];
  if (otherExpenses && Array.isArray(otherExpenses)) {
    otherExpenses.forEach(expense => {
      if (expense.cost) {
        // Se ha breakdown e tripMembers, usa solo membri attivi
        if (expense.costBreakdown && tripMembers) {
          total += calculateActiveBreakdownTotal(expense.costBreakdown, tripMembers);
        } else {
          total += parseFloat(expense.cost) || 0;
        }
      }
    });
  }
  
  return total;
};

/**
 * Calcola il costo totale dell'intero viaggio (solo membri attivi)
 */
export const calculateTripCost = (trip) => {
  let total = 0;
  const tripMembers = trip.sharing?.members || null;
  
  trip.days.forEach(day => {
    // Costi categorie (escludi base e note)
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'base' && cat.id !== 'note') {
        const cellData = trip.data[`${day.id}-${cat.id}`];
        if (cellData?.cost) {
          // Se ha breakdown, usa solo membri attivi
          if (cellData.costBreakdown && tripMembers) {
            total += calculateActiveBreakdownTotal(cellData.costBreakdown, tripMembers);
          } else {
            total += parseFloat(cellData.cost) || 0;
          }
        }
      }
    });
    
    // Aggiungi altre spese del giorno (campo separato)
    const otherExpenses = trip.data[`${day.id}-otherExpenses`];
    
    if (otherExpenses && Array.isArray(otherExpenses)) {
      otherExpenses.forEach(expense => {
        if (expense.cost) {
          // Se ha breakdown, usa solo membri attivi
          if (expense.costBreakdown && tripMembers) {
            total += calculateActiveBreakdownTotal(expense.costBreakdown, tripMembers);
          } else {
            total += parseFloat(expense.cost) || 0;
          }
        }
      });
    }
  });
  
  return total;
};

// 🆕 NUOVE FUNZIONI PER BREAKDOWN

/**
 * Calcola il totale da un breakdown (deprecata - usa calculateActiveBreakdownTotal)
 */
export const calculateBreakdownTotal = (breakdown) => {
  if (!breakdown || !Array.isArray(breakdown)) return 0;
  return breakdown.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
};

/**
 * Ottiene tutte le spese di un utente in un viaggio (solo se attivo)
 */
export const getUserTripExpenses = (trip, userId) => {
  const expenses = [];
  
  // Verifica che l'utente sia attivo
  const userMember = trip.sharing?.members?.[userId];
  if (!userMember || userMember.status !== 'active') {
    return []; // Utente non attivo, ritorna array vuoto
  }
  
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
 * Calcola il totale spese di un utente in un viaggio (solo se attivo)
 */
export const getUserTotalInTrip = (trip, userId) => {
  const expenses = getUserTripExpenses(trip, userId);
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
};

/**
 * 🆕 Calcola il totale spese di un utente includendo TUTTI i breakdown (anche se non più attivo)
 * Usata per calcolare lo storico quando un utente esce
 */
export const calculateUserTotalSpent = (trip, userId) => {
  let total = 0;
  
  trip.days.forEach(day => {
    // Controlla categorie
    CATEGORIES.forEach(cat => {
      if (cat.id === 'base' || cat.id === 'note') return;
      
      const cellData = trip.data[`${day.id}-${cat.id}`];
      if (!cellData) return;
      
      if (cellData.costBreakdown && Array.isArray(cellData.costBreakdown)) {
        const userEntry = cellData.costBreakdown.find(e => e.userId === userId);
        if (userEntry && userEntry.amount > 0) {
          total += userEntry.amount;
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
            total += userEntry.amount;
          }
        }
      });
    }
  });
  
  return total;
};

/**
 * 🆕 Crea snapshot completo delle spese di un utente
 * Include totale + breakdown per categoria con dettaglio spese
 */
export const calculateUserSnapshot = (trip, userId) => {
  const snapshot = {
    total: 0,
    byCategory: {}
  };

  trip.days.forEach(day => {
    const baseKey = `${day.id}-base`;
    const baseTitle = trip.data[baseKey]?.title || `Giorno ${day.number}`;

    // CATEGORIE STANDARD
    CATEGORIES.forEach(cat => {
      if (cat.id === 'base' || cat.id === 'note') return;
      
      const key = `${day.id}-${cat.id}`;
      const cellData = trip.data[key];
      
      if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
        const userEntry = cellData.costBreakdown.find(e => e.userId === userId);
        
        if (userEntry && userEntry.amount > 0) {
          snapshot.total += userEntry.amount;
          
          const categoryKey = cat.label;
          if (!snapshot.byCategory[categoryKey]) {
            snapshot.byCategory[categoryKey] = { 
              total: 0, 
              count: 0,
              items: []
            };
          }
          
          snapshot.byCategory[categoryKey].total += userEntry.amount;
          snapshot.byCategory[categoryKey].count += 1;
          snapshot.byCategory[categoryKey].items.push({
            day: day.number,
            base: baseTitle,
            title: cellData.title || cat.label,
            amount: userEntry.amount
          });
        }
      }
    });

    // ALTRE SPESE
    const otherExpensesKey = `${day.id}-otherExpenses`;
    const otherExpenses = trip.data[otherExpensesKey];
    
    if (otherExpenses && Array.isArray(otherExpenses)) {
      otherExpenses.forEach(expense => {
        if (expense.costBreakdown && Array.isArray(expense.costBreakdown)) {
          const userEntry = expense.costBreakdown.find(e => e.userId === userId);
          
          if (userEntry && userEntry.amount > 0) {
            snapshot.total += userEntry.amount;
            
            const categoryKey = 'Altre Spese';
            if (!snapshot.byCategory[categoryKey]) {
              snapshot.byCategory[categoryKey] = { 
                total: 0, 
                count: 0,
                items: []
              };
            }
            
            snapshot.byCategory[categoryKey].total += userEntry.amount;
            snapshot.byCategory[categoryKey].count += 1;
            snapshot.byCategory[categoryKey].items.push({
              day: day.number,
              base: baseTitle,
              title: expense.title || 'Altra Spesa',
              amount: userEntry.amount
            });
          }
        }
      });
    }
  });

  return snapshot;
};

/**
 * 🆕 Rimuove un utente da tutti i costBreakdown del viaggio
 * Ritorna un nuovo oggetto tripData pulito
 */
export const removeUserFromBreakdowns = (tripData, userId) => {
  const cleanedData = { ...tripData };
  
  Object.keys(cleanedData).forEach(key => {
    const cellData = cleanedData[key];
    
    // Gestisci altre spese (array)
    if (key.endsWith('-otherExpenses') && Array.isArray(cellData)) {
      cleanedData[key] = cellData.map(expense => {
        if (expense.costBreakdown && Array.isArray(expense.costBreakdown)) {
          const filteredBreakdown = expense.costBreakdown.filter(entry => entry.userId !== userId);
          
          // Se il breakdown diventa vuoto, resetta anche i campi correlati
          if (filteredBreakdown.length === 0) {
            return {
              ...expense,
              costBreakdown: null,
              participants: null,
              hasSplitCost: false,
              cost: ''
            };
          }
          
          // Altrimenti aggiorna solo il breakdown
          return {
            ...expense,
            costBreakdown: filteredBreakdown,
            hasSplitCost: filteredBreakdown.length > 1
          };
        }
        return expense;
      });
    }
    // Gestisci categorie normali (oggetto)
    else if (cellData && cellData.costBreakdown && Array.isArray(cellData.costBreakdown)) {
      const filteredBreakdown = cellData.costBreakdown.filter(entry => entry.userId !== userId);
      
      // Se il breakdown diventa vuoto, resetta i campi correlati
      if (filteredBreakdown.length === 0) {
        cleanedData[key] = {
          ...cellData,
          costBreakdown: null,
          participants: null,
          hasSplitCost: false,
          cost: ''
        };
      } else {
        // Altrimenti aggiorna solo il breakdown
        cleanedData[key] = {
          ...cellData,
          costBreakdown: filteredBreakdown,
          hasSplitCost: filteredBreakdown.length > 1
        };
      }
    }
  });
  
  return cleanedData;
};

/**
 * Raggruppa costi per categoria in tutto il viaggio (solo membri attivi)
 */
export const getCostsByCategory = (trip) => {
  const costs = {};
  const tripMembers = trip.sharing?.members || null;
  
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
          // Se ha breakdown, usa solo membri attivi
          let cost = 0;
          if (cellData.costBreakdown && tripMembers) {
            cost = calculateActiveBreakdownTotal(cellData.costBreakdown, tripMembers);
          } else {
            cost = parseFloat(cellData.cost) || 0;
          }
          
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
          // Se ha breakdown, usa solo membri attivi
          let cost = 0;
          if (expense.costBreakdown && tripMembers) {
            cost = calculateActiveBreakdownTotal(expense.costBreakdown, tripMembers);
          } else {
            cost = parseFloat(expense.cost) || 0;
          }
          
          costs['other'].total += cost;
          if (cost > 0) costs['other'].count++;
        }
      });
    }
  });
  
  return costs;
};

/**
 * Calcola statistiche costi per il viaggio (solo membri attivi)
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

// Calcola costi per categoria aggregata (solo membri attivi)
export const calculateCategoryGroupCost = (trip, groupKey) => {
  let total = 0;
  const details = [];
  const tripMembers = trip.sharing?.members || null;

  // Caso speciale: "altri" = altre spese
  if (groupKey === 'altri') {
    trip.days.forEach(day => {
      const key = `${day.id}-otherExpenses`;
      const expenses = trip.data[key];
      
      if (expenses && Array.isArray(expenses)) {
        expenses.forEach(exp => {
          // Se ha breakdown, usa solo membri attivi
          let cost = 0;
          if (exp.costBreakdown && tripMembers) {
            cost = calculateActiveBreakdownTotal(exp.costBreakdown, tripMembers);
          } else {
            cost = parseFloat(exp.cost) || 0;
          }
          
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
      }
    });
  } else {
    // Categorie normali
    const categoryIds = CATEGORY_GROUPS[groupKey] || [];
    
    trip.days.forEach(day => {
      categoryIds.forEach(catId => {
        const key = `${day.id}-${catId}`;
        const cellData = trip.data[key];
        
        if (cellData?.cost) {
          // Se ha breakdown, usa solo membri attivi
          let cost = 0;
          if (cellData.costBreakdown && tripMembers) {
            cost = calculateActiveBreakdownTotal(cellData.costBreakdown, tripMembers);
          } else {
            cost = parseFloat(cellData.cost) || 0;
          }
          
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

// Calcola il default budget suggerito
export const getSuggestedBudget = (trip) => {
  const activeMembers = Object.values(trip.sharing?.members || {})
    .filter(m => m.status === 'active').length || 1;
  
  const totalBudget = activeMembers * trip.days.length * 150;
  
  const percentages = {
    pernottamento: 0.40,
    ristori: 0.25,
    spostamenti: 0.15,
    attivita: 0.15,
    altri: 0.05
  };
  
  const categories = {};
  Object.keys(percentages).forEach(cat => {
    const rawValue = totalBudget * percentages[cat];
    // ⭐ Arrotonda a multipli di 5€
    categories[cat] = Math.round(rawValue / 5) * 5;
  });
  
  return {
    total: totalBudget,
    categories
  };
};