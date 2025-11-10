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
  const [editMode, setEditMode] = useState(false); // ✨ Modalità editing globale
  const [editValues, setEditValues] = useState<Record<string, string>>({}); // Valori temporanei

  // 🔄 Sincronizza con trip.budget quando cambia
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
  
  // 🆕 Conta membri ATTIVI
  const activeMembers = Object.values(trip.sharing?.members || {})
    .filter((m: any) => m.status === 'active').length;

  // ✏️ Attiva modalità editing
  const handleStartEdit = () => {
    // Inizializza valori temporanei con budget correnti
    const tempValues: Record<string, string> = {};
    categoryGroups.forEach(key => {
      tempValues[key] = (budgets[key] || 0).toString();
    });
    setEditValues(tempValues);
    setEditMode(true);
  };

  // ✅ Salva tutte le modifiche
  const handleSave = () => {
    const updatedBudgets: Record<string, number> = {};
    categoryGroups.forEach(key => {
      updatedBudgets[key] = parseFloat(editValues[key]) || 0;
    });
    
    setBudgets(updatedBudgets);
    
    // Salva su Firestore
    onUpdateTrip({
      ...trip,
      budget: updatedBudgets
    });
    
    setEditMode(false);
    console.log('✅ [BudgetView] Budget salvato:', updatedBudgets);
  };

  // ❌ Annulla modifiche
  const handleCancel = () => {
    setEditMode(false);
    setEditValues({});
  };

  // 📝 Aggiorna valore temporaneo
  const handleChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header con totale */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-4">
          <p className="text-xs uppercase tracking-wide opacity-80 mb-2">Budget Totale</p>
          <p className="text-4xl font-bold mb-2">{Math.round(totalBudget)}€</p>
          <div className="flex items-center justify-center gap-3 text-sm opacity-90">
            <span>{numberOfDays} {numberOfDays === 1 ? 'giorno' : 'giorni'}</span>
            <span>•</span>
            <span>{activeMembers} {activeMembers === 1 ? 'persona' : 'persone'}</span>
          </div>
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

      {/* Toolbar con pulsante Modifica/Salva/Annulla */}
      <div className="flex justify-between items-center px-2">
        <h3 className="text-base font-semibold text-gray-800">Budget per Categoria</h3>
        
        {!editMode ? (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Edit2 size={16} />
            <span>Modifica</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <X size={16} />
              <span>Annulla</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Check size={16} />
              <span>Salva</span>
            </button>
          </div>
        )}
      </div>

      {/* Categorie */}
      {categoryGroups.map(groupKey => {
        const { total: spent } = calculateCategoryGroupCost(trip, groupKey);
        const budget = editMode ? (parseFloat(editValues[groupKey]) || 0) : (budgets[groupKey] || 0);
        const percentageUsed = budget > 0 ? (spent / budget) * 100 : 0;

        return (
          <div 
            key={groupKey} 
            className={`bg-white rounded-xl shadow p-4 transition-all ${
              editMode ? 'ring-2 ring-blue-200' : ''
            }`}
          >
            {/* Header categoria */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{CATEGORY_ICONS[groupKey]}</span>
              <h3 className="font-semibold text-gray-800">{CATEGORY_LABELS[groupKey]}</h3>
            </div>

            {/* Budget input/display */}
            <div className="mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-500">Budget:</span>
                {editMode ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editValues[groupKey] || ''}
                    onChange={(e) => handleChange(groupKey, e.target.value)}
                    className="flex-1 px-3 py-1.5 border-2 border-blue-400 rounded-lg text-base font-semibold focus:outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                ) : (
                  <span className="text-lg font-bold text-gray-800">{Math.round(budget)}€</span>
                )}
              </div>
            </div>

            {/* Info spesa */}
            <div className="text-sm text-gray-600 mb-2">
              Speso: <span className="font-medium">{Math.round(spent)}€</span> / {Math.round(budget)}€
              {budget > 0 && (
                <span className="ml-2 text-xs">
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
      
      {/* Style per rimuovere spinner input number */}
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
    </div>
  );
};

export default BudgetView;