import React, { useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';
import { useCellDrag } from './CellDragDrop';
import { ALTROVE_COLORS } from '../../utils/constants';
import { ActivityTypeIcon } from '../../utils/activityTypes';

// ============================================
// ALTROVE - DayCell
// Cella pulita: titolo, booking dots
// ============================================

/**
 * Booking Dot - pallino colorato per stato prenotazione
 * Usa bookingStatus: 'yes' | 'no' | 'na'
 */
const BookingDot: React.FC<{ status?: 'yes' | 'no' | 'na' }> = ({ status }) => {
  if (!status || status === 'na') return null;

  const color = status === 'yes' ? ALTROVE_COLORS.success : ALTROVE_COLORS.warm;

  return (
    <div
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
};

/**
 * Palette colori per destinazioni - stessa città = stesso colore
 */
const DESTINATION_COLORS = [
  '#7EB5A6', // Salvia (accent)
  '#D4948A', // Rosa antico (warm)
  '#8BB8C9', // Cielo
  '#A89EC9', // Lavanda
  '#E5C07B', // Oro morbido (warning)
  '#7CB892', // Verde fresco (success)
];

/**
 * Genera un colore consistente per una destinazione basato sul nome
 */
const getDestinationColor = (name: string): string => {
  if (!name) return DESTINATION_COLORS[0];

  // Hash semplice del nome per ottenere un indice consistente
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.toLowerCase().charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % DESTINATION_COLORS.length;
  return DESTINATION_COLORS[index];
};

/**
 * Destination Content - per celle destinazione (max 2)
 * Flex wrap adattivo: sulla stessa riga se c'è spazio, altrimenti a capo
 * Stessa destinazione = stesso colore per facile identificazione visiva
 */
const DestinationContent: React.FC<{
  destinations?: string[];
  hasGeoTag?: boolean;
}> = ({ destinations, hasGeoTag }) => {
  if (!destinations || destinations.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center w-full gap-x-0.5 gap-y-0">
      {/* Prima destinazione con MapPin se ha geotag */}
      <div className="flex items-center gap-0.5 min-w-0">
        {hasGeoTag && (
          <MapPin
            size={11}
            className="flex-shrink-0"
            style={{ color: getDestinationColor(destinations[0]) }}
          />
        )}
        <span
          className="text-[11px] font-semibold text-center leading-tight truncate"
          style={{ color: getDestinationColor(destinations[0]) }}
        >
          {destinations[0]}
        </span>
      </div>

      {/* Freccia e seconda destinazione */}
      {destinations.length > 1 && destinations[1] && (
        <div className="flex items-center gap-0.5 min-w-0">
          <span
            className="text-[9px] flex-shrink-0"
            style={{ color: ALTROVE_COLORS.textMuted }}
          >
            →
          </span>
          <span
            className="text-[11px] font-semibold text-center leading-tight truncate"
            style={{ color: getDestinationColor(destinations[1]) }}
          >
            {destinations[1]}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Activity Content - per celle attività (mostra fino a 3 attività con showInCalendar)
 */
const ActivityContent: React.FC<{ activities?: any[] }> = ({ activities }) => {
  if (!activities || activities.length === 0) return null;

  // Mostra solo attività con showInCalendar = true (max 3)
  const visibleActivities = activities.filter(a => a.showInCalendar === true).slice(0, 3);

  // Se nessuna attività è marcata, mostra le prime 3 (fallback per retrocompatibilità)
  const displayActivities = visibleActivities.length > 0
    ? visibleActivities
    : activities.slice(0, 3);

  // Conta attività nascoste (totali - visibili nel calendario)
  const hiddenCount = activities.length - displayActivities.length;

  if (displayActivities.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-0">
      {displayActivities.map((activity, idx) => (
        <div
          key={activity.id || idx}
          className="flex items-center gap-0.5 max-w-[110px]"
        >
          <ActivityTypeIcon
            type={activity.type}
            size={10}
            showColor={true}
            className="flex-shrink-0"
            calendarOnly={true}
          />
          <span
            className="text-[10px] font-medium text-center leading-tight truncate"
            style={{ color: ALTROVE_COLORS.text }}
          >
            {activity.title || 'Attività'}
          </span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <span
          className="text-[8px]"
          style={{ color: ALTROVE_COLORS.textMuted }}
        >
          +{hiddenCount} {hiddenCount === 1 ? 'altra' : 'altre'}
        </span>
      )}
    </div>
  );
};

// ============================================
// PROPS
// ============================================

interface DayCellProps {
  day: any;
  dayIndex: number;
  category: any;
  cellData: any;
  selectedDays: number[];
  editMode: boolean;
  isDesktop: boolean;
  selectedDayIndex: number | null;
  trip: any;
  cellHeight?: number;
  isCellDragEnabled?: boolean;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  activityIndex?: number; // Indice dell'attività da mostrare (per righe attività multiple)
  isToday?: boolean; // Se è il giorno corrente
}

// ============================================
// COMPONENT
// ============================================

const DayCell: React.FC<DayCellProps> = ({
  day,
  dayIndex,
  category,
  cellData,
  selectedDays,
  editMode,
  isDesktop,
  selectedDayIndex,
  trip,
  cellHeight = 44,
  isCellDragEnabled = false,
  onCellClick,
  activityIndex,
  isToday = false
}) => {
  // Drag context (se disponibile)
  let dragContext: any = null;
  try {
    dragContext = useCellDrag();
  } catch {
    // Non siamo dentro un CellDragProvider
  }

  const cellKey = `${day.id}-${category.id}${activityIndex !== undefined ? `-${activityIndex}` : ''}`;
  const isDestination = category.id === 'destinazione';
  const isActivity = category.id === 'attivita';

  // Per attività, ottieni le attività visibili (showInCalendar: true)
  const visibleActivities = isActivity && cellData?.activities
    ? cellData.activities.filter((a: any) => a.showInCalendar === true)
    : [];

  // L'attività specifica da mostrare per questa riga
  const activityForThisRow = activityIndex !== undefined ? visibleActivities[activityIndex] : null;

  // Logica per determinare se c'è contenuto
  // - Destinazione: controlla SOLO day.destinations (non usare fallback legacy)
  // - Attività con indice: controlla se esiste l'attività a quell'indice
  // - Attività senza indice (legacy): controlla array activities
  // - Altro (pernottamento): controlla cellData.title
  const hasContent = isDestination
    ? (day.destinations && day.destinations.length > 0)
    : isActivity
      ? activityIndex !== undefined
        ? !!activityForThisRow
        : (cellData && cellData.activities && cellData.activities.length > 0)
      : (cellData && cellData.title);

  // Per destinazioni, usa SOLO day.destinations (no fallback legacy)
  const destinationsList = day.destinations || [];

  // Ha geotag? (controlla se almeno una destinazione ha coordinate in trip.metadata.destinations)
  const geotaggedNames = (trip?.metadata?.destinations || [])
    .filter((d: any) => d.coordinates || d.lat || d.lng)
    .map((d: any) => (typeof d === 'string' ? d : d.name)?.toLowerCase());

  const hasGeoTag = destinationsList.some((dest: string) =>
    geotaggedNames.includes(dest?.toLowerCase())
  );


  // Stato selezione per drag
  const isSelected = dragContext?.isSelectedCell(day.id, category.id, activityIndex) ?? false;
  const isSelectionMode = dragContext?.isSelectionMode() ?? false;
  const isValidTarget = dragContext?.isValidTarget(category.id) ?? false;

  // Handler per long-press (seleziona cella per drag)
  const handleLongPress = useCallback(() => {
    if (!isCellDragEnabled || !dragContext || !hasContent) return;
    dragContext.selectCell({ dayId: day.id, categoryId: category.id, activityIndex });
  }, [isCellDragEnabled, dragContext, hasContent, day.id, category.id, activityIndex]);

  // Handler per click
  const handleClick = useCallback(() => {
    if (!isCellDragEnabled || !dragContext) {
      onCellClick(dayIndex, category.id);
      return;
    }

    const result = dragContext.handleCellClick({ dayId: day.id, categoryId: category.id, activityIndex });

    if (result === 'open') {
      onCellClick(dayIndex, category.id);
    }
  }, [isCellDragEnabled, dragContext, dayIndex, category.id, day.id, onCellClick, activityIndex]);

  // Long press hook
  const longPressHandlers = useLongPress(handleLongPress, handleClick, {
    delay: 500,
    disabled: !isCellDragEnabled || !hasContent
  });

  // Decidi se usare long press (solo celle con contenuto possono iniziare drag)
  const shouldUseLongPress = isCellDragEnabled && hasContent;

  // Decidi se usare handleClick (per gestire selezione target)
  // - celle con contenuto: sempre (gestite da longPressHandlers)
  // - celle vuote: solo quando siamo in modalità selezione
  const shouldUseHandleClick = shouldUseLongPress || (isCellDragEnabled && isSelectionMode);

  // Classi per selezione drag
  const getSelectionClasses = () => {
    if (!isSelectionMode) return '';
    if (isSelected) return 'ring-2 ring-blue-500 ring-inset bg-blue-50';
    // Evidenzia celle valide come destinazione (bordo leggero)
    if (isValidTarget && !isSelected) return 'ring-1 ring-blue-300/60 ring-inset';
    return '';
  };

  // Colore di sfondo della categoria
  const getCategoryBgColor = () => {
    if (!hasContent) return 'transparent';
    switch (category.id) {
      case 'destinazione': return ALTROVE_COLORS.accentSoft;
      case 'attivita': return ALTROVE_COLORS.warmSoft;
      case 'pernottamento': return ALTROVE_COLORS.successSoft;
      default: return ALTROVE_COLORS.bgSubtle;
    }
  };

  return (
    <div
      {...(shouldUseLongPress ? longPressHandlers : {})}
      onClick={shouldUseLongPress ? undefined : (shouldUseHandleClick ? handleClick : () => onCellClick(dayIndex, category.id))}
      className={`
        text-center transition-all duration-150 select-none
        ${editMode ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${!editMode && !isSelectionMode ? 'hover:opacity-80 active:scale-[0.97]' : ''}
        ${getSelectionClasses()}
      `}
      style={{
        height: `${cellHeight}px`,
        width: '130px',
        minWidth: '130px',
        maxWidth: '130px',
        padding: '3px'
      }}
    >
      <div
        className="w-full h-full rounded-lg flex flex-col justify-center items-center relative"
        style={{
          backgroundColor: hasContent ? getCategoryBgColor() : 'transparent',
          border: hasContent
            ? selectedDayIndex === dayIndex
              ? `1.5px solid ${ALTROVE_COLORS.accent}90`
              : '1px solid transparent'
            : selectedDayIndex === dayIndex
              ? `1.5px solid ${ALTROVE_COLORS.accent}90`
              : `1px dashed ${ALTROVE_COLORS.border}`,
          padding: '4px 6px'
        }}
      >
        {hasContent ? (
          <>
            {/* Booking dot - top right (per attività e pernottamento) */}
            {isActivity && activityForThisRow?.bookingStatus && activityForThisRow.bookingStatus !== 'na' && (
              <div className="absolute top-1 right-1">
                <BookingDot status={activityForThisRow.bookingStatus} />
              </div>
            )}
            {!isDestination && !isActivity && cellData?.bookingStatus && cellData.bookingStatus !== 'na' && (
              <div className="absolute top-1 right-1">
                <BookingDot status={cellData.bookingStatus} />
              </div>
            )}

            {/* Content */}
            {isDestination ? (
              <DestinationContent destinations={destinationsList} hasGeoTag={!!hasGeoTag} />
            ) : isActivity ? (
              // Mostra singola attività se activityIndex è definito
              activityForThisRow ? (
                <div className="flex items-center gap-1 w-full justify-center">
                  <ActivityTypeIcon
                    type={activityForThisRow.type}
                    size={12}
                    showColor={true}
                    className="flex-shrink-0"
                    calendarOnly={true}
                  />
                  <span
                    className="text-[11px] font-medium text-center leading-tight"
                    style={{
                      color: ALTROVE_COLORS.text,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word'
                    }}
                  >
                    {activityForThisRow.title || 'Attività'}
                  </span>
                </div>
              ) : (
                <ActivityContent activities={cellData?.activities || []} />
              )
            ) : (
              // Pernottamento
              <span
                className="text-[11px] font-medium text-center leading-tight"
                style={{
                  color: ALTROVE_COLORS.text,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word'
                }}
              >
                {cellData.title}
              </span>
            )}
          </>
        ) : (
          // Placeholder semplice
          <span
            style={{
              fontSize: '18px',
              fontWeight: 300,
              color: ALTROVE_COLORS.textPlaceholder
            }}
          >
            +
          </span>
        )}
      </div>
    </div>
  );
};

export default DayCell;