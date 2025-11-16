import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { calculateCategoryGroupCost, CATEGORY_GROUPS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/costsUtils';

interface CategoryBreakdownViewProps {
  trip: any;
  isDesktop?: boolean;
}

const CategoryBreakdownView: React.FC<CategoryBreakdownViewProps> = ({ trip, isDesktop = false }) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  const categoryGroups = Object.keys(CATEGORY_GROUPS);

  const totalTrip = categoryGroups.reduce((sum, groupKey) => {
    const { total } = calculateCategoryGroupCost(trip, groupKey);
    return sum + total;
  }, 0);

  const toggleCategoryExpansion = (groupKey: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // 🆕 Calcola numero membri attivi
  const activeMembers = Object.values(trip.sharing?.members || {})
    .filter((m: any) => m.status === 'active').length;

  return (
    <div className={`${isDesktop ? 'space-y-3' : 'space-y-4'}`}>
      {/* 🆕 Header card - Identica a Tab "Per Utente" */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xs opacity-75">Totale</span>
            <span className="text-3xl font-bold">{Math.round(totalTrip)}€</span>
          </div>
          <div className="text-sm opacity-90">
            {activeMembers} {activeMembers === 1 ? 'pers' : 'pers'} • {trip.days?.length || 0} {trip.days?.length === 1 ? 'gg' : 'gg'}
          </div>
        </div>
      </div>

      {categoryGroups.map(groupKey => {
        const { total, details } = calculateCategoryGroupCost(trip, groupKey);
        if (total === 0) return null;

        const percentage = totalTrip > 0 ? (total / totalTrip) * 100 : 0;
        const isExpanded = expandedCategories.has(groupKey);

        // Arricchisci details con info base del giorno
        const enrichedDetails = details.map(detail => {
          const day = trip.days.find(d => d.number === detail.dayNumber);
          const baseKey = day ? `${day.id}-base` : null;
          const baseTitle = baseKey ? trip.data[baseKey]?.title || `Giorno ${detail.dayNumber}` : `Giorno ${detail.dayNumber}`;
          
          return {
            ...detail,
            base: baseTitle
          };
        });

        return (
          <div key={groupKey} className="bg-white rounded-xl shadow overflow-hidden">
            {/* Header categoria - cliccabile */}
            <button
              onClick={() => toggleCategoryExpansion(groupKey)}
              className="w-full p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{CATEGORY_ICONS[groupKey]}</span>
                  <h3 className="font-semibold text-lg">{CATEGORY_LABELS[groupKey]}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(total)}€
                    </p>
                    <p className="text-xs text-gray-500">
                      {percentage.toFixed(0)}% del totale
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Barra progresso */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </button>

            {/* Dettagli espandibili */}
            {isExpanded && enrichedDetails.length > 0 && (
              <div className="px-4 pb-4 space-y-1 border-t bg-gray-50">
                {enrichedDetails.map((detail, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700">
                      <span className="font-medium">G{detail.dayNumber}</span>
                      <span className="text-gray-400 mx-1">•</span>
                      <span className="text-gray-500">{detail.base}</span>
                      <span className="text-gray-400 mx-1">•</span>
                      <span>{detail.title || detail.categoryId}</span>
                    </span>
                    <span className="font-medium text-gray-900">{Math.round(detail.cost)}€</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {totalTrip === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>Nessuna spesa inserita ancora.</p>
        </div>
      )}
    </div>
  );
};

export default CategoryBreakdownView;