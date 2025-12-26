/**
 * 💰 costsUtils - ALTROVE VERSION
 * 
 * Utility per calcoli costi viaggi
 * Supporta la nuova struttura con array di attività
 */

// Categorie Altrove (senza destinazione e note che non hanno costi)
const COST_CATEGORIES = ['attivita', 'pernottamento'];

/**
 * Normalizza un valore costo: accetta sia "," che ".", limita a 2 decimali
 */
export const parseCost = (value) => {
  if (!value && value !== 0) return '';
  const normalized = value.toString().replace(',', '.');
  const num = parseFloat(normalized);
  if (isNaN(num)) return '';
  return parseFloat(num.toFixed(2)).toString();
};

/**
 * Filtra un breakdown per includere solo membri attivi
 */
export const filterActiveBreakdown = (breakdown, tripMembers) => {
  if (!breakdown || !Array.isArray(breakdown) || !tripMembers) return [];

  return breakdown.filter(entry => {
    const member = tripMembers[entry.userId];
    return member && member.status === 'active';
  });
};

/**
 * Calcola il totale da un breakdown considerando solo membri attivi
 */
export const calculateActiveBreakdownTotal = (breakdown, tripMembers) => {
  const activeBreakdown = filterActiveBreakdown(breakdown, tripMembers);
  return activeBreakdown.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
};

/**
 * Calcola il costo di un singolo item (attività, pernottamento, spesa)
 * Considera solo membri attivi se ha breakdown
 */
const calculateItemCost = (item, tripMembers) => {
  if (!item?.cost) return 0;
  
  if (item.costBreakdown && tripMembers) {
    return calculateActiveBreakdownTotal(item.costBreakdown, tripMembers);
  }
  
  return parseFloat(item.cost) || 0;
};

/**
 * Calcola il costo totale di un singolo giorno
 * Include: attività (array) + pernottamento
 */
export const calculateDayCost = (day, tripData, tripMembers = null) => {
  let total = 0;

  // Costi attività (array)
  const actKey = `${day.id}-attivita`;
  const actData = tripData[actKey];
  if (actData?.activities && Array.isArray(actData.activities)) {
    actData.activities.forEach(activity => {
      total += calculateItemCost(activity, tripMembers);
    });
  }

  // Costo pernottamento
  const accKey = `${day.id}-pernottamento`;
  const accData = tripData[accKey];
  total += calculateItemCost(accData, tripMembers);

  return total;
};

/**
 * Calcola il costo totale dell'intero viaggio
 */
export const calculateTripCost = (trip) => {
  let total = 0;
  const tripMembers = trip.sharing?.members || null;

  trip.days.forEach(day => {
    total += calculateDayCost(day, trip.data, tripMembers);
  });

  return total;
};

/**
 * Calcola il totale da un breakdown (senza filtro membri)
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

  // Verifica che l'utente sia attivo
  const userMember = trip.sharing?.members?.[userId];
  if (!userMember || userMember.status !== 'active') {
    return [];
  }

  trip.days.forEach(day => {
    // Attività
    const actKey = `${day.id}-attivita`;
    const actData = trip.data[actKey];
    if (actData?.activities && Array.isArray(actData.activities)) {
      actData.activities.forEach(activity => {
        if (activity.costBreakdown && Array.isArray(activity.costBreakdown)) {
          const userEntry = activity.costBreakdown.find(e => e.userId === userId);
          if (userEntry && userEntry.amount > 0) {
            expenses.push({
              dayId: day.id,
              dayNumber: day.number,
              category: 'Attività',
              categoryIcon: '💡',
              title: activity.title || 'Attività',
              amount: userEntry.amount
            });
          }
        }
      });
    }

    // Pernottamento
    const accKey = `${day.id}-pernottamento`;
    const accData = trip.data[accKey];
    if (accData?.costBreakdown && Array.isArray(accData.costBreakdown)) {
      const userEntry = accData.costBreakdown.find(e => e.userId === userId);
      if (userEntry && userEntry.amount > 0) {
        expenses.push({
          dayId: day.id,
          dayNumber: day.number,
          category: 'Pernottamento',
          categoryIcon: '🛏️',
          title: accData.title || 'Pernottamento',
          amount: userEntry.amount
        });
      }
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
 * Calcola statistiche costi per il viaggio
 */
export const getCostStats = (trip) => {
  const totalCost = calculateTripCost(trip);
  const numDays = trip.days.length;
  const avgPerDay = numDays > 0 ? totalCost / numDays : 0;

  // Calcola costi per categoria
  const tripMembers = trip.sharing?.members || null;
  let activitiesCost = 0;
  let accommodationCost = 0;

  trip.days.forEach(day => {
    // Attività
    const actKey = `${day.id}-attivita`;
    const actData = trip.data[actKey];
    if (actData?.activities && Array.isArray(actData.activities)) {
      actData.activities.forEach(activity => {
        activitiesCost += calculateItemCost(activity, tripMembers);
      });
    }

    // Pernottamento
    const accKey = `${day.id}-pernottamento`;
    const accData = trip.data[accKey];
    accommodationCost += calculateItemCost(accData, tripMembers);
  });

  return {
    total: totalCost,
    numDays,
    avgPerDay,
    byCategory: {
      activities: activitiesCost,
      accommodation: accommodationCost
    }
  };
};

