/**
 * Calcola i bilanci finali e le transazioni ottimizzate per un viaggio
 * 🔧 AGGIORNATO: Filtra solo membri ATTIVI nei calcoli
 */

/**
 * Calcola quanto ciascun partecipante ha pagato e quanto dovrebbe pagare
 * 
 * @param {Object} trip - Oggetto viaggio completo
 * @returns {Object} - { balances, transactions }
 */
export const calculateTripBalances = (trip) => {
  const balances = {};
  
  // 🔧 Inizializza SOLO membri ATTIVI
  Object.entries(trip.sharing.members).forEach(([uid, member]) => {
    if (member.status === 'active') {  // ⭐ FILTRO ATTIVI
      balances[uid] = {
        displayName: member.displayName || 'Utente',
        avatar: member.avatar || null,
        status: 'active',
        paid: 0,        // Quanto ha pagato fisicamente
        owes: 0,        // Quanto dovrebbe pagare in totale
        balance: 0      // Differenza (paid - owes)
      };
    }
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
 * 🔧 AGGIORNATO: Considera solo membri attivi
 */
const processExpense = (expense, balances, trip) => {
  if (!expense || !expense.costBreakdown || !Array.isArray(expense.costBreakdown)) {
    return;
  }

  const breakdown = expense.costBreakdown;
  
  // Determina chi ha usufruito (solo membri attivi)
  let participants = expense.participants;
  
  // Fallback: se participants non è specificato, assumi tutti i membri attivi
  if (!participants || participants.length === 0) {
    participants = Object.keys(trip.sharing.members)
      .filter(uid => trip.sharing.members[uid].status === 'active');
  } else {
    // ⭐ Filtra participants per includere solo membri attivi
    participants = participants.filter(uid => 
      trip.sharing.members[uid] && trip.sharing.members[uid].status === 'active'
    );
  }

  // Se non ci sono partecipanti attivi, salta
  if (participants.length === 0) return;

  // Calcola totale pagato (solo da membri attivi)
  const totalPaid = breakdown
    .filter(entry => balances[entry.userId]) // Solo membri attivi
    .reduce((sum, entry) => sum + entry.amount, 0);
  
  // Calcola quota per partecipante
  const sharePerPerson = totalPaid / participants.length;

  // Aggiorna "quanto ha pagato" per ogni persona nel breakdown (solo attivi)
  breakdown.forEach(entry => {
    if (balances[entry.userId]) {
      balances[entry.userId].paid += entry.amount;
    }
  });

  // Aggiorna "quanto deve pagare" per ogni partecipante (solo attivi)
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
 * @returns {Array} - Lista di transazioni { from, to, amount, fromName, toName, fromAvatar, toAvatar }
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
        avatar: data.avatar
      });
    } else if (data.balance > 0.01) {
      creditors.push({ 
        uid, 
        amount: data.balance, 
        name: data.displayName, 
        avatar: data.avatar
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
      toAvatar: creditor.avatar
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
 * 🔧 AGGIORNATO: Conta solo membri ATTIVI
 */
export const getTripStats = (trip, balances) => {
  // 🔧 Conta solo membri ATTIVI
  const activeMembers = Object.values(trip.sharing.members)
    .filter(m => m.status === 'active').length;
  
  // Totale speso (solo da membri attivi)
  const totalSpent = Object.values(balances)
    .reduce((sum, b) => sum + b.paid, 0);
  
  // Calcola quota media considerando solo membri attivi
  const totalOwed = Object.values(balances)
    .reduce((sum, b) => sum + b.owes, 0);
  
  const avgShare = activeMembers > 0 ? totalOwed / activeMembers : 0;
  
  return {
    totalSpent,
    activeMembers,
    avgShare
  };
};