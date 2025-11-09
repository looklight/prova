import React from 'react';
import { TRANSPORT_OPTIONS } from '../../utils/constants';

/**
 * Helper per determinare il colore del costo in base a chi ha pagato
 * 🔵 BLU    → Pagato interamente da ME (100% currentUser)
 * 🟠 ARANCIO → Spesa condivisa (2+ persone)
 * ⚪ GRIGIO  → Pagato interamente da ALTRI (1 persona, non me)
 */
const getCostColor = (cellData, currentUserId) => {
  if (!cellData.costBreakdown || cellData.costBreakdown.length === 0) {
    return 'text-gray-400'; // Default
  }

  // Condivisa (2+ persone)
  if (cellData.costBreakdown.length > 1) {
    return 'text-orange-400';
  }

  // Singola (1 persona)
  const singlePayer = cellData.costBreakdown[0].userId;
  
  if (singlePayer === currentUserId) {
    return 'text-blue-500'; // 🔵 Pagato da ME
  } else {
    return 'text-gray-400'; // ⚪ Pagato da ALTRI
  }
};

interface DayCellProps {
  day: any;
  dayIndex: number;
  category: any;
  cellData: any;
  highlightColor: string | null;
  selectedDays: number[];
  editMode: boolean;
  isDesktop: boolean;
  selectedDayIndex: number | null;
  costVisible: boolean;
  currentUserId: string;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onCellHoverEnter: (cellKey: string) => void;
  onCellHoverLeave: () => void;
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  dayIndex,
  category,
  cellData,
  highlightColor,
  selectedDays,
  editMode,
  isDesktop,
  selectedDayIndex,
  costVisible,
  currentUserId,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave
}) => {
  const hasContent = cellData && (cellData.title || cellData.cost || cellData.notes);
  const cellKey = `${dayIndex}-${category.id}`;

  return (
    <td
      key={`${day.id}-${category.id}`}
      onClick={() => onCellClick(dayIndex, category.id)}
      onMouseEnter={() => onCellHoverEnter(cellKey)}
      onMouseLeave={onCellHoverLeave}
      className={`px-1 py-0.5 text-center border-l ${
        selectedDays.includes(dayIndex) ? 'bg-blue-50' : highlightColor || ''
      } ${editMode ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${
        isDesktop && selectedDayIndex === dayIndex ? 'bg-blue-50' : ''}
      `}
      style={{ 
        height: category.id === 'note' ? '80px' : '48px', 
        width: '140px', 
        minWidth: '140px', 
        maxWidth: '140px' 
      }}
    >
      {hasContent ? (
        <div className="text-xs relative overflow-hidden h-full flex flex-col justify-center">
          {/* Emoji trasporto in BASSO a SINISTRA */}
          {(category.id === 'spostamenti1' || category.id === 'spostamenti2') && 
           cellData.transportMode && cellData.transportMode !== 'none' && (
            <div className="absolute bottom-0.5 left-0.5 text-sm">
              {TRANSPORT_OPTIONS.find(t => t.value === cellData.transportMode)?.emoji}
            </div>
          )}
          
          {/* Pallino booking in ALTO a DESTRA */}
          {category.id !== 'base' && category.id !== 'note' && 
           cellData.bookingStatus && cellData.bookingStatus !== 'na' && (
            <div className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${
              cellData.bookingStatus === 'yes' ? 'bg-green-500' : 'bg-orange-500'
            }`} />
          )}
          
          {/* 💰 COSTO in BASSO a DESTRA - visibile solo durante scroll/hover */}
          {category.id !== 'base' && category.id !== 'note' && 
           cellData.cost && parseFloat(cellData.cost) > 0 && (
            <div 
              className={`absolute bottom-[1px] right-0.5 text-[9px] font-semibold leading-none transition-opacity duration-150 ${
                getCostColor(cellData, currentUserId)
              } ${costVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              {parseFloat(cellData.cost).toFixed(0)}€
            </div>
          )}
          
          {category.id === 'note' ? (
            <div className="text-xs text-gray-700 px-2 py-1 overflow-hidden" style={{ 
              display: '-webkit-box',
              WebkitLineClamp: '4',
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis',
              lineHeight: '1.3'
            }}>
              {cellData.notes}
            </div>
          ) : (
            <div 
              className="font-medium px-1" 
              style={{ 
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2',
                wordBreak: 'break-word'
              }}
            >
              {cellData.title}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-300 text-xl">+</div>
      )}
    </td>
  );
};

export default DayCell;