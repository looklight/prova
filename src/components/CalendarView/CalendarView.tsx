import React, { useState, useMemo } from 'react';
import TripMetadataModal from '../TripMetadataModal';
import CostSummaryByUserView from '../DayDetail/CostSummaryByUserView';
import CalendarHeader from './CalendarHeader';
import CalendarTable from './CalendarTable';
import { useCalendarScroll } from '../../hooks/useCalendarScroll';
import { useDayOperations } from '../../hooks/useDayOperations';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [justMounted, setJustMounted] = useState(true);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showCostSummary, setShowCostSummary] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

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

  const getCellData = (dayId: number, categoryId: string) => {
    return trip.data[`${dayId}-${categoryId}`] || null;
  };

  // 🎨 Mappa deterministica dei colori per base/pernottamento
  const contentColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const baseColors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-indigo-50', 'bg-teal-50'];
    const pernottamentoColors = ['bg-yellow-50', 'bg-pink-50', 'bg-orange-50', 'bg-cyan-50', 'bg-lime-50'];
    
    let baseIndex = 0;
    let pernottamentoIndex = 0;
    
    // Per ogni giorno, raccogli i contenuti unici
    trip.days.forEach((day: any) => {
      ['base', 'pernottamento'].forEach(catId => {
        const cellData = getCellData(day.id, catId);
        const content = cellData?.title?.trim();
        
        if (content && !map[`${catId}-${content}`]) {
          // Assegna colore in ordine di apparizione
          const colors = catId === 'base' ? baseColors : pernottamentoColors;
          const index = catId === 'base' ? baseIndex++ : pernottamentoIndex++;
          map[`${catId}-${content}`] = colors[index % colors.length];
        }
      });
    });
    
    return map;
  }, [trip.days, trip.data]);

  const getColorForContent = (categoryId: string, content: string) => {
    if (categoryId !== 'base' && categoryId !== 'pernottamento') return null;
    if (!content) return null;
    
    // Conta occorrenze
    const occurrences = trip.days.filter((day: any) => {
      const cellData = getCellData(day.id, categoryId);
      return cellData?.title === content;
    }).length;
    
    // Solo se appare 2+ volte
    if (occurrences < 2) return null;
    
    // Usa mappa pre-calcolata (deterministico, zero collisioni)
    return contentColorMap[`${categoryId}-${content}`] || null;
  };

  const getCategoryBgColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'bg-gray-100': '#f3f4f6',
      'bg-blue-100': '#dbeafe',
      'bg-green-100': '#dcfce7',
      'bg-yellow-100': '#fef9c3',
      'bg-orange-100': '#ffedd5',
      'bg-purple-100': '#f3e8ff'
    };
    return colorMap[color] || '#f3f4f6';
  };

  const handleCellClick = (dayIndex: number, categoryId: string) => {
    // ✅ AUTO-EXIT: Se siamo in edit mode, esci prima di aprire il giorno
    if (editMode) {
      setEditMode(false);
      resetEditMode();
    }
    
    // Poi apri normalmente il giorno
    const currentScrollPosition = scrollContainerRef.current?.scrollLeft || 0;
    onOpenDay(dayIndex, currentScrollPosition, categoryId);
  };

  const handleMetadataSave = async (metadata: any) => {
    try {
      await onUpdateTrip({
        metadata: metadata,
        name: metadata.name,
        image: metadata.image,
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
    setEditMode(!editMode);
    if (editMode) {
      // Reset selections when exiting edit mode
      resetEditMode();
    }
  };

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
        maxWidth: isDesktop ? '100%' : '430px',
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

      <CalendarHeader
        trip={trip}
        editMode={editMode}
        selectedDays={selectedDays}
        moveAfterIndex={moveAfterIndex}
        onBack={onBack}
        onMetadataClick={() => setShowMetadataModal(true)}
        onEditModeToggle={handleEditModeToggle}
        onRemoveSelectedDays={removeSelectedDays}
        onAddDay={addDay}
        onMoveAfterChange={setMoveAfterIndex}
        onMoveDays={moveDaysAfter}
      />

      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto px-2 mt-2" 
        onScroll={(e) => setIsScrolled((e.target as HTMLDivElement).scrollLeft > 10)}
        onTouchStart={() => setShowCosts(true)}
        onTouchEnd={() => setShowCosts(false)}
        onTouchCancel={() => setShowCosts(false)}
        onMouseDown={() => setShowCosts(true)}
        onMouseUp={() => setShowCosts(false)}
        onMouseLeave={() => setShowCosts(false)}
      >
        <CalendarTable
          trip={trip}
          editMode={editMode}
          selectedDays={selectedDays}
          isDesktop={isDesktop}
          selectedDayIndex={selectedDayIndex}
          isScrolled={isScrolled}
          justMounted={justMounted}
          showCosts={showCosts}
          hoveredCell={hoveredCell}
          currentUserId={currentUser.uid}
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
        />
      </div>
    </div>
  );
};

export default CalendarView;