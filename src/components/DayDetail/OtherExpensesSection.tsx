import React from 'react';
import { X } from 'lucide-react';

interface OtherExpensesSectionProps {
  expenses: Array<{
    id: number;
    title: string;
    cost: string;
    hasSplitCost?: boolean; // 🆕 NUOVO
  }>;
  onUpdate: (id: number, field: 'title' | 'cost', value: string) => void;
  onRemove: (id: number) => void;
  onOpenCostBreakdown?: (expenseId: number) => void; // 🆕 NUOVO
}

const OtherExpensesSection: React.FC<OtherExpensesSectionProps> = ({
  expenses,
  onUpdate,
  onRemove,
  onOpenCostBreakdown // 🆕 NUOVO
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">💸 Altre Spese</h2>
      </div>

      <div className="space-y-2">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              value={expense.title}
              onChange={(e) => onUpdate(expense.id, 'title', e.target.value)}
              placeholder="Descrizione spesa"
              className="flex-1 min-w-0 px-4 py-2.5 border rounded-full text-sm"
            />

            <div className="relative flex-shrink-0" style={{ width: '90px' }}>
              <input
                type="number"
                inputMode="decimal"
                value={expense.cost}
                onChange={(e) => onUpdate(expense.id, 'cost', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 pr-7 border rounded-full bg-gray-50 text-sm text-center"
                onWheel={(e) => e.currentTarget.blur()}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                €
              </span>
            </div>

            {/* 🆕 BOTTONE GESTISCI SPESA */}
            {onOpenCostBreakdown && (
              <button
                onClick={() => onOpenCostBreakdown(expense.id)}
                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-medium transition-colors flex-shrink-0"
                title="Gestisci spesa"
              >
                💰
              </button>
            )}

            {(expenses.length > 1 || expense.title.trim() !== '' || expense.cost.trim() !== '') && (
              <button
                type="button"
                onClick={() => onRemove(expense.id)}
                className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OtherExpensesSection;