import React, { useState, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { calculateCategoryGroupCost, getSuggestedBudget, CATEGORY_GROUPS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/costsUtils';

interface BudgetViewProps {
  trip: any;
  onUpdateTrip: (updatedTrip: any) => void;
}

/**
 * Componente per visualizzazione e modifica manuale del budget
 * 
 * ⚠️ Il ricalcolo automatico è gestito da useBudgetSync in TripView
 * Questo componente si occupa solo di:
 * - Visualizzare il budget
 * - Permettere edit manuale delle categorie
 * - Sincronizzare con trip.budget quando arriva da Firestore
 */
const BudgetView: React.FC<BudgetViewProps> = ({ trip, onUpdateTrip }) => {
  const [budgets, setBudgets] = useState<Record<string, number>>(trip.budget || {});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // 🔄 Sincronizza con trip.budget quando cambia
  // (Il ricalcolo automatico è gestito da useBudgetSync in TripView)
  useEffect(() => {
    if (trip.budget && Object.keys(trip.budget).length > 0) {
      setBudgets(trip.budget);
      console.log('🔄 [BudgetView] Budget sincronizzato da Firestore');
    }
  }, [trip.budget]);

  const categoryGroups = Object.keys(CATEGORY_GROUPS);

  // Calcola totale budget
  const totalBudget = Object.values(budgets).reduce((sum, val) => sum + (val || 0), 0);

  // Calcola totale speso
  const totalSpent = categoryGroups.reduce((sum, groupKey) => {
    const { total } = calculateCategoryGroupCost(trip, groupKey);
    return sum + total;
  }, 0);

  const remaining = totalBudget - totalSpent;
  const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const numberOfDays = trip.days?.length || 0;

  // ✏️ Gestione edit manuale
  const handleStartEdit = (category: string) => {
    setEditingCategory(category);
    setEditValue((budgets[category] || 0).toString());
  };

  const handleSaveEdit = (category: string) => {
    const newValue = parseFloat(editValue) || 0;
    const updatedBudgets = { ...budgets, [category]: newValue };
    setBudgets(updatedBudgets);
    
    // Salva su Firestore
    onUpdateTrip({
      ...trip,
      budget: updatedBudgets
    });
    
    setEditingCategory(null);
    console.log('✏️ [BudgetView] Budget modificato manualmente:', category, '→', newValue, '€');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header con totale */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-4">
          <p className="text-sm opacity-90 mb-1">
            Budget Totale per {numberOfDays} {numberOfDays === 1 ? 'giorno' : 'giorni'}
          </p>
          <p className="text-4xl font-bold">{Math.round(totalBudget)}€</p>
        </div>
        
        <div className="flex justify-between text-sm mb-2">
          <span>Speso: {Math.round(totalSpent)}€</span>
          <span>
            {remaining >= 0 ? (
              <>Rimangono: {Math.round(remaining)}€</>
            ) : (
              <>❌ Sforato di {Math.round(Math.abs(remaining))}€</>
            )}
          </span>
        </div>
        
        {/* Barra progresso */}
        <div className="w-full bg-white/30 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              percentageSpent > 100 ? 'bg-red-400' : percentageSpent > 90 ? 'bg-yellow-300' : 'bg-green-400'
            }`}
            style={{ width: `${Math.min(percentageSpent, 100)}%` }}
          />
        </div>
        <p className="text-center text-xs mt-2 opacity-90">
          {percentageSpent.toFixed(0)}% utilizzato
        </p>
      </div>

      {/* Categorie */}
      {categoryGroups.map(groupKey => {
        const { total: spent } = calculateCategoryGroupCost(trip, groupKey);
        const budget = budgets[groupKey] || 0;
        const percentageUsed = budget > 0 ? (spent / budget) * 100 : 0;
        const isEditing = editingCategory === groupKey;

        return (
          <div key={groupKey} className="bg-white rounded-xl shadow p-4">
            {/* Header categoria */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[groupKey]}</span>
                <h3 className="font-semibold">{CATEGORY_LABELS[groupKey]}</h3>
              </div>
            </div>

            {/* Budget input */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">Budget:</span>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                    autoFocus
                  />
                  <style>{`
                    input[type=number]::-webkit-inner-spin-button,
                    input[type=number]::-webkit-outer-spin-button {
                      -webkit-appearance: none;
                      margin: 0;
                    }
                    input[type=number] {
                      -moz-appearance: textfield;
                    }
                  `}</style>
                  <button
                    onClick={() => handleSaveEdit(groupKey)}
                    className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{Math.round(budget)}€</span>
                  <button
                    onClick={() => handleStartEdit(groupKey)}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Info spesa */}
            <div className="text-sm text-gray-600 mb-2">
              Speso: {Math.round(spent)}€ / {Math.round(budget)}€
              {budget > 0 && (
                <span className="ml-2">
                  ({percentageUsed.toFixed(0)}%)
                </span>
              )}
            </div>

            {/* Barra progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentageUsed > 100 ? 'bg-red-500' : percentageUsed > 90 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>

            {/* Stato */}
            <div className="text-xs">
              {percentageUsed > 100 ? (
                <span className="text-red-600 font-medium">
                  ❌ Sforato di {Math.round(spent - budget)}€
                </span>
              ) : percentageUsed > 90 ? (
                <span className="text-yellow-600 font-medium">
                  ⚠️ Rimangono {Math.round(budget - spent)}€
                </span>
              ) : budget > 0 ? (
                <span className="text-green-600 font-medium">
                  ✅ Rimangono {Math.round(budget - spent)}€
                </span>
              ) : (
                <span className="text-gray-400">
                  Nessun budget impostato
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BudgetView;