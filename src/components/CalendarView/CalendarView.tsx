import React, { useState, useMemo, useRef, useCallback } from 'react';
import TripMetadataModal from '../TripMetadataModal';
import CostSummaryByUserView from '../DayDetail/CostSummaryByUserView';
import CalendarHeader from './CalendarHeader';
import CalendarTable from './CalendarTable';
import { useCalendarScroll } from '../../hooks/useCalendarScroll';
import { useDayOperations } from '../../hooks/useDayOperations';
import { useDynamicCellHeight } from '../../hooks/useDynamicCellHeight';
import { CATEGORIES } from '../../utils/constants';

/**
 * Hook per rilevare media query (es. orientamento schermo)
 */
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

type EditTarget = 'days' | 'categories';

interface CalendarViewProps {
  trip: any;
  onUpdateTrip: (updates: any) => void;
  onBack?: () => void;
  onOpenDay: (dayIndex: number, scrollPosition: number, categoryId?: string) => void;
  scrollToDayId: number | null;
  savedScrollPosition: number | null;
  onScrollComplete: (() => void) | null;
  isDesktop?: boolean;
  selectedDayIndex?: number | null;
  currentUser: any;
  onInviteClick: () => void;
}

// Ordine di default delle categorie riordinabili (esclude base, otherExpenses, note)
const getDefaultCategoryOrder = () => {
  return CATEGORIES
    .filter(c => !['base', 'otherExpenses', 'note'].includes(c.id))
    .map(c => c.id);
};

