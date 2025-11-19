// src/utils/analyticsHelpers.js

/**
 * 📊 ANALYTICS HELPERS
 * Funzioni helper per determinare qualità viaggi e engagement utenti
 */

/**
 * 🎯 Determina se un viaggio è "serio" (FILTRO STRINGENTE)
 * 
 * Un viaggio è considerato "serio" se ha TUTTI questi requisiti:
 * 1. ✅ Ha almeno 1 destinazione
 * 2. ✅ Ha almeno 2 giorni
 * 3. ✅ Ha dati compilati su ALMENO 2 GIORNI DIVERSI
 * 4. ✅ Ha almeno 1 spesa O almeno 2 media (link/foto/note)
 */
export const isSeriousTrip = (trip) => {
  if (!trip || !trip.days || !trip.data) {
    return false;
  }

  // 1. Ha destinazioni
  const hasDestinations = trip.metadata?.destinations?.length > 0;

  // 2. Ha almeno 2 giorni
  const hasMultipleDays = trip.days.length >= 2;

  // 3. Conta quanti giorni hanno dati compilati
  const daysWithData = trip.days.filter((day) => {
    // Controlla se questo giorno ha almeno 1 cella con dati
    return Object.keys(trip.data).some((key) => {
      if (!key.startsWith(`${day.id}-`)) return false;

      const cellData = trip.data[key];
      if (!cellData) return false;

      // Considera "con dati" se ha title, cost, o media
      return (
        cellData.title?.trim() ||
        (cellData.cost && parseFloat(cellData.cost) > 0) ||
        cellData.links?.length > 0 ||
        cellData.images?.length > 0 ||
        cellData.videos?.length > 0 ||
        cellData.mediaNotes?.length > 0
      );
    });
  });

  const hasDataOnMultipleDays = daysWithData.length >= 2;

  // 4. Ha almeno 1 spesa O almeno 2 media
  let totalExpenses = 0;
  let totalMedia = 0;

  Object.values(trip.data).forEach((cellData) => {
    if (!cellData) return;

    // Conta spese
    if (cellData.cost && parseFloat(cellData.cost) > 0) {
      totalExpenses++;
    }

    // Conta media
    totalMedia +=
      (cellData.links?.length || 0) +
      (cellData.images?.length || 0) +
      (cellData.videos?.length || 0) +
      (cellData.mediaNotes?.length || 0);
  });

  const hasSignificantContent = totalExpenses > 0 || totalMedia >= 2;

  // TUTTI i criteri devono essere soddisfatti
  return (
    hasDestinations &&
    hasMultipleDays &&
    hasDataOnMultipleDays &&
    hasSignificantContent
  );
};

/**
 * 💰 Determina livello uso gestione spese
 * @returns "none" | "basic" | "advanced"
 */
export const getExpenseUsageLevel = (trip) => {
  if (!trip || !trip.data) return 'none';

  let expenseCount = 0;
  let hasSplit = false;

  // Conta spese nelle celle normali
  Object.values(trip.data).forEach((cellData) => {
    if (!cellData) return;

    if (cellData.cost && parseFloat(cellData.cost) > 0) {
      expenseCount++;
      if (cellData.hasSplitCost || cellData.costBreakdown) {
        hasSplit = true;
      }
    }
  });

  // Conta "altre spese"
  trip.days.forEach((day) => {
    const otherExpensesKey = `${day.id}-otherExpenses`;
    const otherExpenses = trip.data[otherExpensesKey];
    if (otherExpenses && Array.isArray(otherExpenses)) {
      expenseCount += otherExpenses.length;
      if (otherExpenses.some((exp) => exp.hasSplitCost || exp.costBreakdown)) {
        hasSplit = true;
      }
    }
  });

  // Determina livello
  if (expenseCount === 0) return 'none';
  if (expenseCount >= 4 || hasSplit || trip.budget) return 'advanced';
  return 'basic';
};

/**
 * 🔍 Controlla se viaggio ha almeno 1 spesa
 */
export const hasAnyExpense = (trip) => {
  if (!trip || !trip.data) return false;

  return Object.values(trip.data).some((cellData) => {
    if (!cellData) return false;
    return cellData.cost && parseFloat(cellData.cost) > 0;
  });
};

/**
 * 📸 Controlla se viaggio ha almeno 1 media
 */
export const hasAnyMedia = (trip) => {
  if (!trip || !trip.data) return false;

  return Object.values(trip.data).some((cellData) => {
    if (!cellData) return false;
    return (
      cellData.links?.length > 0 ||
      cellData.images?.length > 0 ||
      cellData.videos?.length > 0 ||
      cellData.mediaNotes?.length > 0
    );
  });
};

/**
 * 👥 Conta membri attivi di un viaggio
 */
export const getActiveMemberCount = (trip) => {
  if (!trip?.sharing?.members) return 1;

  return Object.values(trip.sharing.members).filter(
    (member) => member.status === 'active'
  ).length;
};

/**
 * 📊 Calcola engagement score utente
 * Basato su numero e qualità viaggi
 */
export const calculateUserEngagementScore = (trips) => {
  if (!trips || trips.length === 0) return 0;

  let score = 0;

  trips.forEach((trip) => {
    score += 1; // Base: viaggio creato

    if (trip.metadata?.destinations?.length > 0) score += 2;
    if (trip.days?.length > 1) score += 1;
    if (isSeriousTrip(trip)) score += 5; // Bonus grande per viaggio serio

    const memberCount = getActiveMemberCount(trip);
    if (memberCount > 1) score += 3; // Bonus collaborazione

    if (hasAnyExpense(trip)) score += 2;
    if (hasAnyMedia(trip)) score += 1;
  });

  return score;
};

/**
 * 🏷️ Determina livello engagement utente
 * @returns "lurker" | "casual" | "power_user"
 */
export const getUserEngagementLevel = (trips) => {
  const score = calculateUserEngagementScore(trips);
  const seriousTripsCount = trips.filter(isSeriousTrip).length;

  if (score < 6 || seriousTripsCount === 0) return 'lurker';
  if (score < 20 || seriousTripsCount < 2) return 'casual';
  return 'power_user';
};

export default {
  isSeriousTrip,
  getExpenseUsageLevel,
  hasAnyExpense,
  hasAnyMedia,
  getActiveMemberCount,
  calculateUserEngagementScore,
  getUserEngagementLevel
};