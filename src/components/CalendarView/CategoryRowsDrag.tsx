/**
 * CategoryRowsDrag.tsx
 * 
 * Gestisce il drag & drop per riordinare le categorie nel CalendarView.
 * Usa @dnd-kit per un'esperienza fluida su desktop e mobile.
 * 
 * Categorie fisse:
 * - 'base' sempre in alto (non draggabile)
 * - 'otherExpenses' e 'note' sempre in fondo (non draggabili)
 */

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import CategoryRow from './CategoryRow';
import DayCell from './DayCell';

// Categorie che NON possono essere spostate
const FIXED_TOP = ['base'];
const FIXED_BOTTOM = ['otherExpenses', 'note'];

interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

interface CategoryRowsDragProps {
  categories: Category[];
  categoryOrder: string[];
  onReorder: (newOrder: string[]) => void;
  isDragMode: boolean;
  // Props per CategoryRow
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
}

/**
 * Wrapper per riga draggabile - aggiunge solo l'handle, CategoryRow resta invariato
 */
interface DraggableRowWrapperProps {
  category: Category;
  isDraggable: boolean;
  isDragging: boolean;
  children: React.ReactNode;
}

const DraggableRowWrapper: React.FC<DraggableRowWrapperProps> = ({
  category,
  isDraggable,
  isDragging,
  children
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: category.id,
    disabled: !isDraggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'bg-blue-50' : ''}>
      {/* Handle per drag */}
      <td 
        className="w-8 p-0 border-t bg-white"
        style={{ 
          position: 'sticky', 
          left: 0, 
          zIndex: 11,
        }}
      >
        {isDraggable ? (
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center h-12 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-50 touch-none"
          >
            <GripVertical size={18} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-12 text-gray-200">
            <GripVertical size={18} />
          </div>
        )}
      </td>
      {children}
    </tr>
  );
};

const CategoryRowsDrag: React.FC<CategoryRowsDragProps> = ({
  categories,
  categoryOrder,
  onReorder,
  isDragMode,
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
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Sensori per drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ordina le categorie: fixed top + ordinate + fixed bottom
  const sortedCategories = React.useMemo(() => {
    const fixedTop = categories.filter(c => FIXED_TOP.includes(c.id));
    const fixedBottom = categories.filter(c => FIXED_BOTTOM.includes(c.id));
    const draggable = categories.filter(
      c => !FIXED_TOP.includes(c.id) && !FIXED_BOTTOM.includes(c.id)
    );
    
    // Ordina draggable secondo categoryOrder
    const orderedDraggable = [...draggable].sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.id);
      const indexB = categoryOrder.indexOf(b.id);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return [...fixedTop, ...orderedDraggable, ...fixedBottom];
  }, [categories, categoryOrder]);

  // IDs per SortableContext (solo categorie draggabili)
  const draggableIds = sortedCategories
    .filter(c => !FIXED_TOP.includes(c.id) && !FIXED_BOTTOM.includes(c.id))
    .map(c => c.id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = draggableIds.indexOf(active.id as string);
      const newIndex = draggableIds.indexOf(over.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDraggableOrder = arrayMove(draggableIds, oldIndex, newIndex);
        onReorder(newDraggableOrder);
      }
    }
  };

  const categoryRowProps = {
    trip,
    selectedDays,
    editMode: false, // In drag mode non mostriamo l'edit dei giorni
    isDesktop,
    selectedDayIndex,
    isScrolled,
    justMounted,
    showCosts,
    expandedNotes,
    expandedOtherExpenses,
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
  };

  // Render normale senza drag
  if (!isDragMode) {
    return (
      <>
        {sortedCategories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            {...categoryRowProps}
          />
        ))}
      </>
    );
  }

  // Render con drag & drop - solo SortableContext e righe (DndContext è nel parent)
  return (
    <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
      {sortedCategories.map((category) => {
        const isDraggable = !FIXED_TOP.includes(category.id) && !FIXED_BOTTOM.includes(category.id);
        const isDragging = activeId === category.id;
        
        return (
          <DraggableRowWrapper
            key={category.id}
            category={category}
            isDraggable={isDraggable}
            isDragging={isDragging}
          >
            <CategoryRowInner 
              category={category} 
              isDragMode={isDragMode}
              {...categoryRowProps}
            />
          </DraggableRowWrapper>
        );
      })}
    </SortableContext>
  );
};

/**
 * Wrapper che fornisce DndContext - da usare FUORI dalla table
 */
interface DndProviderProps {
  children: React.ReactNode;
  onReorder: (newOrder: string[]) => void;
  categoryOrder: string[];
  categories: Category[];
}

export const CategoryDndProvider: React.FC<DndProviderProps> = ({
  children,
  onReorder,
  categoryOrder,
  categories,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calcola draggableIds
  const draggableIds = categories
    .filter(c => !FIXED_TOP.includes(c.id) && !FIXED_BOTTOM.includes(c.id))
    .map(c => c.id)
    .sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = draggableIds.indexOf(active.id as string);
      const newIndex = draggableIds.indexOf(over.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDraggableOrder = arrayMove(draggableIds, oldIndex, newIndex);
        onReorder(newDraggableOrder);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
};

/**
 * Contenuto interno della CategoryRow (senza il <tr>)
 * Riusa la logica di CategoryRow ma restituisce solo le <td>
 */
interface CategoryRowInnerProps {
  category: Category;
  isDragMode: boolean;
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
}

const CategoryRowInner: React.FC<CategoryRowInnerProps> = ({
  category,
  isDragMode,
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
}) => {
  const getRowHeight = () => {
    if (category.id === 'note') return expandedNotes ? '80px' : '48px';
    if (category.id === 'otherExpenses') return expandedOtherExpenses ? '80px' : '48px';
    return '48px';
  };

  const rowHeight = getRowHeight();

  return (
    <>
      {/* Cella categoria */}
      <td 
        onClick={
          category.id === 'note' ? onToggleNotes : 
          category.id === 'otherExpenses' ? onToggleOtherExpenses : 
          undefined
        }
        className={`p-0.5 font-medium sticky z-10 border-t ${
          isScrolled ? 'bg-transparent' : 'bg-white'
        } ${(category.id === 'note' || category.id === 'otherExpenses') ? 'cursor-pointer' : ''}`}
        style={{ 
          left: isDragMode ? '32px' : '0px',
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
              category.id === 'note' && expandedNotes ? '#e9d5ff' :
              category.id === 'otherExpenses' && expandedOtherExpenses ? '#99f6e4' :
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
      
      {/* Day cells */}
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
    </>
  );
};

export default CategoryRowsDrag;