/**
 * Rimuovi un utente da tutti i breakdown del viaggio
 */
export const removeUserFromAllBreakdowns = (tripData, userId) => {
  const cleanedData = { ...tripData };

  Object.keys(cleanedData).forEach(key => {
    const cellData = cleanedData[key];

    // Gestisci attività (oggetto con array activities)
    if (key.endsWith('-attivita') && cellData?.activities) {
      cleanedData[key] = {
        ...cellData,
        activities: cellData.activities.map(activity => {
          if (activity.costBreakdown && Array.isArray(activity.costBreakdown)) {
            const filteredBreakdown = activity.costBreakdown.filter(entry => entry.userId !== userId);

            if (filteredBreakdown.length === 0) {
              return {
                ...activity,
                costBreakdown: null,
                participants: null,
                hasSplitCost: false,
                cost: ''
              };
            }

            return {
              ...activity,
              costBreakdown: filteredBreakdown,
              hasSplitCost: filteredBreakdown.length > 1
            };
          }
          return activity;
        })
      };
    }
    // Gestisci pernottamento e altre categorie singole
    else if (cellData && cellData.costBreakdown && Array.isArray(cellData.costBreakdown)) {
      const filteredBreakdown = cellData.costBreakdown.filter(entry => entry.userId !== userId);

      if (filteredBreakdown.length === 0) {
        cleanedData[key] = {
          ...cellData,
          costBreakdown: null,
          participants: null,
          hasSplitCost: false,
          cost: ''
        };
      } else {
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

// Alias per retrocompatibilità
export const removeUserFromBreakdowns = removeUserFromAllBreakdowns;

/**
 * Calcola snapshot completo delle spese di un utente (per quando abbandona il viaggio)
 * Ritorna { total, byCategory: { [categoryName]: { total, count, items } } }
 */
export const calculateUserSnapshot = (trip, userId) => {
  const snapshot = {
    total: 0,
    byCategory: {}
  };

  trip.days.forEach(day => {
    // Attività (array)
    const actKey = `${day.id}-attivita`;
    const actData = trip.data[actKey];
    if (actData?.activities && Array.isArray(actData.activities)) {
      actData.activities.forEach(activity => {
        if (activity.costBreakdown && Array.isArray(activity.costBreakdown)) {
          const userEntry = activity.costBreakdown.find(e => e.userId === userId);
          if (userEntry && userEntry.amount > 0) {
            const categoryName = 'Attività';
            if (!snapshot.byCategory[categoryName]) {
              snapshot.byCategory[categoryName] = { total: 0, count: 0, items: [] };
            }
            snapshot.byCategory[categoryName].total += userEntry.amount;
            snapshot.byCategory[categoryName].count += 1;
            snapshot.byCategory[categoryName].items.push({
              day: day.number,
              title: activity.title || 'Attività',
              amount: userEntry.amount
            });
            snapshot.total += userEntry.amount;
          }
        }
      });
    }

    // Pernottamento
    const accKey = `${day.id}-pernottamento`;
    const accData = trip.data[accKey];
    if (accData?.costBreakdown && Array.isArray(accData.costBreakdown)) {
      const userEntry = accData.costBreakdown.find(e => e.userId === userId);
      if (userEntry && userEntry.amount > 0) {
        const categoryName = 'Pernottamento';
        if (!snapshot.byCategory[categoryName]) {
          snapshot.byCategory[categoryName] = { total: 0, count: 0, items: [] };
        }
        snapshot.byCategory[categoryName].total += userEntry.amount;
        snapshot.byCategory[categoryName].count += 1;
        snapshot.byCategory[categoryName].items.push({
          day: day.number,
          title: accData.title || 'Pernottamento',
          amount: userEntry.amount
        });
        snapshot.total += userEntry.amount;
      }
    }
  });

  return snapshot;
};

/**
 * Calcola il default budget suggerito
 */
export const getSuggestedBudget = (trip) => {
  const activeMembers = Object.values(trip.sharing?.members || {})
    .filter(m => m.status === 'active').length || 1;

  const totalBudget = activeMembers * trip.days.length * 150;

  const percentages = {
    accommodation: 0.50,
    activities: 0.50
  };

  const categories = {};
  Object.keys(percentages).forEach(cat => {
    const rawValue = totalBudget * percentages[cat];
    categories[cat] = Math.round(rawValue / 5) * 5;
  });

  return {
    total: totalBudget,
    categories
  };
};