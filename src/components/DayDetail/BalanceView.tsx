import React, { useMemo } from 'react';
import { calculateTripBalances, getTripStats } from '../../utils/balanceCalculator';
import { exportBalancesToCSV } from '../../utils/csvExporter';
import Avatar from '../Avatar';
import { ArrowRight } from 'lucide-react';

interface BalanceViewProps {
  trip: any;
}

const BalanceView: React.FC<BalanceViewProps> = ({ trip }) => {
  // Calcola bilanci e transazioni
  const { balances, transactions } = useMemo(() => {
    return calculateTripBalances(trip);
  }, [trip]);

  // Calcola statistiche generali
  const stats = useMemo(() => {
    return getTripStats(trip, balances);
  }, [trip, balances]);

  // Ordina utenti per bilancio (creditori prima, poi debitori)
  const sortedBalances = useMemo(() => {
    return Object.entries(balances).sort(([, a], [, b]) => b.balance - a.balance);
  }, [balances]);

  // Handler per copiare riepilogo
  const handleCopyToClipboard = () => {
    const summary = `📊 Riepilogo Bilanci - ${trip.metadata?.name || 'Viaggio'}\n\n` +
      `Totale speso: ${Math.round(stats.totalSpent)}€\n` +
      `Partecipanti: ${stats.activeMembers}\n\n` +
      `💸 Transazioni da effettuare:\n` +
      (transactions.length > 0 
        ? transactions.map(t => `• ${t.fromName} → ${t.toName}: ${Math.round(t.amount)}€`).join('\n')
        : '✅ Tutto in pari!'
      );
    
    navigator.clipboard.writeText(summary);
    alert('Riepilogo copiato negli appunti!');
  };

  // Handler per esportare CSV
  const handleExportCSV = () => {
    exportBalancesToCSV(trip, balances, transactions);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Riepilogo Generale */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Riepilogo Generale</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm opacity-90">Totale speso</span>
            <span className="text-2xl font-bold">{Math.round(stats.totalSpent)}€</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="opacity-90">Partecipanti attivi</span>
            <span className="font-medium">{stats.activeMembers}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="opacity-90">Quota media per persona</span>
            <span className="font-medium">{Math.round(stats.avgShare)}€</span>
          </div>
        </div>
      </div>

      {/* Situazione Individuale */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-800 px-2">👤 Situazione Individuale</h3>
        
        {sortedBalances.map(([uid, data]) => {
          const isCreditor = data.balance > 0.01;
          const isDebtor = data.balance < -0.01;
          const isBalanced = !isCreditor && !isDebtor;

          return (
            <div key={uid} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={data.avatar} name={data.displayName} size="md" />
                <div className="flex-1">
                  <h4 className="font-semibold">{data.displayName}</h4>
                  <p className="text-xs text-gray-500">
                    {isCreditor && '💚 In credito'}
                    {isDebtor && '🔴 In debito'}
                    {isBalanced && '✅ In pari'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    isCreditor ? 'text-green-600' : 
                    isDebtor ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {isCreditor && '+'}
                    {Math.round(data.balance)}€
                  </p>
                </div>
              </div>

              {/* Dettagli */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Ha pagato</p>
                  <p className="font-medium">{Math.round(data.paid)}€</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Doveva pagare</p>
                  <p className="font-medium">{Math.round(data.owes)}€</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transazioni Suggerite */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-800 px-2">💸 Come Regolare i Conti</h3>
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-gray-600 mb-3">
              Per pareggiare i conti bastano <span className="font-bold text-blue-600">{transactions.length}</span> {transactions.length === 1 ? 'transazione' : 'transazioni'}:
            </p>
            
            <div className="space-y-3">
              {transactions.map((transaction, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    {/* Da */}
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar 
                        src={transaction.fromAvatar} 
                        name={transaction.fromName} 
                        size="sm" 
                      />
                      <span className="font-medium text-sm">{transaction.fromName}</span>
                    </div>

                    {/* Freccia e importo */}
                    <div className="flex items-center gap-2 px-3">
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="font-bold text-blue-600">
                        {Math.round(transaction.amount)}€
                      </span>
                      <ArrowRight size={16} className="text-gray-400" />
                    </div>

                    {/* A */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="font-medium text-sm">{transaction.toName}</span>
                      <Avatar 
                        src={transaction.toAvatar} 
                        name={transaction.toName} 
                        size="sm" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nessuna transazione necessaria */}
      {transactions.length === 0 && (
        <div className="bg-green-50 rounded-xl p-6 border border-green-100 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-semibold text-green-800">Tutto in pari!</p>
          <p className="text-sm text-green-600 mt-1">
            Non ci sono debiti da saldare
          </p>
        </div>
      )}

      {/* 🆕 Bottoni azioni */}
      <div className="flex gap-2">
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          📋 Copia
        </button>
        <button
          onClick={handleExportCSV}
          className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          📥 CSV
        </button>
      </div>
    </div>
  );
};

export default BalanceView;