import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { TripMetadataModal } from '../Trip';
import CalendarHeader, { EditTab, ViewMode } from './CalendarHeader';
import CalendarTable from './CalendarTable';
import CardView from './CardView';
import { useCalendarScroll } from '../../hooks/useCalendarScroll';
import { useDayOperations } from '../../hooks/useDayOperations';
import { collectOrphanedMediaPaths } from '../../utils/cellDataUtils';
import { deleteImage } from '../../services/storageService';

// ============================================
// ALTROVE - CalendarView
// Vista calendario con toggle Card/Table
// Default: CardView (schede giornaliere)
// ============================================


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
  onOpenCosts?: () => void;
  onMapClick?: () => void;
  onViewModeChange?: (mode: ViewMode, maxActivities: number) => void;
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
  onOpenCosts,
  onMapClick,
  onViewModeChange
}) => {
  // === STATE ===
  const [editMode, setEditMode] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isScrolled, setIsScrolled] = useState(false);
  const [justMounted, setJustMounted] = useState(true);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  // Ref per header (se serve per calcoli)
  const headerRef = useRef<HTMLDivElement>(null);

  // === HOOKS ===
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

  // === UTILITIES ===
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getCellData = useCallback((dayId: number, categoryId: string) => {
    return trip.data[`${dayId}-${categoryId}`] || null;
  }, [trip.data]);

  // Calcola il numero massimo di attività visibili per la TableView
  const maxVisibleActivities = useMemo(() => {
    let max = 0;
    for (const day of trip.days) {
      const cellData = getCellData(day.id, 'attivita');
      if (cellData?.activities) {
        const visibleCount = cellData.activities.filter((a: any) => a.showInCalendar === true).length;
        if (visibleCount > max) max = visibleCount;
      }
    }
    return Math.max(1, Math.min(3, max));
  }, [trip.days, getCellData]);

  // Notifica TripView quando cambia viewMode o maxActivities
  useEffect(() => {
    onViewModeChange?.(viewMode, maxVisibleActivities);
  }, [viewMode, maxVisibleActivities, onViewModeChange]);

  // === HANDLERS ===
  const handleCellClick = (dayIndex: number, categoryId: string) => {
    // Auto-exit: se siamo in edit mode, esci prima di aprire il giorno
    if (editMode) {
      setEditMode(false);
      resetEditMode();
    }

    const currentScrollPosition = scrollContainerRef.current?.scrollLeft || 0;
    onOpenDay(dayIndex, currentScrollPosition, categoryId);
  };

  // 🆕 Handler per click su card (apre sempre il giorno)
  const handleCardClick = (dayIndex: number) => {
    const currentScrollPosition = scrollContainerRef.current?.scrollLeft || 0;
    onOpenDay(dayIndex, currentScrollPosition);
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
    }
    setEditMode(!editMode);
  };

  // 🆕 Handler per cambio vista (ora supporta edit mode in entrambe le viste)
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Handler per aggiornare i dati delle celle (usato da CellDragDrop)
  // Gestisce sia trip.data che trip.days (per le destinazioni)
  // Include cleanup automatico dei media orfani dallo Storage
  const handleUpdateCellData = useCallback(async (updates: Record<string, any>) => {

    // 1. Costruisci i dati correnti completi (include destinazioni)
    const currentFullData: Record<string, any> = { ...trip.data };
    for (const day of trip.days) {
      currentFullData[`days:${day.id}:destinations`] = day.destinations || [];
    }

    // 2. Trova i media orfani (che verranno eliminati/sovrascritti)
    const orphanedPaths = collectOrphanedMediaPaths(currentFullData, updates);
    if (orphanedPaths.length > 0) {
      // Elimina in parallelo, senza bloccare l'operazione principale
      Promise.all(
        orphanedPaths.map(async (path) => {
          try {
            await deleteImage(path);
          } catch (error) {
            // Non blocchiamo l'operazione per errori di cleanup
          }
        })
      );
    }

    // 3. Applica gli aggiornamenti
    const newData = { ...trip.data };
    const newDays = [...trip.days];
    let daysChanged = false;

    for (const [key, value] of Object.entries(updates)) {
      // Chiave speciale per destinazioni: "days:{dayId}:destinations"
      const destMatch = key.match(/^days:(\d+):destinations$/);
      if (destMatch) {
        const dayId = parseInt(destMatch[1], 10);
        const dayIndex = newDays.findIndex((d: any) => d.id === dayId);
        if (dayIndex !== -1) {
          newDays[dayIndex] = {
            ...newDays[dayIndex],
            destinations: value || []
          };
          daysChanged = true;
        }
      } else {
        // Chiave normale per trip.data
        if (value === null) {
          delete newData[key];
        } else {
          newData[key] = value;
        }
      }
    }

    try {
      const tripUpdate: any = {
        data: newData,
        updatedAt: new Date()
      };
      if (daysChanged) {
        tripUpdate.days = newDays;
      }
      await onUpdateTrip(tripUpdate);
    } catch (error) {
      console.error('❌ Errore aggiornamento dati celle:', error);
      throw error;
    }
  }, [trip.data, trip.days, onUpdateTrip]);

  // === RENDER ===
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: 'transparent',
        maxWidth: isDesktop ? '100%' : '430px',
        margin: '0 auto',
        overscrollBehavior: 'none',
      }}
    >
      {/* Metadata Modal */}
      <TripMetadataModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        onSave={handleMetadataSave}
        initialData={{
          ...trip.metadata,
          tripId: trip.id,
          sharing: trip.sharing,
          startDate: trip.days?.[0]?.date ? new Date(trip.days[0].date) : undefined,
          endDate: trip.days?.[trip.days.length - 1]?.date ? new Date(trip.days[trip.days.length - 1].date) : undefined
        }}
        currentUser={currentUser}
        mode="edit"
      />

      {/* Header - fisso, non si muove */}
      <div ref={headerRef} className="flex-shrink-0">
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
          editTab={editTab}
          onEditTabChange={setEditTab}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onMapClick={onMapClick}
        />
      </div>

      {/* Calendar Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden px-2 pt-3 pb-3"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          overscrollBehaviorX: 'contain',
        }}
        onScroll={(e) => setIsScrolled((e.target as HTMLDivElement).scrollLeft > 10)}
      >
        {/* 🆕 Render condizionale basato su viewMode */}
        {viewMode === 'card' ? (
          <CardView
            trip={trip}
            selectedDayIndex={selectedDayIndex}
            getCellData={getCellData}
            isToday={isToday}
            onCardClick={handleCardClick}
            editMode={editMode}
            editTab={editTab}
            selectedDays={selectedDays}
            onToggleDaySelection={toggleDaySelection}
            onUpdateDayDate={updateDayDate}
            onMoveAfterDay={(dayIndex) => {
              moveDaysAfter(dayIndex);
              setEditTab('select');
            }}
          />
        ) : (
          <CalendarTable
            key={`table-${trip.updatedAt?.getTime?.() || trip.updatedAt || 'initial'}-${trip.days.length}`}
            trip={trip}
            editMode={editMode}
            editTab={editTab}
            selectedDays={selectedDays}
            isDesktop={isDesktop}
            selectedDayIndex={selectedDayIndex}
            isScrolled={isScrolled}
            justMounted={justMounted}
            currentUserId={currentUser.uid}
            cellHeight={44}
            getCellData={getCellData}
            isToday={isToday}
            onCellClick={handleCellClick}
            onToggleDaySelection={toggleDaySelection}
            onUpdateDayDate={updateDayDate}
            onUpdateCellData={handleUpdateCellData}
            onMoveAfterDay={(dayIndex) => {
              moveDaysAfter(dayIndex);
              setEditTab('select');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CalendarView;