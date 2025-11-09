import React from 'react';
import { calculateDayCost } from '../../utils/costsUtils';

interface TotalRowProps {
  trip: any;
  selectedDays: number[];
  isScrolled: boolean;
  justMounted: boolean;
  onOpenCostSummary: () => void;
}

const TotalRow: React.FC<TotalRowProps> = ({
  trip,
  selectedDays,
  isScrolled,
  justMounted,
  onOpenCostSummary
}) => {
  return (
    <tr className="border-t-2 bg-gray-50 font-bold" style={{ height: '48px' }}>
      <td 
        className={`p-0.5 sticky left-0 z-10 ${
          isScrolled ? 'bg-transparent' : 'bg-gray-50'
        }`}
        style={{ 
          width: isScrolled ? '60px' : '120px', 
          minWidth: isScrolled ? '60px' : '120px', 
          maxWidth: isScrolled ? '60px' : '120px', 
          height: '48px',
          transition: justMounted ? 'none' : 'all 0.3s'
        }}
      >
        <div 
          className="flex items-center justify-center relative overflow-hidden transition-all duration-300"
          style={{ 
            height: '36px', 
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: '#fee2e2'
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
      
      {trip.days.map((day: any) => (
        <td 
          key={`cost-${day.id}`} 
          onClick={onOpenCostSummary}
          className={`px-1 py-0.5 text-center border-l text-sm cursor-pointer hover:bg-blue-50 transition-colors ${
            selectedDays.includes(trip.days.indexOf(day)) ? 'bg-blue-50' : ''
          }`} 
          style={{ height: '48px', width: '140px', minWidth: '140px', maxWidth: '140px' }}
          title="Clicca per vedere il riepilogo completo dei costi"
        >
          {calculateDayCost(day, trip.data).toFixed(2)}€
        </td>
      ))}
    </tr>
  );
};

export default TotalRow;