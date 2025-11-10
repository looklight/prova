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
  expandedNotes: boolean; // 📝 Stato espansione Note
  expandedOtherExpenses: boolean; // 💸 Stato espansione Altre Spese
  hoveredCell: string | null;
  currentUserId: string;
  getCellData: (dayId: number, categoryId: string) => any;
  getColorForContent: (categoryId: string, content: string) => string | null;
  getCategoryBgColor: (color: string) => string;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onCellHoverEnter: (cellKey: string) => void;
  onCellHoverLeave: () => void;
  onToggleNotes: () => void; // 📝 Handler toggle Note
  onToggleOtherExpenses: () => void; // 💸 Handler toggle Altre Spese
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
  expandedNotes, // 📝
  expandedOtherExpenses, // 💸
  hoveredCell,
  currentUserId,
  getCellData,
  getColorForContent,
  getCategoryBgColor,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave,
  onToggleNotes, // 📝
  onToggleOtherExpenses // 💸
}) => {
  // 📝 Calcola altezza dinamica per Note e Altre Spese
  const getRowHeight = () => {
    if (category.id === 'note') return expandedNotes ? '80px' : '48px';
    if (category.id === 'otherExpenses') return expandedOtherExpenses ? '80px' : '48px';
    return '48px';
  };
  
  const rowHeight = getRowHeight();
  
  return (
    <tr className="border-t" style={{ height: rowHeight }}>
      <td 
        onClick={
          category.id === 'note' ? onToggleNotes : 
          category.id === 'otherExpenses' ? onToggleOtherExpenses : 
          undefined
        }
        className={`p-0.5 font-medium sticky left-0 z-10 ${
          isScrolled ? 'bg-transparent' : 'bg-white'
        } ${(category.id === 'note' || category.id === 'otherExpenses') ? 'cursor-pointer' : ''}`}
        style={{ 
          width: isScrolled ? '60px' : '120px', 
          minWidth: isScrolled ? '60px' : '120px', 
          maxWidth: isScrolled ? '60px' : '120px', 
          height: rowHeight,
          transition: justMounted ? 'none' : 'all 0.3s'
        }}
        title={
          category.id === 'note' ? (expandedNotes ? "Comprimi celle Note" : "Espandi celle Note") :
          category.id === 'otherExpenses' ? (expandedOtherExpenses ? "Comprimi Altre Spese" : "Espandi Altre Spese") :
          undefined
        }
      >
        <div 
          className={`flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
            (category.id === 'note' && expandedNotes) || (category.id === 'otherExpenses' && expandedOtherExpenses) 
              ? 'ring-2' : ''
          } ${
            category.id === 'note' && expandedNotes ? 'ring-purple-400' : ''
          } ${
            category.id === 'otherExpenses' && expandedOtherExpenses ? 'ring-teal-400' : ''
          }`}
          style={{ 
            height: '36px', 
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: 
              category.id === 'note' && expandedNotes ? '#e9d5ff' :  // bg-purple-200 quando espanso
              category.id === 'otherExpenses' && expandedOtherExpenses ? '#99f6e4' : // bg-teal-200 quando espanso
              getCategoryBgColor(category.color)
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