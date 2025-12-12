import React from 'react';
import { Check } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';
import CategoryRow from './CategoryRow';
import CategoryRowsDrag, { CategoryDndProvider } from './CategoryRowsDrag';
import TotalRow from './TotalRow';
import { CellDragProvider } from './CellDragDrop';

type EditTarget = 'days' | 'categories';

interface CalendarTableProps {
  trip: any;
  editMode: boolean;
  editTarget: EditTarget;
  categoryOrder: string[];
  onCategoryReorder: (newOrder: string[]) => void;
  selectedDays: number[];
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
  cellHeight?: number;
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
  onToggleCosts: () => void;
  onToggleNotes: () => void;
  onToggleOtherExpenses: () => void;
  onToggleLocationIndicators: () => void;
  onUpdateCellData?: (updates: Record<string, any>) => Promise<void>;
}

const CalendarTable: React.FC<CalendarTableProps> = ({
  trip,
  editMode,
  editTarget,
  categoryOrder,
  onCategoryReorder,
  selectedDays,
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
  cellHeight,
  getCellData,
  getColorForContent,
  getCategoryBgColor,
  isToday,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave,
  onToggleDaySelection,
  onUpdateDayDate,
  onOpenCostSummary,
  onToggleCosts,
  onToggleNotes,
  onToggleOtherExpenses,
  onToggleLocationIndicators,
  onUpdateCellData
}) => {
  const isDragMode = editMode && editTarget === 'categories';
  const isDaysEditMode = editMode && editTarget === 'days';

  // 🆕 Il drag delle celle è abilitato quando NON siamo in edit mode
  const isCellDragEnabled = !editMode && !!onUpdateCellData;

  // Ordina CATEGORIES secondo categoryOrder
  const sortedCategories = React.useMemo(() => {
    const fixedTop = ['base'];
    const fixedBottom = ['otherExpenses', 'note'];

    const top = CATEGORIES.filter(c => fixedTop.includes(c.id));
    const bottom = CATEGORIES.filter(c => fixedBottom.includes(c.id));
    const middle = CATEGORIES.filter(
      c => !fixedTop.includes(c.id) && !fixedBottom.includes(c.id)
    );

    // Ordina middle secondo categoryOrder
    const orderedMiddle = [...middle].sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.id);
      const indexB = categoryOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return [...top, ...orderedMiddle, ...bottom];
  }, [categoryOrder]);

  const tableContent = (
    <table className="w-full border-collapse bg-white rounded-lg shadow select-none">
      <thead>
        <tr className="bg-gray-100">
          {/* 🆕 Colonna extra per drag handle */}
          {isDragMode && (
            <th
              className="w-8 px-0 py-3 bg-gray-100 sticky left-0 z-10"
              style={{ minWidth: '32px', maxWidth: '32px' }}
            />
          )}
          <th
            className={`px-2 py-2 text-left font-medium sticky z-10 text-xs ${isScrolled ? 'bg-transparent' : 'bg-gray-100'
              }`}
            style={{
              left: isDragMode ? '32px' : '0px',
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
              className={`px-2 py-2 text-center font-medium relative text-xs ${selectedDays.includes(index) ? 'bg-blue-100' : ''
                } ${isToday(day.date) ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : ''} ${isDesktop && selectedDayIndex === index ? 'bg-blue-200 ring-2 ring-blue-500' : ''}
              `}
              style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}
            >
              {isDaysEditMode && (
                <div className="absolute top-1 left-1">
                  <div
                    onClick={() => onToggleDaySelection(index)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${selectedDays.includes(index) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                      }`}
                  >
                    {selectedDays.includes(index) && <Check size={14} className="text-white" />}
                  </div>
                </div>
              )}
              {isDaysEditMode ? (
                <input
                  type="date"
                  value={day.date.toISOString().split('T')[0]}
                  onChange={(e) => onUpdateDayDate(index, e.target.value)}
                  className="text-xs mt-1 px-1 py-0.5 border rounded text-center"
                  style={{ fontSize: '10px' }}
                />
              ) : (
                <>
                  <div className="text-xs text-gray-600 mt-1">
                    Giorno {day.number}
                  </div>
                  <div className="font-bold text-sm">
                    {day.date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </div>
                </>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isDragMode ? (
          // 🆕 Modalità drag: usa CategoryRowsDrag (DndContext è fuori dalla table)
          <CategoryRowsDrag
            categories={CATEGORIES}
            categoryOrder={categoryOrder}
            onReorder={onCategoryReorder}
            isDragMode={isDragMode}
            trip={trip}
            selectedDays={selectedDays}
            editMode={editMode}
            isDesktop={isDesktop}
            selectedDayIndex={selectedDayIndex}
            isScrolled={isScrolled}
            justMounted={justMounted}
            showCosts={showCosts}
            expandedNotes={expandedNotes}
            expandedOtherExpenses={expandedOtherExpenses}
            showLocationIndicators={showLocationIndicators}
            hoveredCell={hoveredCell}
            currentUserId={currentUserId}
            cellHeight={cellHeight}
            getCellData={getCellData}
            getColorForContent={getColorForContent}
            getCategoryBgColor={getCategoryBgColor}
            onCellClick={onCellClick}
            onCellHoverEnter={onCellHoverEnter}
            onCellHoverLeave={onCellHoverLeave}
            onToggleNotes={onToggleNotes}
            onToggleOtherExpenses={onToggleOtherExpenses}
            onToggleLocationIndicators={onToggleLocationIndicators}
          />
        ) : (
          // Modalità normale: usa CategoryRow con ordine
          sortedCategories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              trip={trip}
              selectedDays={selectedDays}
              editMode={isDaysEditMode}
              isDesktop={isDesktop}
              selectedDayIndex={selectedDayIndex}
              isScrolled={isScrolled}
              justMounted={justMounted}
              showCosts={showCosts}
              expandedNotes={expandedNotes}
              expandedOtherExpenses={expandedOtherExpenses}
              showLocationIndicators={showLocationIndicators}
              hoveredCell={hoveredCell}
              currentUserId={currentUserId}
              cellHeight={cellHeight}
              getCellData={getCellData}
              getColorForContent={getColorForContent}
              getCategoryBgColor={getCategoryBgColor}
              onCellClick={onCellClick}
              onCellHoverEnter={onCellHoverEnter}
              onCellHoverLeave={onCellHoverLeave}
              onToggleNotes={onToggleNotes}
              onToggleOtherExpenses={onToggleOtherExpenses}
              onToggleLocationIndicators={onToggleLocationIndicators}
              isCellDragEnabled={isCellDragEnabled}
            />
          ))
        )}
        <TotalRow
          trip={trip}
          selectedDays={selectedDays}
          isScrolled={isScrolled}
          justMounted={justMounted}
          isDesktop={isDesktop}
          showCosts={showCosts}
          cellHeight={cellHeight}
          onOpenCostSummary={onOpenCostSummary}
          onToggleCosts={onToggleCosts}
        />
      </tbody>
    </table>
  );

  // In drag mode categorie, wrappa con CategoryDndProvider
  if (isDragMode) {
    return (
      <CategoryDndProvider
        categories={CATEGORIES}
        categoryOrder={categoryOrder}
        onReorder={onCategoryReorder}
      >
        {tableContent}
      </CategoryDndProvider>
    );
  }

  // 🆕 In modalità normale con drag celle abilitato, wrappa con CellDragProvider
  if (isCellDragEnabled && onUpdateCellData) {
    return (
      <CellDragProvider
        tripData={trip.data}
        onUpdateTripData={onUpdateCellData}
        getCellData={getCellData}
        isDragEnabled={isCellDragEnabled}
      >
        {tableContent}
      </CellDragProvider>
    );
  }

  return tableContent;
};

export default CalendarTable;