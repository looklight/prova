import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateTripCost, CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/costsUtils';
import { CATEGORIES } from '../../utils/constants';
import CategoryBreakdownView from './CategoryBreakdownView';
import BudgetView from './BudgetView';
import BalanceView from './BalanceView';

interface CostSummaryByUserViewProps {
  trip: any;
  onBack: () => void;
  isDesktop?: boolean;
  origin?: 'dayDetail' | 'home';
  onUpdateTrip?: (updatedTrip: any) => void;
}

type TabType = 'users' | 'categories' | 'budget' | 'balances'; // 🆕 Aggiungi 'balances'

const CostSummaryByUserView: React.FC<CostSummaryByUserViewProps> = ({ 
  trip, 
  onBack, 
  isDesktop = false,
  origin = 'dayDetail',
  onUpdateTrip
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Calcola breakdown per utente con raggruppamento per categoria
  const userBreakdown = useMemo(() => {
    const breakdown: Record<string, { 
      displayName: string; 
      avatar?: string; 
      total: number; 
      byCategory: Record<string, { total: number; count: number; items: any[] }>;
    }> = {};
    
    // Inizializza tutti i membri attivi
    Object.entries(trip.sharing.members).forEach(([uid, member]: [string, any]) => {
      if (member.status === 'active') {
        breakdown[uid] = {
          displayName: member.displayName,
          avatar: member.avatar,
          total: 0,
          byCategory: {}
        };
      }
    });

    // Aggrega costi per utente
    trip.days.forEach(day => {
      // Trova la base del giorno per il contesto
      const baseKey = `${day.id}-base`;
      const baseTitle = trip.data[baseKey]?.title || `Giorno ${day.number}`;

      // CATEGORIE STANDARD
      CATEGORIES.forEach(cat => {
        if (cat.id === 'base' || cat.id === 'note') return;
        
        const key = `${day.id}-${cat.id}`;
        const cellData = trip.data[key];
        
        if (cellData?.costBreakdown && Array.isArray(cellData.costBreakdown)) {
          cellData.costBreakdown.forEach(entry => {
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

    return breakdown;
  }, [trip]);

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
      className={`bg-gray-50 ${isDesktop ? 'h-full overflow-y-auto' : 'min-h-screen'}`}
      style={{ 
        maxWidth: isDesktop ? '100%' : '430px',
        margin: '0 auto'
      }}
    >
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {origin === 'home' ? 'Riepilogo Viaggio' : 'Riepilogo Costi'}
            </h1>
            <p className="text-sm text-gray-500">
              Totale: {Math.round(tripTotal)}€
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 pt-3 pb-2 shadow-sm sticky top-[72px] z-10">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-2 rounded-lg font-medium transition-colors text-sm ${
              activeTab === 'users'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            👤 Utenti
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2.5 px-2 rounded-lg font-medium transition-colors text-sm ${
              activeTab === 'categories'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📊 Categorie
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`py-2.5 px-2 rounded-lg font-medium transition-colors text-sm ${
              activeTab === 'budget'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💰 Budget
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`py-2.5 px-2 rounded-lg font-medium transition-colors text-sm ${
              activeTab === 'balances'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💸 Bilanci
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <div className="p-4 space-y-3">
          {sortedUserBreakdown.map(([userId, data]) => {
            const isExpanded = expandedUsers.has(userId);
            const categories = Object.entries(data.byCategory);
            const totalItems = Object.values(data.byCategory).reduce((sum, cat) => sum + cat.count, 0);
            const userPercentage = tripTotal > 0 ? (data.total / tripTotal) * 100 : 0;

            return (
              <div key={userId} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Header - Sempre visibile */}
                <button
                  onClick={() => toggleUserExpansion(userId)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  {data.avatar ? (
                    <img
                      src={data.avatar}
                      alt={data.displayName}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {data.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">{data.displayName}</h3>
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

                {/* Barra distribuzione categorie - Sempre visibile */}
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

                {/* Dettagli espandibili */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t">
                    {categories.map(([catName, catData], idx) => (
                      <div key={catName} className="pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {/* Pallino colorato invece dell'emoji */}
                            <div className={`w-3 h-3 rounded-full ${categoryColors[idx % categoryColors.length]}`} />
                            <span className="font-medium text-sm">{catName}</span>
                            <span className="text-xs text-gray-500">({catData.count})</span>
                          </div>
                          <span className="font-semibold text-blue-600">
                            {Math.round(catData.total)}€
                          </span>
                        </div>
                        
                        {/* Lista item categoria con formato G1 • Milano • Colazione */}
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
        </div>
      )}

      {activeTab === 'categories' && (
        <CategoryBreakdownView trip={trip} />
      )}

      {activeTab === 'budget' && onUpdateTrip && (
        <BudgetView trip={trip} onUpdateTrip={onUpdateTrip} />
      )}

      {/* 🆕 Tab Bilanci */}
      {activeTab === 'balances' && (
        <BalanceView trip={trip} />
      )}
    </div>
  );
};

export default CostSummaryByUserView;