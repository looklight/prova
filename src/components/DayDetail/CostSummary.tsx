import React from 'react';
import { ChevronRight } from 'lucide-react';

interface CostSummaryProps {
  dayCost: number;
  tripCost: number;
  currentDayNumber: number;
  onOpenFullSummary?: () => void; // 🆕 NUOVO
}

const CostSummary: React.FC<CostSummaryProps> = ({
  dayCost,
  tripCost,
  currentDayNumber,
  onOpenFullSummary // 🆕 NUOVO
}) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-4 border border-blue-100">
      <h2 className="text-base font-semibold mb-3 text-gray-800">💰 Riepilogo Costi</h2>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center py-2 border-b border-blue-200">
          <span className="text-sm text-gray-600">Giorno {currentDayNumber}</span>
          <span className="text-base font-semibold text-gray-800">{dayCost.toFixed(2)} €</span>
        </div>
        
        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-medium text-blue-700">Totale Viaggio</span>
          <span className="text-lg font-bold text-blue-700">{tripCost.toFixed(2)} €</span>
        </div>
      </div>

      {/* 🆕 BOTTONE RIEPILOGO COMPLETO */}
      {onOpenFullSummary && (
        <button
          onClick={onOpenFullSummary}
          className="w-full mt-4 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-between"
        >
          <span>Vedi Riepilogo Completo</span>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};

export default CostSummary;