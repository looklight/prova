/**
 * OtherExpensesSection
 * Gestisce sia le Altre Spese che le Note del giorno (in due card separate)
 */
import React from 'react';
import { X, Coins } from 'lucide-react';
import CostInput from './ui/CostInput';
import OfflineDisabled from '../OfflineDisabled';

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

  // 🆕 Props per selezione
  onSelectCategory?: (categoryId: string) => void;
  selectedCategoryId?: string;
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
  isNoteHighlighted = false,
  onSelectCategory,
  selectedCategoryId
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
        onClick={() => onSelectCategory?.('otherExpenses')}
        className={`rounded-lg shadow p-4 cursor-pointer ${
          selectedCategoryId === 'otherExpenses'
            ? 'ring-2 ring-blue-500'
            : 'ring-0 ring-transparent'
        } bg-slate-50`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">💸 Altre Spese</h2>
        </div>

        <div className="space-y-2">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex gap-2 items-center">
              {/* Titolo */}
              <OfflineDisabled>
                <input
                  type="text"
                  value={expense.title}
                  onChange={(e) => onUpdate(expense.id, 'title', e.target.value)}
                  placeholder="Descrizione"
                  className="flex-1 min-w-0 px-4 py-2.5 border rounded-full text-sm"
                />
              </OfflineDisabled>

              {/* Costo - Riusa CostInput */}
              <OfflineDisabled>
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
              </OfflineDisabled>

              {/* Bottone Gestisci */}
              {onOpenCostBreakdown && (
                <OfflineDisabled>
                  <button
                    onClick={() => onOpenCostBreakdown(expense.id)}
                    className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border border-gray-200 transition-colors"
                    title="Gestisci spesa"
                  >
                    <Coins size={16} />
                  </button>
                </OfflineDisabled>
              )}

              {/* Bottone Rimuovi con conferma */}
              {(expenses.length > 1 || expense.title.trim() !== '' || expense.cost.trim() !== '') && (
                <OfflineDisabled>
                  <button
                    type="button"
                    onClick={() => handleRemove(expense.id)}
                    className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    title="Elimina spesa"
                  >
                    <X size={16} />
                  </button>
                </OfflineDisabled>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 📝 Note */}
      {onUpdateNotes && (
        <div
          id="category-note"
          onClick={() => onSelectCategory?.('note')}
          className={`rounded-lg shadow p-4 cursor-pointer ${
            selectedCategoryId === 'note'
              ? 'ring-2 ring-blue-500'
              : 'ring-0 ring-transparent'
          } bg-slate-50`}
        >
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span>📝</span>
            <span>Note</span>
          </h2>
          <OfflineDisabled>
            <textarea
              value={notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Aggiungi commento personale"
              className="w-full px-4 py-2.5 border rounded-lg h-24 resize-none text-sm"
            />
          </OfflineDisabled>
        </div>
      )}
    </>
  );
};

export default OtherExpensesSection;