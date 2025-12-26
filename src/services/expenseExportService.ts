// ============================================
// ALTROVE - Expense Export Service
// Gestisce esportazione spese viaggio in CSV
// ============================================

import { escapeCSV, formatDateIT, CSV_BOM } from '../utils/csvHelpers';
import { getActivityTypeConfig, ActivityType } from '../utils/activityTypes';

// ============================================
// TYPES
// ============================================

interface CostBreakdownEntry {
  userId: string;
  amount: number;
}

interface TripMember {
  uid: string;
  displayName: string;
  status?: string;
}

interface TripDay {
  id: string | number;
  date: Date | string;
  number: number;
}

interface Trip {
  name?: string;
  metadata?: { name?: string };
  days: TripDay[];
  data: Record<string, any>;
  sharing?: {
    members?: Record<string, TripMember>;
  };
}

interface ExpenseRow {
  dayNumber: number;
  date: string;
  destination: string;
  type: string;
  typeLabel: string;
  title: string;
  total: number;
  payers: Array<{ name: string; amount: number }>;
}

// ============================================
// HELPERS
// ============================================

/**
 * Estrae tutti i membri attivi del viaggio
 */
const getActiveMembers = (trip: Trip): TripMember[] => {
  if (!trip.sharing?.members) return [];
  return Object.entries(trip.sharing.members)
    .filter(([, m]) => m.status === 'active')
    .map(([uid, m]) => ({ ...m, uid }));
};

/**
 * Calcola il totale da un breakdown filtrando solo membri attivi
 */
const calculateTotal = (
  costBreakdown: CostBreakdownEntry[] | null | undefined,
  cost: string | undefined,
  activeMembers: TripMember[]
): number => {
  if (costBreakdown && Array.isArray(costBreakdown)) {
    return costBreakdown
      .filter(entry => activeMembers.length === 0 || activeMembers.some(m => m.uid === entry.userId))
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
  }
  return parseFloat(cost || '0') || 0;
};

/**
 * Ottiene info su chi ha pagato
 */
const getPayersInfo = (
  costBreakdown: CostBreakdownEntry[] | null | undefined,
  cost: string | undefined,
  activeMembers: TripMember[]
): Array<{ name: string; amount: number }> => {
  if (!costBreakdown || !Array.isArray(costBreakdown)) {
    // Nessun breakdown, costo generico
    const amount = parseFloat(cost || '0') || 0;
    if (amount > 0) {
      return [{ name: 'Non specificato', amount }];
    }
    return [];
  }

  return costBreakdown
    .filter(entry => entry.amount > 0)
    .filter(entry => activeMembers.length === 0 || activeMembers.some(m => m.uid === entry.userId))
    .map(entry => {
      const member = activeMembers.find(m => m.uid === entry.userId);
      return {
        name: member?.displayName || 'Utente',
        amount: entry.amount
      };
    });
};

/**
 * Estrae tutte le spese dal viaggio in formato tabellare
 */
