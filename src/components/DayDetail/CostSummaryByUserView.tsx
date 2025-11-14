import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateTripCost } from '../../utils/costsUtils';
import { CATEGORIES } from '../../utils/constants';
import CategoryBreakdownView from './CategoryBreakdownView';
import BudgetView from './BudgetView';
import BalanceView from './BalanceView';
import Avatar from '../Avatar';

interface CostSummaryByUserViewProps {
  trip: any;
  onBack: () => void;
  isDesktop?: boolean;
  origin?: 'dayDetail' | 'home';
  onUpdateTrip?: (updatedTrip: any) => void;
}

type TabType = 'users' | 'categories' | 'budget' | 'balances';

const CostSummaryByUserView: React.FC<CostSummaryByUserViewProps> = ({ 
  trip, 
  onBack, 
  isDesktop = false,
  origin = 'dayDetail',
  onUpdateTrip
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Calcola breakdown per utente includendo SOLO membri ATTIVI
  const userBreakdown = useMemo(() => {
    const breakdown: Record<string, { 
      displayName: string; 
      avatar?: string;
      status: string;
      total: number; 
      byCategory: Record<string, { total: number; count: number; items: any[] }>;
    }> = {};
    
    // Inizializza SOLO membri ATTIVI
    Object.entries(trip.sharing.members).forEach(([uid, member]: [string, any]) => {
      if (member.status === 'active') {
        breakdown[uid] = {
          displayName: member.displayName,
          avatar: member.avatar,
          status: 'active',
          total: 0,
          byCategory: {}
        };
      }
    });

    // Aggrega costi per utente (solo membri attivi)
    trip.days.forEach(day => {
      const baseKey = `${day.id}-base`;
      const baseTitle = trip.data[baseKey]?.title || `Giorno ${day.number}`;

      // CATEGORIE STANDARD
      CATEGORIES.forEach(cat => {
        if (cat.id === 'base' || cat.id === 'note') return;
        
        const key = `${day.id}-${cat.id}`;
        const cellData = trip.data[key];
        
        if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
          cellData.costBreakdown.forEach(entry => {
            // Considera solo membri attivi
            if (breakdown[entry.userId]) {
              breakdown[entry.userId].total += entry.amount;
              
              const categoryKey = cat.label;
              if (!breakdown[entry.userId].byCategory[categoryKey]) {
                breakdown[entry.userId].byCategory[categoryKey] = { 
                  total: 0, 
                  count: 0,
                  items: []
                };
              }
              
              breakdown[entry.userId].byCategory[categoryKey].total += entry.amount;
              breakdown[entry.userId].byCategory[categoryKey].count += 1;
              breakdown[entry.userId].byCategory[categoryKey].items.push({
                day: day.number,
                base: baseTitle,
                title: cellData.title || cat.label,
                amount: entry.amount
              });
            }
          });
        }
      });

      // ALTRE SPESE
      const otherExpensesKey = `${day.id}-otherExpenses`;
      const otherExpenses = trip.data[otherExpensesKey];
      
      if (otherExpenses && Array.isArray(otherExpenses)) {
        otherExpenses.forEach(expense => {
          if (expense.costBreakdown && Array.isArray(expense.costBreakdown)) {
            expense.costBreakdown.forEach(entry => {
              // Considera solo membri attivi
              if (breakdown[entry.userId]) {
                breakdown[entry.userId].total += entry.amount;
                
                const categoryKey = 'Altre Spese';
                if (!breakdown[entry.userId].byCategory[categoryKey]) {
                  breakdown[entry.userId].byCategory[categoryKey] = { 
                    total: 0, 
                    count: 0,
                    items: []
                  };
                }
                
                breakdown[entry.userId].byCategory[categoryKey].total += entry.amount;
                breakdown[entry.userId].byCategory[categoryKey].count += 1;
                breakdown[entry.userId].byCategory[categoryKey].items.push({
                  day: day.number,
                  base: baseTitle,
                  title: expense.title || 'Altra Spesa',
                  amount: entry.amount
                });
              }
            });
          }
        });
      }
    });

    // Filtra solo utenti che hanno effettivamente speso qualcosa
    const filteredBreakdown: typeof breakdown = {};
    Object.entries(breakdown).forEach(([uid, data]) => {
      if (data.total > 0) {
        filteredBreakdown[uid] = data;
      }
    });

    return filteredBreakdown;
  }, [trip]);

  // 🆕 FIX: Ottieni membri usciti da costHistory (SOLO ultimo snapshot per utente)
  const historicalUsers = useMemo(() => {
    if (!trip.costHistory || trip.costHistory.length === 0) {
      return [];
    }

    // 🆕 Crea una mappa: userId -> ultimo snapshot
    const userSnapshotMap = new Map();
    
    trip.costHistory.forEach((entry: any) => {
      const existing = userSnapshotMap.get(entry.userId);
      
      // Mantieni solo lo snapshot più recente per ogni userId
      if (!existing || new Date(entry.leftAt) > new Date(existing.leftAt)) {
        userSnapshotMap.set(entry.userId, {
          userId: entry.userId,
          displayName: entry.displayName,
          avatar: entry.avatar,
          leftAt: entry.leftAt,
          snapshot: entry.snapshot
        });
      }
    });

    // Converti Map in Array, ordinato per data (più recente prima)
    return Array.from(userSnapshotMap.values())
      .sort((a, b) => new Date(b.leftAt).getTime() - new Date(a.leftAt).getTime());
  }, [trip.costHistory]);

  // Ordina utenti per spesa totale (dal più alto al più basso)
  const sortedUserBreakdown = useMemo(() => {
    return Object.entries(userBreakdown)
      .sort(([, a], [, b]) => b.total - a.total);
  }, [userBreakdown]);

  const tripTotal = useMemo(() => {
    return calculateTripCost(trip);
  }, [trip.data, trip.days]);

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Colori per le categorie
  const categoryColors = [
    'bg-blue-500',
    'bg-purple-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500'
  ];

  return (
    <div 
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ 
        maxWidth: isDesktop ? '100%' : '430px',
        margin: '0 auto'
      }}
    >
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">Riepilogo Spese</h1>
          <div className="w-10"></div>
        </div>

        {/* 🆕 TABS MIGLIORATI - Grid layout con emoji sopra */}
        <div className="grid grid-cols-4 border-t">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-1 text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1 ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">👥</span>
            <span className="leading-tight">Per Utente</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2.5 px-1 text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1 ${
              activeTab === 'categories'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">📊</span>
            <span className="leading-tight">Categoria</span>
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`py-2.5 px-1 text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1 ${
              activeTab === 'budget'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">💰</span>
            <span className="leading-tight">Budget</span>
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`py-2.5 px-1 text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1 ${
              activeTab === 'balances'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">🔄</span>
            <span className="leading-tight">Bilanci</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <div className="p-4 space-y-4">
          {/* Totale complessivo */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-sm opacity-90 mb-1">Totale Viaggio</p>
            <p className="text-4xl font-bold">{Math.round(tripTotal)}€</p>
            <p className="text-xs opacity-75 mt-2">
              {sortedUserBreakdown.length} {sortedUserBreakdown.length === 1 ? 'persona' : 'persone'} • {trip.days.length} {trip.days.length === 1 ? 'giorno' : 'giorni'}
            </p>
          </div>

          {/* Lista utenti ATTIVI */}
          {sortedUserBreakdown.map(([userId, data]) => {
            const categories = Object.entries(data.byCategory).sort(([, a], [, b]) => b.total - a.total);
            const totalItems = categories.reduce((sum, [, cat]) => sum + cat.count, 0);
            const isExpanded = expandedUsers.has(userId);
            const userPercentage = tripTotal > 0 ? (data.total / tripTotal) * 100 : 0;

            return (
              <div 
                key={userId}
                className="bg-white rounded-xl shadow overflow-hidden"
              >
                <button
                  onClick={() => toggleUserExpansion(userId)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <Avatar 
                    src={data.avatar} 
                    name={data.displayName} 
                    size="lg"
                  />
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">
                      {data.displayName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {totalItems} {totalItems === 1 ? 'spesa' : 'spese'} • {categories.length} {categories.length === 1 ? 'categoria' : 'categorie'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {Math.round(data.total)}€
                      </p>
                      <p className="text-xs text-gray-500">
                        {userPercentage.toFixed(0)}% del totale
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {categories.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      {categories.map(([catName, catData], idx) => {
                        const percentage = (catData.total / data.total) * 100;
                        return (
                          <div
                            key={catName}
                            className={`${categoryColors[idx % categoryColors.length]} transition-all`}
                            style={{ width: `${percentage}%` }}
                            title={`${catName}: ${Math.round(catData.total)}€`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t">
                    {categories.map(([catName, catData], idx) => (
                      <div key={catName} className="pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${categoryColors[idx % categoryColors.length]}`} />
                            <span className="font-medium text-sm">{catName}</span>
                            <span className="text-xs text-gray-500">({catData.count})</span>
                          </div>
                          <span className="font-semibold text-blue-600">
                            {Math.round(catData.total)}€
                          </span>
                        </div>
                        
                        <div className="space-y-1 ml-5">
                          {catData.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex justify-between text-xs text-gray-600">
                              <span>G{item.day} • {item.base} • {item.title}</span>
                              <span>{Math.round(item.amount)}€</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 🆕 MEMBRI USCITI (da costHistory) - MOSTRATI IN FONDO */}
          {historicalUsers.map((histUser: any) => {
            const snapshot = histUser.snapshot;
            const categories = Object.entries(snapshot.byCategory).sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total);
            const totalItems = categories.reduce((sum, [, cat]: [string, any]) => sum + cat.count, 0);
            const isExpanded = expandedUsers.has(`historical-${histUser.userId}`);

            return (
              <div 
                key={`historical-${histUser.userId}`}
                className="bg-white rounded-xl shadow border-2 border-dashed border-gray-300 opacity-75 overflow-hidden"
              >
                <button
                  onClick={() => toggleUserExpansion(`historical-${histUser.userId}`)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <Avatar 
                    src={histUser.avatar} 
                    name={histUser.displayName} 
                    size="lg"
                    className="grayscale opacity-60"
                  />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-600">
                        {histUser.displayName}
                      </h3>
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium uppercase">
                        Uscito
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {totalItems} {totalItems === 1 ? 'spesa' : 'spese'} • {categories.length} {categories.length === 1 ? 'categoria' : 'categorie'}
                    </p>
                    {/* 🆕 DATA DI USCITA */}
                    <p className="text-xs text-gray-400 mt-1">
                      Uscito il {new Date(histUser.leftAt).toLocaleDateString('it-IT', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-600">
                        {Math.round(snapshot.total)}€
                      </p>
                      <p className="text-xs text-gray-500">storico</p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </button>

                {categories.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      {categories.map(([catName, catData]: [string, any], idx) => {
                        const percentage = (catData.total / snapshot.total) * 100;
                        return (
                          <div
                            key={catName}
                            className={`${categoryColors[idx % categoryColors.length]} opacity-50 transition-all`}
                            style={{ width: `${percentage}%` }}
                            title={`${catName}: ${Math.round(catData.total)}€`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t bg-gray-50">
                    {categories.map(([catName, catData]: [string, any], idx) => (
                      <div key={catName} className="pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${categoryColors[idx % categoryColors.length]} opacity-50`} />
                            <span className="font-medium text-sm text-gray-700">{catName}</span>
                            <span className="text-xs text-gray-500">({catData.count})</span>
                          </div>
                          <span className="font-semibold text-gray-600">
                            {Math.round(catData.total)}€
                          </span>
                        </div>
                        
                        <div className="space-y-1 ml-5">
                          {catData.items.map((item: any, itemIdx: number) => (
                            <div key={itemIdx} className="flex justify-between text-xs text-gray-600">
                              <span>G{item.day} • {item.base} • {item.title}</span>
                              <span>{Math.round(item.amount)}€</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Messaggio se nessuna spesa */}
          {sortedUserBreakdown.length === 0 && historicalUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg mb-2">💸</p>
              <p>Nessuna spesa registrata ancora.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <CategoryBreakdownView trip={trip} />
      )}

      {activeTab === 'budget' && onUpdateTrip && (
        <BudgetView trip={trip} onUpdateTrip={onUpdateTrip} />
      )}

      {activeTab === 'balances' && (
        <BalanceView trip={trip} />
      )}
    </div>
  );
};

export default CostSummaryByUserView;