const CalendarView: React.FC<CalendarViewProps> = ({
  trip,
  onUpdateTrip,
  onBack,
  onOpenDay,
  scrollToDayId,
  savedScrollPosition,
  onScrollComplete,
  isDesktop = false,
  selectedDayIndex = null,
  currentUser,
  onInviteClick
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>('days');
  const [isScrolled, setIsScrolled] = useState(false);
  const [justMounted, setJustMounted] = useState(true);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showCostSummary, setShowCostSummary] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(false);
  const [expandedOtherExpenses, setExpandedOtherExpenses] = useState(false);
  const [showLocationIndicators, setShowLocationIndicators] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const isLandscape = useMediaQuery('(orientation: landscape) and (max-width: 1023px)');

  // Ref per misurare l'header e calcolare altezza dinamica celle
  const headerRef = useRef<HTMLDivElement>(null);
  const cellHeight = useDynamicCellHeight(headerRef, CATEGORIES.length);

  // 🆕 Category order: stato locale per update ottimistico
  const [localCategoryOrder, setLocalCategoryOrder] = useState<string[] | null>(null);

  const categoryOrder = useMemo(() => {
    // Usa ordine locale se presente, altrimenti quello del trip o default
    return localCategoryOrder || trip.categoryOrder || getDefaultCategoryOrder();
  }, [localCategoryOrder, trip.categoryOrder]);

  // Custom hooks
  const scrollContainerRef = useCalendarScroll({
    scrollToDayId,
    savedScrollPosition,
    onScrollComplete,
    tripDays: trip.days,
    setIsScrolled,
    setJustMounted
  });

  const {
    selectedDays,
    moveAfterIndex,
    setMoveAfterIndex,
    addDay,
    removeSelectedDays,
    toggleDaySelection,
    moveDaysAfter,
    updateDayDate,
    resetEditMode
  } = useDayOperations({ trip, onUpdateTrip });

  // Utility functions
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getCellData = useCallback((dayId: number, categoryId: string) => {
    return trip.data[`${dayId}-${categoryId}`] || null;
  }, [trip.data]);

  // 🎨 Mappa deterministica dei colori per base/pernottamento
  const contentColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const baseColors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-indigo-50', 'bg-teal-50'];
    const pernottamentoColors = ['bg-yellow-50', 'bg-pink-50', 'bg-orange-50', 'bg-cyan-50', 'bg-lime-50'];

    let baseIndex = 0;
    let pernottamentoIndex = 0;

    trip.days.forEach((day: any) => {
      ['base', 'pernottamento'].forEach(catId => {
        const cellData = getCellData(day.id, catId);
        const content = cellData?.title?.trim();

        if (content && !map[`${catId}-${content}`]) {
          const colors = catId === 'base' ? baseColors : pernottamentoColors;
          const index = catId === 'base' ? baseIndex++ : pernottamentoIndex++;
          map[`${catId}-${content}`] = colors[index % colors.length];
        }
      });
    });

    return map;
  }, [trip.days, trip.data, getCellData]);

  const getColorForContent = (categoryId: string, content: string) => {
    if (categoryId !== 'base' && categoryId !== 'pernottamento') return null;
    if (!content) return null;

    const occurrences = trip.days.filter((day: any) => {
      const cellData = getCellData(day.id, categoryId);
      return cellData?.title === content;
    }).length;

    if (occurrences < 2) return null;

    return contentColorMap[`${categoryId}-${content}`] || null;
  };

  const getCategoryBgColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'bg-gray-100': '#f3f4f6',
      'bg-blue-100': '#dbeafe',
      'bg-green-100': '#dcfce7',
      'bg-yellow-100': '#fef9c3',
      'bg-orange-100': '#ffedd5',
      'bg-purple-100': '#f3e8ff',
      'bg-teal-100': '#ccfbf1'
    };
    return colorMap[color] || '#f3f4f6';
  };

  const handleCellClick = (dayIndex: number, categoryId: string) => {
    // ✅ AUTO-EXIT: Se siamo in edit mode, esci prima di aprire il giorno
    if (editMode) {
      setEditMode(false);
      resetEditMode();
    }

    const currentScrollPosition = scrollContainerRef.current?.scrollLeft || 0;
    onOpenDay(dayIndex, currentScrollPosition, categoryId);
  };

  const handleMetadataSave = async (metadata: any) => {
    try {
      await onUpdateTrip({
        metadata: metadata,
        name: metadata.name,
        image: metadata.image,
        currency: metadata.currency || null,
        updatedAt: new Date()
      });
      setShowMetadataModal(false);
      console.log('✅ Metadata aggiornati');
    } catch (error) {
      console.error('❌ Errore aggiornamento metadata:', error);
      alert('Errore nel salvataggio');
    }
  };

  const handleEditModeToggle = () => {
    if (editMode) {
      // Uscendo da edit mode, reset tutto
      resetEditMode();
      setEditTarget('days');
    }
    setEditMode(!editMode);
  };

  // 🆕 Handler per riordinare le categorie
  const handleCategoryReorder = async (newOrder: string[]) => {
    console.log('🔄 Nuovo ordine categorie:', newOrder);

    // 🆕 Update ottimistico: aggiorna subito lo stato locale
    setLocalCategoryOrder(newOrder);

    try {
      await onUpdateTrip({
        categoryOrder: newOrder,
        updatedAt: new Date()
      });
      console.log('✅ Ordine categorie salvato');
      // Dopo il salvataggio, resetta lo stato locale (userà trip.categoryOrder)
      setLocalCategoryOrder(null);
    } catch (error) {
      console.error('❌ Errore salvataggio ordine categorie:', error);
      // In caso di errore, resetta allo stato precedente
      setLocalCategoryOrder(null);
    }
  };

  // 🆕 Handler per aggiornare i dati delle celle (usato da CellDragDrop)
  const handleUpdateCellData = useCallback(async (updates: Record<string, any>) => {
    console.log('🔄 Aggiornamento dati celle:', updates);

    // Prepara l'oggetto data aggiornato
    const newData = { ...trip.data };

    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        // Rimuovi la cella (imposta a oggetto vuoto o elimina)
        delete newData[key];
      } else {
        // Aggiorna/crea la cella
        newData[key] = value;
      }
    }

    try {
      await onUpdateTrip({
        data: newData,
        updatedAt: new Date()
      });
      console.log('✅ Dati celle aggiornati');
    } catch (error) {
      console.error('❌ Errore aggiornamento dati celle:', error);
      throw error; // Rilancia per gestire nel chiamante
    }
  }, [trip.data, onUpdateTrip]);

  // Se mostra riepilogo costi, renderizza quella vista
  if (showCostSummary) {
    return (
      <CostSummaryByUserView
        trip={trip}
        onBack={() => setShowCostSummary(false)}
        isDesktop={isDesktop}
        origin="calendar"
        onUpdateTrip={onUpdateTrip}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        // 🆕 In landscape mobile usa tutto lo schermo per mostrare più colonne
        maxWidth: isDesktop || isLandscape ? '100%' : '430px',
        margin: '0 auto',
        height: isDesktop ? '100%' : 'auto'
      }}
    >
      <TripMetadataModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        onSave={handleMetadataSave}
        initialData={{
          ...trip.metadata,
          tripId: trip.id,
          sharing: trip.sharing
        }}
        currentUser={currentUser}
        mode="edit"
        onInviteClick={onInviteClick}
      />

      <div ref={headerRef}>
        <CalendarHeader
          trip={trip}
          editMode={editMode}
          editTarget={editTarget}
          selectedDays={selectedDays}
          moveAfterIndex={moveAfterIndex}
          onBack={onBack}
          onMetadataClick={() => setShowMetadataModal(true)}
          onEditModeToggle={handleEditModeToggle}
          onEditTargetChange={setEditTarget}
          onRemoveSelectedDays={removeSelectedDays}
          onAddDay={addDay}
          onMoveAfterChange={setMoveAfterIndex}
          onMoveDays={moveDaysAfter}
        />
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto px-2 mt-2"
        style={{ maxHeight: 'calc(100vh - 100px)' }} // regola questo valore in base a header + eventuali margini
        onScroll={(e) => setIsScrolled((e.target as HTMLDivElement).scrollLeft > 10)}
      >
        <CalendarTable
          trip={trip}
          editMode={editMode}
          editTarget={editTarget}
          categoryOrder={categoryOrder}
          onCategoryReorder={handleCategoryReorder}
          selectedDays={selectedDays}
          isDesktop={isDesktop}
          selectedDayIndex={selectedDayIndex}
          isScrolled={isScrolled}
          justMounted={justMounted}
          showCosts={showCosts}
          expandedNotes={expandedNotes}
          expandedOtherExpenses={expandedOtherExpenses}
          showLocationIndicators={showLocationIndicators}
          hoveredCell={hoveredCell}
          currentUserId={currentUser.uid}
          cellHeight={cellHeight}
          getCellData={getCellData}
          getColorForContent={getColorForContent}
          getCategoryBgColor={getCategoryBgColor}
          isToday={isToday}
          onCellClick={handleCellClick}
          onCellHoverEnter={(cellKey) => setHoveredCell(cellKey)}
          onCellHoverLeave={() => setHoveredCell(null)}
          onToggleDaySelection={toggleDaySelection}
          onUpdateDayDate={updateDayDate}
          onOpenCostSummary={() => setShowCostSummary(true)}
          onToggleCosts={() => setShowCosts(!showCosts)}
          onToggleNotes={() => setExpandedNotes(!expandedNotes)}
          onToggleOtherExpenses={() => setExpandedOtherExpenses(!expandedOtherExpenses)}
          onToggleLocationIndicators={() => setShowLocationIndicators(!showLocationIndicators)}
          onUpdateCellData={handleUpdateCellData}
        />
      </div>
    </div>
  );
};

export default CalendarView;