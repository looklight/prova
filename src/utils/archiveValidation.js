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
 * 3. ✅ Almeno 30% dei giorni con contenuto TESTUALE (no costi, no media)
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

  // 3. Conta giorni con contenuto testuale (esclusi costi e media)
  const daysWithTextualContent = trip.days.filter((day) => {
    // Cerca celle normali per questo giorno (formato: {dayId}-{categoryId})
    return Object.keys(trip.data).some((key) => {
      if (!key.startsWith(`${day.id}-`)) return false;
      
      // Escludi "otherExpenses" (sono solo costi)
      if (key.endsWith('-otherExpenses')) return false;

      const cellData = trip.data[key];
      if (!cellData) return false;

      // Conta SOLO se ha title compilato (contenuto testuale)
      // Ignora costi (cost) e media (images, videos, links, mediaNotes)
      return cellData.title?.trim();
    });
  }).length;

  const contentPercentage = (daysWithTextualContent / trip.days.length) * 100;
  
  return contentPercentage >= 30;
};

export default {
  canArchiveTrip
};