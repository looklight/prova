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
  hoveredCell: string | null;
  currentUserId: string;
  getCellData: (dayId: number, categoryId: string) => any;
  getColorForContent: (categoryId: string, content: string) => string | null;
  getCategoryBgColor: (color: string) => string;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onCellHoverEnter: (cellKey: string) => void;
  onCellHoverLeave: () => void;
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
  hoveredCell,
  currentUserId,
  getCellData,
  getColorForContent,
  getCategoryBgColor,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave
}) => {
  return (
    <tr className="border-t" style={{ height: category.id === 'note' ? '80px' : '48px' }}>
      <td 
        className={`p-0.5 font-medium sticky left-0 z-10 ${
          isScrolled ? 'bg-transparent' : 'bg-white'
        }`}
        style={{ 
          width: isScrolled ? '60px' : '120px', 
          minWidth: isScrolled ? '60px' : '120px', 
          maxWidth: isScrolled ? '60px' : '120px', 
          height: category.id === 'note' ? '80px' : '48px',
          transition: justMounted ? 'none' : 'all 0.3s'
        }}
      >
        <div 
          className="flex items-center justify-center relative overflow-hidden transition-all duration-300"
          style={{ 
            height: '36px', 
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: getCategoryBgColor(category.color)
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
            currentUserId={currentUserId}
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