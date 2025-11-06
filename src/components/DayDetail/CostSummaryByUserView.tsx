import React, { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { calculateTripCost } from '../../costsUtils';
import CategoryBreakdownView from './CategoryBreakdownView';
import BudgetView from './BudgetView';
import Avatar from '../Avatar';

interface CostSummaryByUserViewProps {
  trip: any;
  onBack: () => void;
  isDesktop?: boolean;
  origin?: 'dayDetail' | 'home';
  onUpdateTrip?: (updatedTrip: any) => void;
}

type TabType = 'users' | 'categories' | 'budget';

const CostSummaryByUserView: React.FC<CostSummaryByUserViewProps> = ({ 
  trip, 
  onBack, 
  isDesktop = false,
  origin = 'dayDetail',
  onUpdateTrip
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Calcola breakdown per utente
  const userBreakdown = useMemo(() => {
    const breakdown: Record<string, { displayName: string; avatar?: string; total: number; details: any[] }> = {};
    
    // Inizializza tutti i membri attivi
    Object.entries(trip.sharing.members).forEach(([uid, member]: [string, any]) => {
      if (member.status === 'active') {
        breakdown[uid] = {
          displayName: member.displayName,
          avatar: member.avatar,
          total: 0,
          details: []
        };
      }
    });

    // Aggrega costi per utente
    trip.days.forEach(day => {
      Object.entries(trip.data).forEach(([key, cellData]: [string, any]) => {
        if (!key.startsWith(day.id)) return;
        
        const costBreakdown = cellData.costBreakdown;
        if (costBreakdown && Array.isArray(costBreakdown)) {
          costBreakdown.forEach(entry => {
            if (breakdown[entry.userId]) {
              breakdown[entry.userId].total += entry.amount;
              breakdown[entry.userId].details.push({
                day: day.number,
                category: key.split('-')[1],
                title: cellData.title,
                amount: entry.amount
              });
            }
          });
        }
      });
    });

    return breakdown;
  }, [trip]);

  const tripTotal = calculateTripCost(trip);

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
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            👤 Utenti
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📊 Categorie
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'budget'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💰 Budget
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <div className="p-4 space-y-4">
          {Object.entries(userBreakdown).map(([userId, data]) => (
            <div key={userId} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar 
                  src={data.avatar} 
                  name={data.displayName} 
                  size="lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{data.displayName}</h3>
                  <p className="text-sm text-gray-500">
                    {data.details.length} {data.details.length === 1 ? 'spesa' : 'spese'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(data.total)}€
                  </p>
                </div>
              </div>

              {/* Dettaglio spese */}
              {data.details.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t">
                  {data.details.map((detail, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Giorno {detail.day} - {detail.title || detail.category}
                      </span>
                      <span className="font-medium">{Math.round(detail.amount)}€</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'categories' && (
        <CategoryBreakdownView trip={trip} />
      )}

      {activeTab === 'budget' && onUpdateTrip && (
        <BudgetView trip={trip} onUpdateTrip={onUpdateTrip} />
      )}
    </div>
  );
};

export default CostSummaryByUserView;