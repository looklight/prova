/**
 * Utility per esportare i dati del viaggio in formato CSV
 * (Bilanci e spese)
 */

import {
  escapeCSV,
  getCategoryName,
  formatDateIT,
  getFilenameDate,
  CSV_BOM
} from './csvHelpers';

/**
 * Genera CSV con le transazioni da effettuare
 */
const generateTransactionsCSV = (transactions) => {
  if (transactions.length === 0) {
    return 'Da;A;Importo\n(Nessuna transazione necessaria)';
  }

  const header = 'Da;A;Importo';
  const rows = transactions.map(t => 
    [
      escapeCSV(t.fromName),
      escapeCSV(t.toName),
      t.amount.toFixed(2)
    ].join(';')
  );

  return [header, ...rows].join('\n');
};

/**
 * Genera CSV con i bilanci personali
 */
const generateBalancesCSV = (balances) => {
  const header = 'Nome;Ha Pagato;Doveva Pagare;Bilancio';
  
  const rows = Object.values(balances)
    .sort((a, b) => b.balance - a.balance)
    .map(b => 
      [
        escapeCSV(b.displayName),
        b.paid.toFixed(2),
        b.owes.toFixed(2),
        b.balance.toFixed(2)
      ].join(';')
    );

  // Aggiungi riga totali
  const totalPaid = Object.values(balances).reduce((sum, b) => sum + b.paid, 0);
  const totalOwes = Object.values(balances).reduce((sum, b) => sum + b.owes, 0);
  const totalBalance = Object.values(balances).reduce((sum, b) => sum + b.balance, 0);
  
  rows.push([
    'TOTALE',
    totalPaid.toFixed(2),
    totalOwes.toFixed(2),
    totalBalance.toFixed(2)
  ].join(';'));

  return [header, ...rows].join('\n');
};

/**
 * Genera CSV con il dettaglio di tutte le spese
 */
const generateDetailedExpensesCSV = (trip) => {
  const header = 'Giorno;Data;Luogo;Categoria;Descrizione;Chi ha pagato;Importo;Partecipanti';
  const rows = [];

  trip.days.forEach(day => {
    const baseKey = `${day.id}-base`;
    const baseTitle = trip.data[baseKey]?.title || '';

    Object.keys(trip.data).forEach(key => {
      if (!key.startsWith(day.id)) return;

      const cellData = trip.data[key];

      if (key.endsWith('-otherExpenses')) {
        if (Array.isArray(cellData)) {
          cellData.forEach(expense => {
            if (expense.costBreakdown && expense.costBreakdown.length > 0) {
              rows.push(...generateExpenseRows(
                day,
                baseTitle,
                'Altre Spese',
                expense.title || 'Altra Spesa',
                expense,
                trip
              ));
            }
          });
        }
      } else {
        const categoryId = key.split('-')[1];
        
        if (categoryId === 'base' || categoryId === 'note') return;
        
        const categoryName = getCategoryName(categoryId);
        
        if (cellData && cellData.costBreakdown && cellData.costBreakdown.length > 0) {
          rows.push(...generateExpenseRows(
            day,
            baseTitle,
            categoryName,
            cellData.title || categoryName,
            cellData,
            trip
          ));
        }
      }
    });
  });

  return [header, ...rows].join('\n');
};

/**
 * Helper per generare righe CSV per una spesa
 * Esporta SOLO membri ATTIVI
 */
const generateExpenseRows = (day, baseTitle, categoryName, description, expense, trip) => {
  const rows = [];
  
  let participants = expense.participants || [];
  if (participants.length === 0) {
    participants = Object.keys(trip.sharing.members)
      .filter(uid => trip.sharing.members[uid].status === 'active');
  } else {
    participants = participants.filter(uid => 
      trip.sharing.members[uid] && trip.sharing.members[uid].status === 'active'
    );
  }

  const participantNames = participants
    .map(uid => trip.sharing.members[uid]?.displayName || 'Sconosciuto')
    .join(', ');

  expense.costBreakdown.forEach(entry => {
    if (entry.amount > 0) {
      const member = trip.sharing.members[entry.userId];
      
      if (!member || member.status !== 'active') {
        return;
      }
      
      const paidByName = member.displayName || 'Sconosciuto';
      
      rows.push([
        day.number,
        day.date || '',
        escapeCSV(baseTitle),
        escapeCSV(categoryName),
        escapeCSV(description),
        escapeCSV(paidByName),
        entry.amount.toFixed(2),
        escapeCSV(participantNames)
      ].join(';'));
    }
  });

  return rows;
};

/**
 * Funzione principale per esportare i bilanci in CSV
 */
export const exportBalancesToCSV = (trip, balances, transactions) => {
  const dateString = formatDateIT(new Date());
  const filenameDate = getFilenameDate();
  
  const transactionsCSV = generateTransactionsCSV(transactions);
  const balancesCSV = generateBalancesCSV(balances);
  const detailedCSV = generateDetailedExpensesCSV(trip);

  const fullCSV = [
    `=== BILANCI - ${trip.metadata?.name || 'Viaggio'} ===`,
    `Esportato il: ${dateString}`,
    '',
    '=== TRANSAZIONI DA EFFETTUARE ===',
    transactionsCSV,
    '',
    '',
    '=== BILANCI PERSONALI ===',
    balancesCSV,
    '',
    '',
    '=== DETTAGLIO SPESE ===',
    detailedCSV
  ].join('\n');

  const blob = new Blob([CSV_BOM + fullCSV], { type: 'text/csv;charset=utf-8;' });
  
  const tripName = trip.metadata?.name || 'Viaggio';
  const sanitizedName = tripName.replace(/[^a-z0-9_\-]/gi, '_');
  const filename = `bilanci_${sanitizedName}_${filenameDate}.csv`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('✅ CSV esportato:', filename);
};

/**
 * Funzione per esportare riepilogo costi per utente
 */
export const exportUserBreakdownToCSV = (trip, userBreakdown) => {
  const tripName = trip.metadata?.name || 'Viaggio';
  const dateString = formatDateIT(new Date());
  const filenameDate = getFilenameDate();
  
  let csvContent = `RIEPILOGO COSTI PER UTENTE - ${tripName}\n`;
  csvContent += `Esportato il: ${dateString}\n\n`;
  csvContent += 'Nome;Totale Speso;Numero Spese;Categorie\n';
  
  Object.entries(userBreakdown).forEach(([uid, data]) => {
    const memberStatus = trip.sharing.members[uid]?.status || 'active';
    
    if (memberStatus !== 'active') {
      return;
    }
    
    const totalItems = Object.values(data.byCategory).reduce((sum, cat) => sum + cat.count, 0);
    const categories = Object.keys(data.byCategory).join('; ');
    
    csvContent += `${escapeCSV(data.displayName)};${data.total.toFixed(2)};${totalItems};${escapeCSV(categories)}\n`;
  });
  
  const blob = new Blob([CSV_BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `riepilogo_utenti_${tripName.replace(/\s+/g, '_')}_${filenameDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};