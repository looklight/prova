import React, { useMemo, useCallback } from 'react';
import { Check, ArrowDownToLine } from 'lucide-react';
import { MapPin, Lightbulb, Bed } from 'lucide-react';
import { CategoryIconName } from '../../utils/constants';
import { colors } from '../../styles/theme';
import DayCell from './DayCell';
import { CellDragProvider, useCellDrag } from './CellDragDrop';
import { EditTab } from './CalendarHeader';
import { useLongPress } from '../../hooks/useLongPress';

// ============================================
// ALTROVE - CalendarTable
// Griglia dinamica: destinazione, 1-3 attività, pernottamento
// ============================================

// Mappa icone Lucide
const ICON_MAP: Record<CategoryIconName, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  MapPin,
  Star: Lightbulb,
  Bed,
  Lightbulb,
  Car: Lightbulb,
  Utensils: Lightbulb,
  Wallet: Lightbulb,
  StickyNote: Lightbulb
};

// Categoria base per le righe
interface CalendarRow {
  id: string;
  label: string;
  icon: CategoryIconName;
  type: 'destinazione' | 'attivita' | 'pernottamento';
  activityIndex?: number; // Solo per righe attività
}

interface CalendarTableProps {
  trip: any;
  editMode: boolean;
  editTab?: EditTab;
  selectedDays: number[];
  isDesktop: boolean;
  selectedDayIndex: number | null;
  isScrolled: boolean;
  justMounted: boolean;
  currentUserId: string;
  cellHeight?: number;
  getCellData: (dayId: number, categoryId: string) => any;
  isToday: (date: Date) => boolean;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onToggleDaySelection: (index: number) => void;
  onUpdateDayDate: (dayIndex: number, newDate: string) => void;
  onUpdateCellData?: (updates: Record<string, any>) => Promise<void>;
  onMoveAfterDay?: (dayIndex: number) => void;
}

// ============================================
// DayHeader - Header giorno con long press
// ============================================

