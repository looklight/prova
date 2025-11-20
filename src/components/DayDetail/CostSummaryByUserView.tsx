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

// 🆕 Configurazione tab per animazione
const TAB_CONFIG = [
  { id: 'users' as const, icon: '👥', label: 'Per Utente' },
  { id: 'categories' as const, icon: '📊', label: 'Categoria' },
  { id: 'budget' as const, icon: '💰', label: 'Budget' },
  { id: 'balances' as const, icon: '🔄', label: 'Bilanci' },
];

const CostSummaryByUserView: React.FC<CostSummaryByUserViewProps> = ({
  trip,
  onBack,
  isDesktop = false,
  origin = 'dayDetail',
  onUpdateTrip
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // 🆕 Calcola indice tab attivo per animazione barra
  const activeTabIndex = TAB_CONFIG.findIndex(t => t.id === activeTab);

  // 🆕 Calcola membri ATTIVI (indipendentemente da chi ha speso)
  const activeMembers = useMemo(() => {
    return Object.values(trip.sharing?.members || {})
      .filter((m: any) => m.status === 'active').length;
  }, [trip.sharing?.members]);

  // Calcola breakdown per utente includendo SOLO membri ATTIVI + Partecipazione
  const userBreakdown = useMemo(() => {
    const breakdown: Record<string, {
      displayName: string;
      avatar?: string;
      status: string;
      total: number;
      byCategory: Record<string, { total: number; count: number; items: any[] }>;
      participatedCount: number;
      totalExpenses: number;
      excludedExpenses: Array<{ day: number; category: string }>;
    }> = {};

    // Inizializza SOLO membri ATTIVI
    Object.entries(trip.sharing.members).forEach(([uid, member]: [string, any]) => {
      if (member.status === 'active') {
        breakdown[uid] = {
          displayName: member.displayName,
          avatar: member.avatar,
          status: 'active',
          total: 0,
          byCategory: {},
          participatedCount: 0,
          totalExpenses: 0,
          excludedExpenses: []
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

        if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown) && cellData.costBreakdown.length > 0) {
          // ✅ Usa participants per determinare chi ha USUFRUITO
          const participants = cellData.participants || [];

          // Conta come spesa per calcolo partecipazione
          Object.keys(breakdown).forEach(uid => {
            breakdown[uid].totalExpenses++;

            // ✅ CORRETTO: Controlla se utente è nei participants (ha usufruito)
            if (participants.includes(uid)) {
              // Utente ha USUFRUITO (partecipato)
              breakdown[uid].participatedCount++;

              // Calcola quanto ha PAGATO per il totale
              const userEntry = cellData.costBreakdown.find(entry => entry.userId === uid);
              if (userEntry && userEntry.amount > 0) {
                breakdown[uid].total += userEntry.amount;

                const categoryKey = cat.label;
                if (!breakdown[uid].byCategory[categoryKey]) {
                  breakdown[uid].byCategory[categoryKey] = {
                    total: 0,
                    count: 0,
                    items: []
                  };
                }

                breakdown[uid].byCategory[categoryKey].total += userEntry.amount;
                breakdown[uid].byCategory[categoryKey].count += 1;
                breakdown[uid].byCategory[categoryKey].items.push({
                  day: day.number,
                  base: baseTitle,
                  title: cellData.title || cat.label,
                  amount: userEntry.amount
                });
              }
            } else {
              // ✅ Utente NON ha usufruito (escluso)
              breakdown[uid].excludedExpenses.push({
                day: day.number,
                category: cat.label
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
          if (expense.costBreakdown && Array.isArray(expense.costBreakdown) && expense.costBreakdown.length > 0) {
            // ✅ Usa participants per determinare chi ha USUFRUITO
            const participants = expense.participants || [];

            // Conta come spesa per calcolo partecipazione
            Object.keys(breakdown).forEach(uid => {
              breakdown[uid].totalExpenses++;

              // ✅ CORRETTO: Controlla se utente è nei participants (ha usufruito)
              if (participants.includes(uid)) {
                // Utente ha USUFRUITO (partecipato)
                breakdown[uid].participatedCount++;

                // Calcola quanto ha PAGATO per il totale
                const userEntry = expense.costBreakdown.find(entry => entry.userId === uid);
                if (userEntry && userEntry.amount > 0) {
                  breakdown[uid].total += userEntry.amount;

                  const categoryKey = 'Altre Spese';
                  if (!breakdown[uid].byCategory[categoryKey]) {
                    breakdown[uid].byCategory[categoryKey] = {
                      total: 0,
                      count: 0,
                      items: []
                    };
                  }

                  breakdown[uid].byCategory[categoryKey].total += userEntry.amount;
                  breakdown[uid].byCategory[categoryKey].count += 1;
                  breakdown[uid].byCategory[categoryKey].items.push({
                    day: day.number,
                    base: baseTitle,
                    title: expense.title || 'Altra Spesa',
                    amount: userEntry.amount
                  });
                }
              } else {
                // ✅ Utente NON ha usufruito (escluso)
                breakdown[uid].excludedExpenses.push({
                  day: day.number,
                  category: expense.title || 'Altra Spesa'
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

  // ✅ FIX: Ottieni membri usciti da history.removedMembers (con debug e fallback)
  const historicalUsers = useMemo(() => {
    if (!trip.history?.removedMembers || trip.history.removedMembers.length === 0) {
      return [];
    }

    // Mappa i dati da history.removedMembers al formato richiesto dal componente
    return trip.history.removedMembers.map((entry: any) => {
      // ✅ Supporta sia totalPaid che total (per compatibilità)
      const totalAmount = entry.totalPaid ?? entry.total ?? 0;

      return {
        userId: entry.userId,
        displayName: entry.displayName,
        avatar: entry.avatar,
        leftAt: entry.removedAt,
        snapshot: {
          total: totalAmount,
          byCategory: entry.byCategory || {}
        }
      };
    })
      .sort((a, b) => new Date(b.leftAt).getTime() - new Date(a.leftAt).getTime());
  }, [trip.history?.removedMembers]);

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
        margin: isDesktop ? '0' : '0 auto',
        width: '100%'
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

        {/* 🆕 TABS CON ANIMAZIONE PREMIUM - Opzione 3 */}
        <div className="grid grid-cols-4 border-t relative">
          {/* 🆕 Barra animata spessa con glow effect */}
          <div
            className="absolute bottom-0 h-1 bg-blue-600 transition-all duration-300 ease-out shadow-lg shadow-blue-400/50 rounded-t-sm"
            style={{
              left: `${activeTabIndex * 25}%`,
              width: '25%'
            }}
          />

          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-1 text-xs font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1 relative ${activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="leading-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🆕 Content con fade animation e padding ottimizzato */}
      <div className="flex-1 transition-opacity duration-200" key={activeTab}>
        {activeTab === 'users' && (
          <div className={`${isDesktop ? 'p-3' : 'p-4'} space-y-4`}>
            {/* Totale complessivo - Ultra Compatta */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs opacity-75">Totale</span>
                  <span className="text-3xl font-bold">{Math.round(tripTotal)}€</span>
                </div>
                <div className="text-sm opacity-90">
                  {activeMembers} {activeMembers === 1 ? 'pers' : 'pers'} • {trip.days.length} {trip.days.length === 1 ? 'gg' : 'gg'}
                </div>
              </div>
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

                      {/* 🆕 Sezione Partecipazione (solo se ci sono esclusioni) */}
                      {data.excludedExpenses && data.excludedExpenses.length > 0 && (
                        <div className="pt-4 mt-4 border-t border-gray-200">
                          {/* Barra partecipazione */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-600">
                              Partecipazione: {data.participatedCount}/{data.totalExpenses} spese
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              {Math.round((data.participatedCount / data.totalExpenses) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${(data.participatedCount / data.totalExpenses) * 100}%` }}
                            />
                          </div>

                          {/* Lista esclusioni minimal (max 5) */}
                          <div className="space-y-1">
                            {data.excludedExpenses.slice(0, 5).map((expense, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-gray-500">
                                <span className="text-red-400 mt-0.5">✕</span>
                                <span>G{expense.day} • {expense.category}</span>
                              </div>
                            ))}
                            {data.excludedExpenses.length > 5 && (
                              <div className="text-xs text-gray-400 mt-1 ml-4">
                                ... e altre {data.excludedExpenses.length - 5} spese
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 🆕 MEMBRI USCITI (da history.removedMembers) - MOSTRATI IN FONDO */}
            {historicalUsers.length > 0 && (
              <div className="pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">
                  Storico Membri Usciti
                </h3>
                {historicalUsers.map((histUser: any) => {
                  const snapshot = histUser.snapshot;
                  const categories = Object.entries(snapshot.byCategory).sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total);
                  const totalItems = categories.reduce((sum, [, cat]: [string, any]) => sum + cat.count, 0);
                  const isExpanded = expandedUsers.has(`historical-${histUser.userId}`);

                  return (
                    <div
                      key={`historical-${histUser.userId}`}
                      className="bg-white rounded-xl shadow border-2 border-dashed border-gray-300 opacity-75 overflow-hidden mb-3"
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
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-600">
                              {Math.round(snapshot?.total || 0)}€
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
              </div>
            )}

            {/* Messaggio se nessuna spesa */}
            {sortedUserBreakdown.length === 0 && historicalUsers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg mb-2">💸</p>
                <p>Nessun utente ha ancora registrato spese.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className={isDesktop ? 'p-3' : 'p-4'}>
            <CategoryBreakdownView trip={trip} isDesktop={isDesktop} />
          </div>
        )}

        {activeTab === 'budget' && onUpdateTrip && (
          <div className={isDesktop ? 'p-3' : 'p-4'}>
            <BudgetView trip={trip} onUpdateTrip={onUpdateTrip} isDesktop={isDesktop} />
          </div>
        )}

        {activeTab === 'balances' && (
          <div className={isDesktop ? 'p-3' : 'p-4'}>
            <BalanceView trip={trip} isDesktop={isDesktop} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CostSummaryByUserView;