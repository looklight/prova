/**
 * 🛠️ CSV Helpers
 * Utility comuni per export CSV (usate da exportService e csvExporter)
 */

/**
 * Escape di valori CSV per gestire caratteri speciali
 */
export const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Se contiene punto e virgola, virgolette o a capo → racchiudi in virgolette
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Mappa ID categoria → nome leggibile
 */
export const getCategoryName = (categoryId) => {
  const categoryMap = {
    'pernottamento': 'Pernottamento',
    'attivita1': 'Attività',
    'attivita2': 'Attività',
    'attivita3': 'Attività',
    'spostamenti1': 'Spostamenti',
    'spostamenti2': 'Spostamenti',
    'ristori1': 'Ristori',
    'ristori2': 'Ristori',
    'otherExpenses': 'Altre Spese'
  };
  return categoryMap[categoryId] || categoryId;
};

/**
 * Mappa booking status → testo leggibile
 */
export const getBookingStatusText = (status) => {
  const statusMap = {
    'confirmed': 'Confermato',
    'pending': 'Da prenotare',
    'na': ''
  };
  return statusMap[status] || '';
};

/**
 * Mappa transport mode → testo leggibile
 */
export const getTransportModeText = (mode) => {
  const modeMap = {
    'car': 'Auto',
    'train': 'Treno',
    'plane': 'Aereo',
    'bus': 'Bus',
    'ferry': 'Traghetto',
    'walk': 'A piedi',
    'bike': 'Bici',
    'taxi': 'Taxi',
    'none': ''
  };
  return modeMap[mode] || '';
};

/**
 * Formatta data in formato italiano (gg/mm/aaaa)
 */
export const formatDateIT = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Genera stringa data per nome file (yyyy-mm-dd)
 */
export const getFilenameDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${year}-${month}-${day}`;
};

/**
 * BOM per supporto UTF-8 in Excel
 */
export const CSV_BOM = '\uFEFF';