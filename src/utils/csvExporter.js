/**
 * Utility per esportare i dati del viaggio in formato CSV
 */

/**
 * Escape di valori CSV per gestire caratteri speciali
 */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Se contiene punto e virgola, virgolette o a capo → racchiudi in virgolette e raddoppia le virgolette interne
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Genera CSV con le transazioni da effettuare
 */
const generateTransactionsCSV = (transactions) => {
  if (transactions.length === 0) {
    return 'Da;Status Da;A;Status A;Importo\n(Nessuna transazione necessaria)';
  }

  const header = 'Da;Status Da;A;Status A;Importo';
  const rows = transactions.map(t => 
    [
      escapeCSV(t.fromName),
      t.fromStatus === 'active' ? 'Attivo' : 'Uscito',
      escapeCSV(t.toName),
      t.toStatus === 'active' ? 'Attivo' : 'Uscito',
      t.amount.toFixed(2)
    ].join(';')
  );

  return [header, ...rows].join('\n');
};

/**
 * Genera CSV con i bilanci personali
 */
const generateBalancesCSV = (balances) => {
  const header = 'Nome;Status;Ha Pagato;Doveva Pagare;Bilancio';
  
  const rows = Object.values(balances)
    .sort((a, b) => {
      // 🔧 FIX: Attivi prima, poi per bilancio
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return b.balance - a.balance;
    })
    .map(b => 
      [
        escapeCSV(b.displayName),
        b.status === 'active' ? 'Attivo' : 'Uscito',  // 🆕 Colonna Status
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
    '',  // 🆕 Colonna status vuota per totale
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
  const header = 'Giorno;Data;Luogo;Categoria;Descrizione;Chi ha pagato;Status;Importo;Partecipanti';
  const rows = [];

  trip.days.forEach(day => {
    // Ottieni la base del giorno
    const baseKey = `${day.id}-base`;
    const baseTitle = trip.data[baseKey]?.title || '';

    // Processa tutte le spese del giorno
    Object.keys(trip.data).forEach(key => {
      if (!key.startsWith(day.id)) return;

      const cellData = trip.data[key];

      // Gestisci "altre spese" separatamente
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
        // Gestisci categorie standard
        const categoryId = key.split('-')[1];
        
        // Salta base e note
        if (categoryId === 'base' || categoryId === 'note') return;
        
        // Trova il nome della categoria
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
 */
const generateExpenseRows = (day, baseTitle, categoryName, description, expense, trip) => {
  const rows = [];
  
  // Determina partecipanti
  let participants = expense.participants || [];
  if (participants.length === 0) {
    participants = Object.keys(trip.sharing.members)
      .filter(uid => trip.sharing.members[uid].status === 'active');
  }

  // Converti UIDs in nomi
  const participantNames = participants
    .map(uid => trip.sharing.members[uid]?.displayName || 'Sconosciuto')
    .join(', ');

  // Crea una riga per ogni persona che ha pagato
  expense.costBreakdown.forEach(entry => {
    if (entry.amount > 0) {
      const member = trip.sharing.members[entry.userId];
      const paidByName = member?.displayName || 'Sconosciuto';
      const paidByStatus = member?.status === 'active' ? 'Attivo' : 'Uscito';  // 🆕 Status
      
      rows.push([
        day.number,
        day.date || '',
        escapeCSV(baseTitle),
        escapeCSV(categoryName),
        escapeCSV(description),
        escapeCSV(paidByName),
        paidByStatus,  // 🆕 Colonna Status
        entry.amount.toFixed(2),
        escapeCSV(participantNames)
      ].join(';'));
    }
  });

  return rows;
};

/**
 * Helper per ottenere il nome di una categoria dall'ID
 */
const getCategoryName = (categoryId) => {
  const categoryMap = {
    'pernottamento': 'Pernottamento',
    'attivita1': 'Attività',
    'attivita2': 'Attività',
    'attivita3': 'Attività',
    'spostamenti1': 'Spostamenti',
    'spostamenti2': 'Spostamenti',
    'ristori1': 'Ristori',
    'ristori2': 'Ristori'
  };
  return categoryMap[categoryId] || categoryId;
};

/**
 * Funzione principale per esportare i bilanci in CSV
 */
export const exportBalancesToCSV = (trip, balances, transactions) => {
  // BOM per supporto UTF-8 in Excel
  const BOM = '\uFEFF';
  
  // 🔧 FIX: Formatta data in formato italiano (gg/mm/aaaa)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateString = `${day}/${month}/${year}`;
  const filenameDate = `${year}-${month}-${day}`;
  
  // Genera le tre sezioni
  const transactionsCSV = generateTransactionsCSV(transactions);
  const balancesCSV = generateBalancesCSV(balances);
  const detailedCSV = generateDetailedExpensesCSV(trip);

  // Combina tutto in un unico CSV con separatori
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

  // Crea il blob
  const blob = new Blob([BOM + fullCSV], { type: 'text/csv;charset=utf-8;' });
  
  // Genera nome file
  const tripName = trip.metadata?.name || 'Viaggio';
  const sanitizedName = tripName.replace(/[^a-z0-9_\-]/gi, '_');
  const filename = `bilanci_${sanitizedName}_${filenameDate}.csv`;

  // Trigger download
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
 * Funzione per esportare riepilogo costi per utente (se necessario)
 */
export const exportUserBreakdownToCSV = (trip, userBreakdown) => {
  const tripName = trip.metadata?.name || 'Viaggio';
  
  // Formatta data
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateString = `${day}/${month}/${year}`;
  const filenameDate = `${year}-${month}-${day}`;
  
  const BOM = '\uFEFF';
  
  let csvContent = `RIEPILOGO COSTI PER UTENTE - ${tripName}\n`;
  csvContent += `Esportato il: ${dateString}\n\n`;
  
  // Header
  csvContent += 'Nome;Status;Totale Speso;Numero Spese;Categorie\n';
  
  // Dati utenti
  Object.entries(userBreakdown).forEach(([uid, data]) => {
    const memberStatus = trip.sharing.members[uid]?.status || 'active';
    const status = memberStatus === 'active' ? 'Attivo' : 'Uscito';
    const totalItems = Object.values(data.byCategory).reduce((sum, cat) => sum + cat.count, 0);
    const categories = Object.keys(data.byCategory).join('; ');
    
    csvContent += `${escapeCSV(data.displayName)};${status};${data.total.toFixed(2)};${totalItems};${escapeCSV(categories)}\n`;
  });
  
  // Crea blob e download
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
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