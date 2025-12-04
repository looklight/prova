import React from 'react';
import { Maximize2  } from 'lucide-react';
import { calculateDayCost } from '../../utils/costsUtils';

interface TotalRowProps {
  trip: any;
  selectedDays: number[];
  isScrolled: boolean;
  justMounted: boolean;
  isDesktop: boolean;
  showCosts: boolean; // 💰 Stato toggle costi
  onOpenCostSummary: () => void;
  onToggleCosts: () => void; // 💰 Handler toggle costi
}

const TotalRow: React.FC<TotalRowProps> = ({
  trip,
  selectedDays,
  isScrolled,
  justMounted,
  isDesktop,
  showCosts,
  onOpenCostSummary,
  onToggleCosts
}) => {
  return (
    <tr className="border-t-2 bg-gray-50 font-bold" style={{ height: '48px' }}>
      <td 
        onClick={onToggleCosts}
        className={`p-0.5 sticky left-0 z-10 cursor-pointer transition-all ${
          isScrolled ? 'bg-transparent' : 'bg-gray-50'
        }`}
        style={{ 
          width: isScrolled ? '60px' : '120px', 
          minWidth: isScrolled ? '60px' : '120px', 
          maxWidth: isScrolled ? '60px' : '120px', 
          height: '48px',
          transition: justMounted ? 'none' : 'all 0.3s'
        }}
        title={showCosts ? "Nascondi costi nelle celle" : "Mostra costi nelle celle"}
      >
        <div 
          className={`flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
            showCosts ? 'ring-2 ring-pink-400' : ''
          }`}
          style={{ 
            height: '36px', 
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: showCosts ? '#fce7f3' : '#fee2e2' // bg-pink-100 quando attivo, bg-pink-50 normale
          }}
        >
          <span className={`transition-all duration-300 absolute ${
            isScrolled ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
          } text-xs px-2`}>
            Costi
          </span>
          <span className={`transition-all duration-300 absolute ${
            isScrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`} style={{ fontSize: '22px', lineHeight: '22px' }}>
            💰
          </span>
        </div>
      </td>
      {trip.days.map((day: any) => {
        const dailyTotal = calculateDayCost(day, trip.data, trip.sharing?.members);
        const display = dailyTotal === 0 ? "-" : dailyTotal.toFixed(2) + "€";

        return (
          <td 
            key={`cost-${day.id}`}
            onClick={onOpenCostSummary}
            className={`px-1 py-0.5 text-center border-l text-sm cursor-pointer hover:bg-blue-50 transition-colors relative ${
              selectedDays.includes(trip.days.indexOf(day)) ? 'bg-blue-50' : ''
            }`} 
            style={{ height: '48px', width: '140px', minWidth: '140px', maxWidth: '140px' }}
            title="Clicca per vedere il riepilogo completo dei costi"
          >
            {/* Icona Expand in alto a destra */}
            <Maximize2 
              size={10} 
              className="absolute top-1 right-1 text-blue-500 opacity-60"
            />
            
            {/* Costo centrato */}
            <div className={dailyTotal === 0 ? 'text-gray-400' : ''}>
              {display}
            </div>
          </td>
        );
      })}
    </tr>
  );
};

export default TotalRow;