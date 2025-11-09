import React from 'react';
import { Check } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';
import CategoryRow from './CategoryRow';
import TotalRow from './TotalRow';

interface CalendarTableProps {
  trip: any;
  editMode: boolean;
  selectedDays: number[];
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
  isToday: (date: Date) => boolean;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onCellHoverEnter: (cellKey: string) => void;
  onCellHoverLeave: () => void;
  onToggleDaySelection: (index: number) => void;
  onUpdateDayDate: (dayIndex: number, newDate: string) => void;
  onOpenCostSummary: () => void;
}

const CalendarTable: React.FC<CalendarTableProps> = ({
  trip,
  editMode,
  selectedDays,
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
  isToday,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave,
  onToggleDaySelection,
  onUpdateDayDate,
  onOpenCostSummary
}) => {
  return (
    <table className="w-full border-collapse bg-white rounded-lg shadow">
      <thead>
        <tr className="bg-gray-100">
          <th 
            className={`px-2 py-1 text-left font-medium sticky left-0 z-10 text-xs ${
              isScrolled ? 'bg-transparent' : 'bg-gray-100'
            }`}
            style={{ 
              width: isScrolled ? '60px' : '120px', 
              minWidth: isScrolled ? '60px' : '120px', 
              maxWidth: isScrolled ? '60px' : '120px',
              transition: justMounted ? 'none' : 'all 0.3s'
            }}
          >
            {!isScrolled && 'Categoria'}
          </th>
          {trip.days.map((day: any, index: number) => (
            <th 
              key={day.id}
              data-day-id={day.id}
              className={`px-2 py-1 text-center font-medium relative text-xs ${
                selectedDays.includes(index) ? 'bg-blue-100' : ''
              } ${isToday(day.date) ? 'ring-2 ring-blue-400 ring-inset' : ''} ${
                isDesktop && selectedDayIndex === index ? 'bg-blue-200 ring-2 ring-blue-500' : ''}
              `}
              style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}
            >
              {editMode && (
                <div className="absolute top-1 left-1">
                  <div 
                    onClick={() => onToggleDaySelection(index)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                      selectedDays.includes(index) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {selectedDays.includes(index) && <Check size={14} className="text-white" />}
                  </div>
                </div>
              )}
              <div className="font-bold text-sm">Giorno {day.number}</div>
              {editMode ? (
                <input
                  type="date"
                  value={day.date.toISOString().split('T')[0]}
                  onChange={(e) => onUpdateDayDate(index, e.target.value)}
                  className="text-xs mt-1 px-1 py-0.5 border rounded text-center"
                  style={{ fontSize: '10px' }}
                />
              ) : (
                <div className="text-xs text-gray-600">
                  {day.date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </div>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CATEGORIES.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            trip={trip}
            selectedDays={selectedDays}
            editMode={editMode}
            isDesktop={isDesktop}
            selectedDayIndex={selectedDayIndex}
            isScrolled={isScrolled}
            justMounted={justMounted}
            showCosts={showCosts}
            hoveredCell={hoveredCell}
            currentUserId={currentUserId}
            getCellData={getCellData}
            getColorForContent={getColorForContent}
            getCategoryBgColor={getCategoryBgColor}
            onCellClick={onCellClick}
            onCellHoverEnter={onCellHoverEnter}
            onCellHoverLeave={onCellHoverLeave}
          />
        ))}
        <TotalRow
          trip={trip}
          selectedDays={selectedDays}
          isScrolled={isScrolled}
          justMounted={justMounted}
          isDesktop={isDesktop}
          onOpenCostSummary={onOpenCostSummary}
        />
      </tbody>
    </table>
  );
};

export default CalendarTable;