interface DayHeaderProps {
  day: any;
  dayIndex: number;
  isToday: boolean;
  isSelected: boolean;
  editMode: boolean;
  editTab: EditTab;
  selectedDays: number[];
  dayNames: string[];
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onToggleDaySelection: (index: number) => void;
  onUpdateDayDate: (dayIndex: number, newDate: string) => void;
  onMoveAfterDay?: (dayIndex: number) => void;
  isCellDragEnabled: boolean;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  day,
  dayIndex,
  isToday,
  isSelected,
  editMode,
  editTab,
  selectedDays,
  dayNames,
  onCellClick,
  onToggleDaySelection,
  onUpdateDayDate,
  onMoveAfterDay,
  isCellDragEnabled
}) => {
  // Usa il context per la selezione giorno
  const {
    selectFullDay,
    handleDayHeaderClick,
    isSelectedDay,
    isFullDaySelectionMode
  } = useCellDrag();

  const isDaySelected = isSelectedDay(day.id);
  const isInFullDayMode = isFullDaySelectionMode();

  // Handler per click normale
  const handleClick = useCallback(() => {
    if (editMode) return;

    // Se siamo in modalità selezione giorno intero
    if (isInFullDayMode) {
      handleDayHeaderClick(day.id);
      return;
    }

    // Altrimenti, apri il day detail
    onCellClick(dayIndex, 'destinazione');
  }, [editMode, isInFullDayMode, handleDayHeaderClick, day.id, dayIndex, onCellClick]);

  // Handler per long press
  const handleLongPress = useCallback(() => {
    if (editMode || !isCellDragEnabled) return;
    selectFullDay(day.id);
  }, [editMode, isCellDragEnabled, selectFullDay, day.id]);

  // Long press handlers
  const longPressHandlers = useLongPress(
    handleLongPress,
    handleClick,
    { delay: 400, disabled: editMode || !isCellDragEnabled }
  );

  // Stile sfondo per giorno selezionato
  const getBackgroundStyle = () => {
    if (isDaySelected) {
      return colors.accentSoft; // Giorno selezionato per drag
    }
    if (isSelected) {
      return colors.accentSoft; // Giorno aperto nel DayDetail
    }
    if (isInFullDayMode) {
      return 'rgba(0,0,0,0.02)'; // Altri giorni quando siamo in modalità selezione
    }
    return 'transparent';
  };

  return (
    <div
      {...(isCellDragEnabled && !editMode ? longPressHandlers : {})}
      onClick={isCellDragEnabled && !editMode ? undefined : handleClick}
      className={`
        text-center py-1 rounded-xl cursor-pointer transition-all select-none
        ${isDaySelected ? 'shadow-md' : ''}
      `}
      style={{
        width: '130px',
        minWidth: '130px',
        backgroundColor: getBackgroundStyle(),
        border: isToday ? `1.5px solid ${colors.accent}` : isDaySelected ? `1.5px solid ${colors.accent}` : '1.5px solid transparent',
        transform: isDaySelected ? 'scale(1.02)' : undefined
      }}
    >
      {/* Checkbox/Target selezione in edit mode */}
      {editMode && (
        <div className="flex justify-start px-2 mb-1">
          {editTab === 'select' ? (
            // Modalità selezione: checkbox
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleDaySelection(dayIndex);
              }}
              className={`
                w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors
                ${selectedDays.includes(dayIndex)
                  ? 'border-blue-500'
                  : 'border-gray-300 bg-white'
                }
              `}
              style={{
                backgroundColor: selectedDays.includes(dayIndex) ? colors.accent : undefined
              }}
            >
              {selectedDays.includes(dayIndex) && (
                <Check size={14} className="text-white" />
              )}
            </div>
          ) : (
            // Modalità sposta: target
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (!selectedDays.includes(dayIndex) && onMoveAfterDay) {
                  onMoveAfterDay(dayIndex);
                }
              }}
              className={`
                w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all
                ${selectedDays.includes(dayIndex)
                  ? 'bg-blue-100 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
                }
              `}
              title={selectedDays.includes(dayIndex) ? 'Giorno selezionato' : 'Sposta qui'}
            >
              {selectedDays.includes(dayIndex) ? (
                <Check size={12} className="text-blue-400" />
              ) : (
                <ArrowDownToLine size={12} className="text-white" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Data picker in edit mode */}
      {editMode ? (
        <input
          type="date"
          value={day.date.toISOString().split('T')[0]}
          onChange={(e) => onUpdateDayDate(dayIndex, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs px-1 py-0.5 border rounded text-center w-full"
          style={{
            fontSize: '10px',
            borderColor: colors.border
          }}
        />
      ) : (
        <div className="relative">
          {isToday && (
            <span
              className="absolute -top-1 -right-1 text-[7px] font-semibold px-1 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.accent,
                color: 'white'
              }}
            >
              oggi
            </span>
          )}
          <div
            className="flex items-baseline justify-center gap-1"
            style={{
              color: isDaySelected || isSelected
                ? colors.accent
                : colors.text
            }}
          >
            <span className="text-[11px] uppercase" style={{ color: colors.textMuted }}>
              {dayNames[day.date.getDay()]}
            </span>
            <span>
              <span className="text-base font-semibold">{day.date.getDate()}</span>
              <span className="text-sm font-normal">/{day.date.getMonth() + 1}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const CalendarTable: React.FC<CalendarTableProps> = ({
  trip,
  editMode,
  editTab = 'select',
  selectedDays,
  isDesktop,
  selectedDayIndex,
  isScrolled,
  justMounted,
  currentUserId,
  cellHeight = 44,
  getCellData,
  isToday,
  onCellClick,
  onToggleDaySelection,
  onUpdateDayDate,
  onUpdateCellData,
  onMoveAfterDay
}) => {

  // Drag celle abilitato quando NON siamo in edit mode
  const isCellDragEnabled = !editMode && !!onUpdateCellData;

  // Nomi giorni
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  // Calcola il numero massimo di attività visibili (showInCalendar) tra tutti i giorni
  const maxVisibleActivities = useMemo(() => {
    let max = 0;
    for (const day of trip.days) {
      const cellData = getCellData(day.id, 'attivita');
      if (cellData?.activities) {
        const visibleCount = cellData.activities.filter((a: any) => a.showInCalendar === true).length;
        if (visibleCount > max) max = visibleCount;
      }
    }
    // Minimo 1 riga attività, massimo 3
    return Math.max(1, Math.min(3, max));
  }, [trip.days, getCellData]);

  // Genera le righe del calendario dinamicamente
  const calendarRows: CalendarRow[] = useMemo(() => {
    const rows: CalendarRow[] = [
      { id: 'destinazione', label: 'Destinazione', icon: 'MapPin', type: 'destinazione' }
    ];

    // Aggiungi righe attività (1-3 basate sul max)
    for (let i = 0; i < maxVisibleActivities; i++) {
      rows.push({
        id: `attivita-${i}`,
        label: maxVisibleActivities === 1 ? 'Attività' : `Attività ${i + 1}`,
        icon: 'Lightbulb',
        type: 'attivita',
        activityIndex: i
      });
    }

    rows.push({ id: 'pernottamento', label: 'Pernottamento', icon: 'Bed', type: 'pernottamento' });

    return rows;
  }, [maxVisibleActivities]);

  // Render icona categoria
  const renderCategoryIcon = (row: CalendarRow) => {
    const IconComponent = ICON_MAP[row.icon];
    return <IconComponent size={16} strokeWidth={2} />;
  };

  // Colore sfondo per label categoria
  const getCategoryLabelBg = (type: string) => {
    switch (type) {
      case 'destinazione': return colors.accentSoft;
      case 'attivita': return colors.warmSoft;
      case 'pernottamento': return colors.successSoft;
      default: return colors.bgSubtle;
    }
  };

  const tableContent = (
    <div className="flex gap-0.5">
      {/* Colonna Labels Categoria - completamente trasparente */}
      <div
        className="flex flex-col gap-0.5 sticky left-0 z-10"
        style={{
          width: isScrolled ? '36px' : '44px',
          minWidth: isScrolled ? '36px' : '44px',
        }}
      >
        {/* Placeholder per allineare con header giorni - stessa struttura */}
        <div
          className="text-center py-1 rounded-xl"
          style={{ width: '100%', minWidth: '100%' }}
        >
          {editMode && (
            <div className="flex justify-start px-2 mb-1">
              <div className="w-5 h-5" /> {/* Stesso spazio del checkbox */}
            </div>
          )}
          {editMode ? (
            <input
              type="date"
              disabled
              className="text-xs px-1 py-0.5 border rounded text-center w-full invisible"
              style={{ fontSize: '10px' }}
            />
          ) : (
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-[11px] uppercase invisible">Lun</span>
              <span className="text-base font-semibold invisible">00</span>
            </div>
          )}
        </div>

        {/* Icone categoria */}
        {calendarRows.map(row => (
          <div
            key={row.id}
            className="flex items-center justify-center transition-all duration-300"
            style={{
              height: `${cellHeight}px`,
            }}
          >
            <div
              className="flex items-center justify-center rounded-lg transition-all duration-300 shadow-sm"
              style={{
                width: isScrolled ? '28px' : '36px',
                height: isScrolled ? '28px' : '36px',
                backgroundColor: getCategoryLabelBg(row.type),
                color: colors.text
              }}
            >
              {renderCategoryIcon(row)}
            </div>
          </div>
        ))}
      </div>

      {/* Colonne Giorni */}
      {trip.days.map((day: any, dayIndex: number) => (
        <div
          key={day.id}
          className="flex flex-col gap-0.5"
          data-day-id={day.id}
        >
          {/* Header Giorno */}
          <DayHeader
            day={day}
            dayIndex={dayIndex}
            isToday={isToday(day.date)}
            isSelected={selectedDayIndex === dayIndex}
            editMode={editMode}
            editTab={editTab}
            selectedDays={selectedDays}
            dayNames={dayNames}
            onCellClick={onCellClick}
            onToggleDaySelection={onToggleDaySelection}
            onUpdateDayDate={onUpdateDayDate}
            onMoveAfterDay={onMoveAfterDay}
            isCellDragEnabled={isCellDragEnabled}
          />

          {/* Celle Categorie */}
          {calendarRows.map(row => (
            <DayCell
              key={`${day.id}-${row.id}`}
              day={day}
              dayIndex={dayIndex}
              category={{ id: row.type, label: row.label, icon: row.icon }}
              cellData={getCellData(day.id, row.type)}
              selectedDays={selectedDays}
              editMode={editMode}
              isDesktop={isDesktop}
              selectedDayIndex={selectedDayIndex}
              trip={trip}
              cellHeight={cellHeight}
              isCellDragEnabled={isCellDragEnabled}
              onCellClick={onCellClick}
              activityIndex={row.activityIndex}
              isToday={isToday(day.date)}
            />
          ))}
        </div>
      ))}
    </div>
  );

  // getCellData esteso per supportare anche le destinazioni
  const getCellDataForDrag = useCallback((dayId: number, categoryId: string) => {
    if (categoryId === 'destinazione') {
      const day = trip.days.find((d: any) => d.id === dayId);
      return day?.destinations || [];
    }
    return getCellData(dayId, categoryId);
  }, [trip.days, getCellData]);

  // tripData esteso per includere anche le destinazioni
  const tripDataForDrag = useMemo(() => {
    const data: Record<string, any> = { ...trip.data };
    // Aggiungi le destinazioni nel formato speciale
    for (const day of trip.days) {
      data[`days:${day.id}:destinations`] = day.destinations || [];
    }
    return data;
  }, [trip.data, trip.days]);

  // Wrappa sempre con CellDragProvider per avere il context disponibile
  // isDragEnabled controlla se le funzionalità di drag sono attive
  return (
    <CellDragProvider
      tripData={tripDataForDrag}
      tripDays={trip.days}
      onUpdateTripData={onUpdateCellData || (async () => {})}
      getCellData={getCellDataForDrag}
      isDragEnabled={isCellDragEnabled}
    >
      {tableContent}
    </CellDragProvider>
  );
};

export default CalendarTable;