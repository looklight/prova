/**
 * OtherExpensesSection
 * Gestisce sia le Altre Spese che le Note del giorno (in due card separate)
 */
import React from 'react';
import { X } from 'lucide-react';
import CostInput from './ui/CostInput';

interface OtherExpensesSectionProps {
  expenses: Array<{
    id: number;
    title: string;
    cost: string;
    hasSplitCost?: boolean;
    costBreakdown?: Array<{ userId: string; amount: number }> | null;
  }>;
  onUpdate: (id: number, field: 'title' | 'cost', value: string) => void;
  onRemove: (id: number) => void;
  onOpenCostBreakdown?: (expenseId: number) => void;
  currentUserId?: string;
  tripMembers?: Record<string, { status: string; displayName: string; avatar?: string }>;
  isHighlighted?: boolean;
  notes?: string;
  onUpdateNotes?: (value: string) => void;
  isNoteHighlighted?: boolean;
}

const OtherExpensesSection: React.FC<OtherExpensesSectionProps> = ({
  expenses,
  onUpdate,
  onRemove,
  onOpenCostBreakdown,
  currentUserId,
  tripMembers,
  isHighlighted = false,
  notes = '',
  onUpdateNotes,
  isNoteHighlighted = false
}) => {
  // ✅ Handler con conferma per rimozione spesa
  const handleRemove = (expenseId: number) => {
    const confirmed = window.confirm('Eliminare questa spesa?');
    if (confirmed) {
      onRemove(expenseId);
    }
  };

  return (
    <>
      {/* 💸 Altre Spese */}
      <div 
        id="category-otherExpenses" 
        className={`bg-white rounded-lg shadow p-4 transition-all duration-1000 ${
          isHighlighted 
            ? 'ring-2 ring-blue-500' 
            : 'ring-0 ring-transparent'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">💸 Altre Spese</h2>
        </div>

        <div className="space-y-2">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex gap-2 items-center">
              {/* Titolo */}
              <input
                type="text"
                value={expense.title}
                onChange={(e) => onUpdate(expense.id, 'title', e.target.value)}
                placeholder="Descrizione"
                className="flex-1 min-w-0 px-4 py-2.5 border rounded-full text-sm"
              />

              {/* Costo - Riusa CostInput */}
              <CostInput
                value={expense.cost}
                onChange={(e) => onUpdate(expense.id, 'cost', e.target.value)}
                hasSplitCost={expense.hasSplitCost || false}
                currentUserId={currentUserId}
                costBreakdown={expense.costBreakdown || null}
                tripMembers={tripMembers}
                onClearBreakdown={() => {
                  onUpdate(expense.id, 'cost', '');
                }}
              />

              {/* Bottone Gestisci */}
              {onOpenCostBreakdown && (
                <button
                  onClick={() => onOpenCostBreakdown(expense.id)}
                  className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center transition-colors"
                  title="Gestisci spesa"
                >
                  💰
                </button>
              )}

              {/* Bottone Rimuovi con conferma */}
              {(expenses.length > 1 || expense.title.trim() !== '' || expense.cost.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => handleRemove(expense.id)}
                  className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Elimina spesa"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 📝 Note */}
      {onUpdateNotes && (
        <div 
          id="category-note" 
          className={`bg-white rounded-lg shadow p-4 transition-all duration-1000 ${
            isNoteHighlighted 
              ? 'ring-2 ring-blue-500' 
              : 'ring-0 ring-transparent'
          }`}
        >
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span>📝</span>
            <span>Note</span>
          </h2>
          <textarea
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Aggiungi commento personale"
            className="w-full px-4 py-2.5 border rounded-lg h-24 resize-none text-sm"
          />
        </div>
      )}
    </>
  );
};

export default OtherExpensesSection;