import React from 'react';
import DayCell from './DayCell';

interface CategoryRowProps {
  category: any;
  trip: any;
  selectedDays: number[];
  editMode: boolean;
  isDesktop: boolean;
  selectedDayIndex: number | null;
  isScrolled: boolean;
  justMounted: boolean;
  showCosts: boolean;
  expandedNotes: boolean;
  expandedOtherExpenses: boolean;
  showLocationIndicators: boolean;
  hoveredCell: string | null;
  currentUserId: string;
  getCellData: (dayId: number, categoryId: string) => any;
  getColorForContent: (categoryId: string, content: string) => string | null;
  getCategoryBgColor: (color: string) => string;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onCellHoverEnter: (cellKey: string) => void;
  onCellHoverLeave: () => void;
  onToggleNotes: () => void;
  onToggleOtherExpenses: () => void;
  onToggleLocationIndicators: () => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  trip,
  selectedDays,
  editMode,
  isDesktop,
  selectedDayIndex,
  isScrolled,
  justMounted,
  showCosts,
  expandedNotes,
  expandedOtherExpenses,
  showLocationIndicators,
  hoveredCell,
  currentUserId,
  getCellData,
  getColorForContent,
  getCategoryBgColor,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave,
  onToggleNotes,
  onToggleOtherExpenses,
  onToggleLocationIndicators
}) => {
  // Calcola altezza dinamica per Note e Altre Spese
  const getRowHeight = () => {
    if (category.id === 'note') return expandedNotes ? '80px' : '48px';
    if (category.id === 'otherExpenses') return expandedOtherExpenses ? '80px' : '48px';
    return '48px';
  };
  
  const rowHeight = getRowHeight();

  // Determina se la chip è cliccabile e quale handler usare
  const isClickableChip = ['note', 'otherExpenses', 'base'].includes(category.id);
  const handleChipClick = () => {
    if (category.id === 'note') onToggleNotes();
    else if (category.id === 'otherExpenses') onToggleOtherExpenses();
    else if (category.id === 'base') onToggleLocationIndicators();
  };

  // Determina se la chip ha il ring attivo
  const hasActiveRing = 
    (category.id === 'note' && expandedNotes) ||
    (category.id === 'otherExpenses' && expandedOtherExpenses) ||
    (category.id === 'base' && showLocationIndicators);

  // Colore del ring in base alla categoria
  const getRingColor = () => {
    if (category.id === 'note' && expandedNotes) return 'ring-purple-400';
    if (category.id === 'otherExpenses' && expandedOtherExpenses) return 'ring-teal-400';
    if (category.id === 'base' && showLocationIndicators) return 'ring-gray-400';
    return '';
  };

  // Background quando attivo
  const getActiveBackground = () => {
    if (category.id === 'note' && expandedNotes) return '#e9d5ff'; // bg-purple-200
    if (category.id === 'otherExpenses' && expandedOtherExpenses) return '#99f6e4'; // bg-teal-200
    if (category.id === 'base' && showLocationIndicators) return '#e5e7eb'; // bg-gray-200
    return getCategoryBgColor(category.color);
  };

  // Tooltip per la chip
  const getChipTitle = () => {
    if (category.id === 'note') return expandedNotes ? "Comprimi celle Note" : "Espandi celle Note";
    if (category.id === 'otherExpenses') return expandedOtherExpenses ? "Comprimi Altre Spese" : "Espandi Altre Spese";
    if (category.id === 'base') return showLocationIndicators ? "Nascondi indicatori posizione" : "Mostra indicatori posizione";
    return undefined;
  };
  
  return (
    <tr className="border-t" style={{ height: rowHeight }}>
      <td 
        onClick={isClickableChip ? handleChipClick : undefined}
        className={`p-0.5 font-medium sticky left-0 z-10 ${
          isScrolled ? 'bg-transparent' : 'bg-white'
        } ${isClickableChip ? 'cursor-pointer' : ''}`}
        style={{ 
          width: isScrolled ? '60px' : '120px', 
          minWidth: isScrolled ? '60px' : '120px', 
          maxWidth: isScrolled ? '60px' : '120px', 
          height: rowHeight,
          transition: justMounted ? 'none' : 'all 0.3s'
        }}
        title={getChipTitle()}
      >
        <div 
          className={`flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
            hasActiveRing ? 'ring-2' : ''
          } ${getRingColor()}`}
          style={{ 
            height: '36px', 
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: getActiveBackground()
          }}
        >
          <span className={`transition-all duration-300ms ease-in-out absolute ${
            isScrolled ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
          } text-xs whitespace-nowrap px-2`}>
            {category.label}
          </span>
          <span className={`transition-all duration-300ms ease-in-out absolute ${
            isScrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`} style={{ fontSize: '22px', lineHeight: '22px' }}>
            {category.emoji}
          </span>
        </div>
      </td>
      
      {trip.days.map((day: any, dayIndex: number) => {
        const cellData = getCellData(day.id, category.id);
        const highlightColor = cellData?.title ? getColorForContent(category.id, cellData.title) : null;
        const cellKey = `${dayIndex}-${category.id}`;
        const costVisible = showCosts || hoveredCell === cellKey;
        
        return (
          <DayCell
            key={`${day.id}-${category.id}`}
            day={day}
            dayIndex={dayIndex}
            category={category}
            cellData={cellData}
            highlightColor={highlightColor}
            selectedDays={selectedDays}
            editMode={editMode}
            isDesktop={isDesktop}
            selectedDayIndex={selectedDayIndex}
            costVisible={costVisible}
            expandedNotes={expandedNotes}
            expandedOtherExpenses={expandedOtherExpenses}
            showLocationIndicators={showLocationIndicators}
            currentUserId={currentUserId}
            trip={trip}
            onCellClick={onCellClick}
            onCellHoverEnter={onCellHoverEnter}
            onCellHoverLeave={onCellHoverLeave}
          />
        );
      })}
    </tr>
  );
};

export default CategoryRow;