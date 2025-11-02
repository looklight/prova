import React from 'react';
import { calculateCategoryGroupCost, CATEGORY_GROUPS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../costsUtils';

interface CategoryBreakdownViewProps {
  trip: any;
}

const CategoryBreakdownView: React.FC<CategoryBreakdownViewProps> = ({ trip }) => {
  const categoryGroups = Object.keys(CATEGORY_GROUPS);

  const totalTrip = categoryGroups.reduce((sum, groupKey) => {
    const { total } = calculateCategoryGroupCost(trip, groupKey);
    return sum + total;
  }, 0);

  return (
    <div className="p-4 space-y-4">
      {categoryGroups.map(groupKey => {
        const { total, details } = calculateCategoryGroupCost(trip, groupKey);
        
        if (total === 0) return null; // Non mostrare categorie vuote

        const percentage = totalTrip > 0 ? (total / totalTrip) * 100 : 0;

        return (
          <div key={groupKey} className="bg-white rounded-xl shadow p-4">
            {/* Header categoria */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[groupKey]}</span>
                <h3 className="font-semibold text-lg">{CATEGORY_LABELS[groupKey]}</h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(total)}€
                </p>
                <p className="text-xs text-gray-500">
                  {percentage.toFixed(0)}% del totale
                </p>
              </div>
            </div>

            {/* Barra progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Dettagli */}
            {details.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                {details.map((detail, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="text-gray-600">
                        📍 {detail.title || detail.categoryId}
                      </span>
                      <span className="text-gray-400 text-xs ml-2">
                        Giorno {detail.dayNumber}
                      </span>
                    </div>
                    <span className="font-medium">{Math.round(detail.cost)}€</span>
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