const extractExpenses = (trip: Trip): ExpenseRow[] => {
  const expenses: ExpenseRow[] = [];
  const activeMembers = getActiveMembers(trip);

  trip.days.forEach(day => {
    const dateStr = formatDateIT(day.date);

    // Destinazione del giorno
    const destKey = `${day.id}-destinazione`;
    const destData = trip.data[destKey];
    const destination = destData?.title || '';

    // Pernottamento
    const accKey = `${day.id}-pernottamento`;
    const accData = trip.data[accKey];
    if (accData?.title?.trim()) {
      const total = calculateTotal(accData.costBreakdown, accData.cost, activeMembers);
      if (total > 0) {
        expenses.push({
          dayNumber: day.number,
          date: dateStr,
          destination,
          type: 'accommodation',
          typeLabel: getActivityTypeConfig('accommodation').label,
          title: accData.title,
          total,
          payers: getPayersInfo(accData.costBreakdown, accData.cost, activeMembers)
        });
      }
    }

    // Attivita
    const actKey = `${day.id}-attivita`;
    const actData = trip.data[actKey];
    if (actData?.activities && Array.isArray(actData.activities)) {
      actData.activities.forEach((activity: any) => {
        if (!activity.title?.trim()) return;

        const total = calculateTotal(activity.costBreakdown, activity.cost, activeMembers);
        if (total > 0) {
          const actType: ActivityType = activity.type || 'generic';
          expenses.push({
            dayNumber: day.number,
            date: dateStr,
            destination,
            type: actType,
            typeLabel: getActivityTypeConfig(actType).label,
            title: activity.title,
            total,
            payers: getPayersInfo(activity.costBreakdown, activity.cost, activeMembers)
          });
        }
      });
    }
  });

  return expenses;
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Esporta le spese del viaggio in formato CSV semplice
 * Colonne: Giorno | Data | Luogo | Categoria | Descrizione | Importo | Pagato da
 */
export const exportExpensesAsCSV = (trip: Trip): boolean => {
  try {
    const tripName = trip.metadata?.name || trip.name || 'Viaggio';
    const expenses = extractExpenses(trip);

    if (expenses.length === 0) {
      console.warn('Nessuna spesa da esportare');
      return false;
    }

    const rows: string[] = [];

    // Titolo viaggio
    rows.push(escapeCSV(tripName));
    rows.push(''); // Riga vuota

    // Header
    rows.push(['Giorno', 'Data', 'Luogo', 'Categoria', 'Descrizione', 'Importo', 'Pagato da'].join(';'));

    // Righe spese
    expenses.forEach(exp => {
      const payersStr = exp.payers.length > 1
        ? exp.payers.map(p => `${p.name} (${p.amount.toFixed(2)}€)`).join(', ')
        : exp.payers[0]?.name || '';

      rows.push([
        `G${exp.dayNumber}`,
        escapeCSV(exp.date),
        escapeCSV(exp.destination),
        escapeCSV(exp.typeLabel),
        escapeCSV(exp.title),
        exp.total.toFixed(2).replace('.', ','), // Formato italiano per Excel
        escapeCSV(payersStr)
      ].join(';'));
    });

    // Riga totale
    const grandTotal = expenses.reduce((sum, e) => sum + e.total, 0);
    rows.push(['', '', '', '', 'TOTALE', grandTotal.toFixed(2).replace('.', ','), ''].join(';'));

    // Download
    const csvContent = rows.join('\n');
    const blob = new Blob([CSV_BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-spese.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Errore export spese CSV:', error);
    throw error;
  }
};

/**
 * Esporta le spese con dettaglio per persona (chi ha pagato quanto)
 * Include una matrice con colonne per ogni membro
 */
export const exportExpensesDetailedCSV = (trip: Trip): boolean => {
  try {
    const tripName = trip.metadata?.name || trip.name || 'Viaggio';
    const expenses = extractExpenses(trip);
    const activeMembers = getActiveMembers(trip);

    if (expenses.length === 0) {
      console.warn('Nessuna spesa da esportare');
      return false;
    }

    const rows: string[] = [];

    // Header con nomi membri
    const memberNames = activeMembers.map(m => m.displayName);
    const headerCols = ['Giorno', 'Data', 'Categoria', 'Descrizione', 'Totale'];
    if (memberNames.length > 0) {
      headerCols.push(...memberNames);
    }
    rows.push(headerCols.map(escapeCSV).join(';'));

    // Righe spese
    expenses.forEach(exp => {
      const rowCols = [
        `G${exp.dayNumber}`,
        exp.date,
        exp.typeLabel,
        exp.title,
        exp.total.toFixed(2).replace('.', ',')
      ];

      // Aggiungi colonne per ogni membro
      if (activeMembers.length > 0) {
        activeMembers.forEach(member => {
          const payer = exp.payers.find(p => p.name === member.displayName);
          rowCols.push(payer ? payer.amount.toFixed(2).replace('.', ',') : '');
        });
      }

      rows.push(rowCols.map(escapeCSV).join(';'));
    });

    // Riga totali
    const grandTotal = expenses.reduce((sum, e) => sum + e.total, 0);
    const totalRow = ['', '', '', 'TOTALE', grandTotal.toFixed(2).replace('.', ',')];

    if (activeMembers.length > 0) {
      activeMembers.forEach(member => {
        const memberTotal = expenses.reduce((sum, exp) => {
          const payer = exp.payers.find(p => p.name === member.displayName);
          return sum + (payer?.amount || 0);
        }, 0);
        totalRow.push(memberTotal.toFixed(2).replace('.', ','));
      });
    }
    rows.push(totalRow.join(';'));

    // Download
    const csvContent = rows.join('\n');
    const blob = new Blob([CSV_BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-spese-dettaglio.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Errore export spese dettagliato CSV:', error);
    throw error;
  }
};

/**
 * Esporta il riepilogo per categoria
 */
export const exportExpensesByCategoryCSV = (trip: Trip): boolean => {
  try {
    const tripName = trip.metadata?.name || trip.name || 'Viaggio';
    const expenses = extractExpenses(trip);

    if (expenses.length === 0) {
      console.warn('Nessuna spesa da esportare');
      return false;
    }

    // Raggruppa per categoria
    const byCategory: Record<string, { total: number; count: number }> = {};
    expenses.forEach(exp => {
      if (!byCategory[exp.typeLabel]) {
        byCategory[exp.typeLabel] = { total: 0, count: 0 };
      }
      byCategory[exp.typeLabel].total += exp.total;
      byCategory[exp.typeLabel].count++;
    });

    const rows: string[] = [];

    // Header
    rows.push(['Categoria', 'N. Spese', 'Totale', 'Percentuale'].join(';'));

    // Calcola totale
    const grandTotal = expenses.reduce((sum, e) => sum + e.total, 0);

    // Righe categorie ordinate per totale
    Object.entries(byCategory)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([category, data]) => {
        const percentage = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;
        rows.push([
          escapeCSV(category),
          data.count.toString(),
          data.total.toFixed(2).replace('.', ','),
          `${percentage.toFixed(1)}%`
        ].join(';'));
      });

    // Riga totale
    rows.push(['TOTALE', expenses.length.toString(), grandTotal.toFixed(2).replace('.', ','), '100%'].join(';'));

    // Download
    const csvContent = rows.join('\n');
    const blob = new Blob([CSV_BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-spese-categorie.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Errore export categorie CSV:', error);
    throw error;
  }
};
