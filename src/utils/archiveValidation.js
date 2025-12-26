// src/utils/archiveValidation.js

/**
 * 📦 ARCHIVE VALIDATION
 * Validazioni per sistema archiviazione viaggi
 */

/**
 * 📦 Determina se un viaggio può essere archiviato
 *
 * Criteri di archiviabilità:
 * 1. ✅ Data passata (ultimo giorno < oggi)
 * 2. ✅ Almeno 3 giorni
 * 3. ✅ Almeno 2 pernottamenti con titolo OPPURE almeno 3 attività con titolo
 *
 * Note sulla struttura dati:
 * - pernottamento: { title: "..." } → conta se title è compilato
 * - attivita: { activities: [{ title: "..." }, ...] } → conta ogni attività con title
 * - attivita1/2/3 (legacy): { title: "..." } → conta se title è compilato
 *
 * @param {Object} trip - Viaggio da controllare
 * @returns {boolean} true se archiviabile
 */
export const canArchiveTrip = (trip) => {
  if (!trip || !trip.days || !trip.data) {
    return false;
  }

  // 1. Almeno 3 giorni
  if (trip.days.length < 3) return false;

  // 2. Data passata (ultimo giorno)
  const lastDay = trip.days[trip.days.length - 1];
  const lastDayDate = new Date(lastDay.date);
  lastDayDate.setHours(23, 59, 59, 999); // Fine giornata

  if (lastDayDate >= new Date()) return false;

  // 3. Conta pernottamenti e attività compilate
  let hotelCount = 0;
  let activityCount = 0;

  Object.entries(trip.data).forEach(([key, cellData]) => {
    if (!cellData) return;

    // Estrai categoryId dalla chiave (formato: {dayId}-{categoryId})
    const parts = key.split('-');
    if (parts.length < 2) return;
    const categoryId = parts.slice(1).join('-');

    // Pernottamento: conta se ha title compilato
    if (categoryId === 'pernottamento') {
      if (cellData.title?.trim()) {
        hotelCount++;
      }
    }

    // Attività (nuovo formato): conta attività con title nell'array activities
    if (categoryId === 'attivita') {
      const activities = cellData.activities || [];
      activities.forEach((activity) => {
        if (activity?.title?.trim()) {
          activityCount++;
        }
      });
    }

    // Attività (formato legacy): conta se ha title compilato
    if (['attivita1', 'attivita2', 'attivita3'].includes(categoryId)) {
      if (cellData.title?.trim()) {
        activityCount++;
      }
    }
  });

  // Almeno 2 pernottamenti OPPURE almeno 3 attività
  return hotelCount >= 2 || activityCount >= 3;
};

export default {
  canArchiveTrip
};