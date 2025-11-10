/**
 * Calcola i bilanci finali e le transazioni ottimizzate per un viaggio
 */

/**
 * Calcola quanto ciascun partecipante ha pagato e quanto dovrebbe pagare
 * 
 * @param {Object} trip - Oggetto viaggio completo
 * @returns {Object} - { balances, transactions }
 */
export const calculateTripBalances = (trip) => {
  const balances = {};
  
  // 🔧 FIX: Inizializza TUTTI i membri (attivi E inattivi)
  Object.entries(trip.sharing.members).forEach(([uid, member]) => {
    balances[uid] = {
      displayName: member.displayName || 'Utente rimosso',  // Fallback
      avatar: member.avatar || null,                         // Fallback
      status: member.status || 'active',                     // 🆕 Aggiungi status
      paid: 0,        // Quanto ha pagato fisicamente
      owes: 0,        // Quanto dovrebbe pagare in totale
      balance: 0      // Differenza (paid - owes)
    };
  });

  // Itera su tutti i giorni e tutte le spese
  trip.days.forEach(day => {
    // Processa ogni chiave nel trip.data per questo giorno
    Object.keys(trip.data).forEach(key => {
      if (!key.startsWith(day.id)) return;
      
      const cellData = trip.data[key];
      
      // Gestisci "altre spese" separatamente
      if (key.endsWith('-otherExpenses')) {
        if (Array.isArray(cellData)) {
          cellData.forEach(expense => {
            processExpense(expense, balances, trip);
          });
        }
      } else {
        // Gestisci categorie standard
        processExpense(cellData, balances, trip);
      }
    });
  });

  // Calcola balance finale per ogni persona
  Object.keys(balances).forEach(uid => {
    balances[uid].balance = balances[uid].paid - balances[uid].owes;
  });

  // Calcola transazioni ottimizzate
  const transactions = optimizeTransactions(balances);

  return { balances, transactions };
};

/**
 * Processa una singola spesa e aggiorna i bilanci
 */
const processExpense = (expense, balances, trip) => {
  if (!expense || !expense.costBreakdown || !Array.isArray(expense.costBreakdown)) {
    return;
  }

  const breakdown = expense.costBreakdown;
  
  // Determina chi ha usufruito
  let participants = expense.participants;
  
  // Fallback: se participants non è specificato, assumi tutti i membri attivi
  if (!participants || participants.length === 0) {
    participants = Object.keys(trip.sharing.members)
      .filter(uid => trip.sharing.members[uid].status === 'active');
  }

  // Calcola totale pagato
  const totalPaid = breakdown.reduce((sum, entry) => sum + entry.amount, 0);
  
  // Calcola quota per partecipante
  const sharePerPerson = totalPaid / participants.length;

  // Aggiorna "quanto ha pagato" per ogni persona nel breakdown
  breakdown.forEach(entry => {
    if (balances[entry.userId]) {
      balances[entry.userId].paid += entry.amount;
    }
  });

  // Aggiorna "quanto deve pagare" per ogni partecipante
  participants.forEach(uid => {
    if (balances[uid]) {
      balances[uid].owes += sharePerPerson;
    }
  });
};

/**
 * Ottimizza le transazioni per minimizzare il numero di pagamenti
 * Algoritmo greedy: abbina il maggior debitore con il maggior creditore
 * 
 * @param {Object} balances - Bilanci calcolati
 * @returns {Array} - Lista di transazioni { from, to, amount, fromName, toName, fromStatus, toStatus }
 */
const optimizeTransactions = (balances) => {
  const transactions = [];
  
  // Crea liste separate di debitori e creditori
  const debtors = [];
  const creditors = [];
  
  Object.entries(balances).forEach(([uid, data]) => {
    if (data.balance < -0.01) { // Tolleranza per errori di arrotondamento
      debtors.push({ 
        uid, 
        amount: -data.balance, 
        name: data.displayName, 
        avatar: data.avatar,
        status: data.status  // 🆕 Includi status
      });
    } else if (data.balance > 0.01) {
      creditors.push({ 
        uid, 
        amount: data.balance, 
        name: data.displayName, 
        avatar: data.avatar,
        status: data.status  // 🆕 Includi status
      });
    }
  });

  // Ordina dal maggiore al minore
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // Abbina debitori e creditori
  let i = 0, j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    // Quanto può essere trasferito
    const transferAmount = Math.min(debtor.amount, creditor.amount);
    
    transactions.push({
      from: debtor.uid,
      to: creditor.uid,
      amount: transferAmount,
      fromName: debtor.name,
      toName: creditor.name,
      fromAvatar: debtor.avatar,
      toAvatar: creditor.avatar,
      fromStatus: debtor.status,    // 🆕 Status per segnalare inattivi
      toStatus: creditor.status      // 🆕 Status per segnalare inattivi
    });
    
    // Aggiorna gli importi rimanenti
    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;
    
    // Passa al prossimo se saldato
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  
  return transactions;
};

/**
 * Formatta un importo in euro con 2 decimali
 */
export const formatCurrency = (amount) => {
  return `${Math.round(amount * 100) / 100}€`;
};

/**
 * Calcola statistiche generali del viaggio
 */
export const getTripStats = (trip, balances) => {
  // 🔧 FIX: Conta solo membri ATTIVI per statistiche
  const activeMembers = Object.values(trip.sharing.members)
    .filter(m => m.status === 'active').length;
  
  // Totale speso da TUTTI (inclusi inattivi)
  const totalSpent = Object.values(balances)
    .reduce((sum, b) => sum + b.paid, 0);
  
  // Calcola quota media considerando le partecipazioni effettive
  const totalOwed = Object.values(balances)
    .reduce((sum, b) => sum + b.owes, 0);
  
  const avgShare = activeMembers > 0 ? totalOwed / activeMembers : 0;
  
  return {
    totalSpent,
    activeMembers,
    avgShare
  };
};