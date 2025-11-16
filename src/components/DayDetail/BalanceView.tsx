import React, { useMemo } from 'react';
import { calculateTripBalances, getTripStats } from '../../utils/balanceCalculator';
import { exportBalancesToCSV } from '../../utils/csvExporter';
import Avatar from '../Avatar';
import { ArrowRight } from 'lucide-react';

interface BalanceViewProps {
  trip: any;
  isDesktop?: boolean;
}

const BalanceView: React.FC<BalanceViewProps> = ({ trip, isDesktop = false }) => {
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
    <div className={`${isDesktop ? 'space-y-3' : 'space-y-4'}`}>
      {/* Riepilogo Generale - Versione compatta Opzione A con spacing aumentato */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-4">
        {/* Riga 1: Base identica alle altre tab */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs opacity-75">Totale</span>
            <span className="text-3xl font-bold">{Math.round(stats.totalSpent)}€</span>
          </div>
          <div className="text-sm opacity-90">
            {stats.activeMembers} {stats.activeMembers === 1 ? 'pers' : 'pers'} • {trip.days?.length || 0} {trip.days?.length === 1 ? 'gg' : 'gg'}
          </div>
        </div>
        
        {/* Riga 2: Quota media evidenziata */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <span className="text-xs opacity-75">Media per persona</span>
          <span className="text-xl font-bold">{Math.round(stats.avgShare)}€</span>
        </div>
      </div>

      {/* Situazione Individuale - Versione compatta con badge */}
      <div className={`${isDesktop ? 'space-y-2' : 'space-y-3'}`}>
        <h3 className="text-base font-semibold text-gray-800 px-2">👤 Situazione Individuale</h3>
        
        {sortedBalances.map(([uid, data]) => {
          const isCreditor = data.balance > 0.01;
          const isDebtor = data.balance < -0.01;
          const isBalanced = !isCreditor && !isDebtor;

          return (
            <div key={uid} className="bg-white rounded-xl shadow p-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <Avatar src={data.avatar} name={data.displayName} size="md" />
                
                {/* Info principale */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{data.displayName}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Pagato {Math.round(data.paid)}€</span>
                    <span>•</span>
                    <span>Doveva {Math.round(data.owes)}€</span>
                  </div>
                </div>
                
                {/* Balance con badge */}
                <div className="flex flex-col items-end gap-1">
                  <p className={`text-lg font-bold ${
                    isCreditor ? 'text-green-600' : 
                    isDebtor ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {isCreditor && '+'}
                    {Math.round(data.balance)}€
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isCreditor ? 'bg-green-100 text-green-700' : 
                    isDebtor ? 'bg-red-100 text-red-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {isCreditor && 'Credito'}
                    {isDebtor && 'Debito'}
                    {isBalanced && 'In pari'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transazioni Suggerite */}
      {transactions.length > 0 && (
        <div className={`${isDesktop ? 'space-y-2' : 'space-y-3'}`}>
          <h3 className="text-base font-semibold text-gray-800 px-2">💸 Come Regolare i Conti</h3>
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-gray-600 mb-3">
              Per pareggiare i conti bastano <span className="font-bold text-blue-600">{transactions.length}</span> {transactions.length === 1 ? 'transazione' : 'transazioni'}:
            </p>
            
            <div className={`${isDesktop ? 'space-y-2' : 'space-y-3'}`}>
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