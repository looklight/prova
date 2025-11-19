// src/utils/textUtils.js

/**
 * 🔤 NORMALIZZAZIONE TESTO
 * Funzioni utility per pulire e formattare stringhe
 */

/**
 * Normalizza destinazione: trim + capitalize
 * "tokyo" → "Tokyo"
 * "new york" → "New York"
 * "  PARIS  " → "Paris"
 */
export const normalizeDestination = (destination) => {
  if (!destination || typeof destination !== 'string') {
    return '';
  }

  return destination
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Normalizza nome viaggio (stessa logica)
 */
export const normalizeTripName = (name) => {
  return normalizeDestination(name);
};

export default {
  normalizeDestination,
  normalizeTripName
};