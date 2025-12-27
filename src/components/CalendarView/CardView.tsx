import React from 'react';
import { MapPin, Bed, Check, ArrowDownToLine, Lightbulb } from 'lucide-react';
import { ALTROVE_COLORS } from '../../utils/constants';
import { ActivityTypeIcon } from '../../utils/activityTypes';
import { EditTab } from './CalendarHeader';

// ============================================
// ALTROVE - CardView
// Vista a schede giornaliere (default view)
// ============================================

interface CardViewProps {
  trip: any;
  selectedDayIndex: number | null;
  getCellData: (dayId: number, categoryId: string) => any;
  isToday: (date: Date) => boolean;
  onCardClick: (dayIndex: number) => void;
  // Edit mode props
  editMode?: boolean;
  editTab?: EditTab;
  selectedDays?: number[];
  onToggleDaySelection?: (index: number) => void;
  onUpdateDayDate?: (dayIndex: number, newDate: string) => void;
  onMoveAfterDay?: (dayIndex: number) => void;
}

// Palette colori per destinazioni - stessa città = stesso colore
const DESTINATION_COLORS = [
  '#7EB5A6', // Salvia (accent)
  '#D4948A', // Rosa antico (warm)
  '#8BB8C9', // Cielo
  '#A89EC9', // Lavanda
  '#E5C07B', // Oro morbido (warning)
  '#7CB892', // Verde fresco (success)
];

// Genera un colore consistente per una destinazione basato sul nome
const getDestinationColor = (name: string): string => {
  if (!name) return DESTINATION_COLORS[0];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.toLowerCase().charCodeAt(i);
    hash |= 0;
  }
  
  const index = Math.abs(hash) % DESTINATION_COLORS.length;
  return DESTINATION_COLORS[index];
};

// Componente per il booking dot
// Mostra verde per 'yes', arancione per 'no', niente per 'na'
const BookingDot: React.FC<{ status?: 'yes' | 'no' | 'na' }> = ({ status }) => {
  if (!status || status === 'na') return null;
  const color = status === 'yes' ? ALTROVE_COLORS.success : ALTROVE_COLORS.warm;
  return (
    <div
      className="w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1"
      style={{ backgroundColor: color }}
    />
  );
};

// Componente singola card giorno
const DayCard: React.FC<{
  day: any;
  dayIndex: number;
  isSelected: boolean;
  isToday: boolean;
  getCellData: (dayId: number, categoryId: string) => any;
  onClick: () => void;
  trip: any;
  // Edit mode props
  editMode?: boolean;
  editTab?: EditTab;
  selectedDays?: number[];
  onToggleDaySelection?: (index: number) => void;
  onUpdateDayDate?: (dayIndex: number, newDate: string) => void;
  onMoveAfterDay?: (dayIndex: number) => void;
}> = ({
  day,
  dayIndex,
  isSelected,
  isToday,
  getCellData,
  onClick,
  trip,
  editMode = false,
  editTab = 'select',
  selectedDays = [],
  onToggleDaySelection,
  onUpdateDayDate,
  onMoveAfterDay
}) => {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const monthNames = ['/1', '/2', '/3', '/4', '/5', '/6', '/7', '/8', '/9', '/10', '/11', '/12'];
  
  // Dati celle
  const destinationData = getCellData(day.id, 'destinazione');
  const activityData = getCellData(day.id, 'attivita');
  const accommodationData = getCellData(day.id, 'pernottamento');
  
  // Destinazioni (da day.destinations o fallback a cellData)
  const destinations = day.destinations && day.destinations.length > 0
    ? day.destinations
    : (destinationData?.title ? destinationData.title.split(' → ').filter(Boolean) : []);
  
  // Ha geotag? (controlla se almeno una destinazione ha coordinate in trip.metadata.destinations)
  const geotaggedNames = (trip?.metadata?.destinations || [])
    .filter((d: any) => d.coordinates || d.lat || d.lng)
    .map((d: any) => (typeof d === 'string' ? d : d.name)?.toLowerCase());

  const hasGeoTag = destinations.some((dest: string) =>
    geotaggedNames.includes(dest?.toLowerCase())
  );
  
  // Attività (max 3 visibili + indicatore)
  const activities = activityData?.activities || [];
  const visibleActivities = activities.filter((a: any) => a.showInCalendar === true);
  const displayActivities = visibleActivities.length > 0 ? visibleActivities : activities;
  const shownActivities = displayActivities.slice(0, 3);
  const hiddenCount = displayActivities.length - 3;
  
  // Pernottamento
  const accommodation = accommodationData?.title;
  const accommodationBookingStatus = accommodationData?.bookingStatus;
  
  // Card vuota?
  const isEmpty = destinations.length === 0 && activities.length === 0 && !accommodation;

  // Edit mode: giorno selezionato?
  const isDaySelected = selectedDays.includes(dayIndex);

  // Handler per click sulla card
  const handleCardClick = () => {
    if (editMode) {
      if (editTab === 'select') {
        // Modalità selezione: toggle selezione giorno
        onToggleDaySelection?.(dayIndex);
      } else if (editTab === 'move') {
        // Modalità sposta: imposta come target (solo se non è già selezionato)
        if (!isDaySelected) {
          onMoveAfterDay?.(dayIndex);
        }
      }
    } else {
      onClick();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      data-day-id={day.id}
      className={`
        flex-shrink-0 rounded-2xl cursor-pointer transition-all duration-200
        ${isSelected && !editMode ? 'ring-2 ring-offset-1' : ''}
        ${isDaySelected ? 'ring-2 ring-offset-1' : ''}
        ${!isSelected && !isDaySelected ? 'hover:shadow-md' : ''}
      `}
      style={{
        width: '152px',
        minWidth: '152px',
        backgroundColor: ALTROVE_COLORS.bgCard || '#FFFFFF',
        borderColor: isDaySelected ? ALTROVE_COLORS.accent : (isSelected ? ALTROVE_COLORS.accent : 'transparent'),
        boxShadow: isSelected || isDaySelected
          ? '0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)'
          : '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        transform: isSelected || isDaySelected ? 'scale(1.05)' : undefined
      }}
    >
      {/* Header: Data + Badge oggi + Edit controls */}
      <div
        className="px-3 py-1.5 rounded-t-2xl border-b"
        style={{
          backgroundColor: isDaySelected
            ? `${ALTROVE_COLORS.accent}20`
            : (isToday ? `${ALTROVE_COLORS.accent}15` : 'transparent'),
          borderColor: ALTROVE_COLORS.border
        }}
      >
        {/* Edit mode controls */}
        {editMode && (
          <div className="flex justify-end mb-1">
            {editTab === 'select' ? (
              // Checkbox per selezione
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                  ${isDaySelected ? 'border-transparent' : 'border-gray-300 bg-white'}
                `}
                style={{
                  backgroundColor: isDaySelected ? ALTROVE_COLORS.accent : undefined
                }}
              >
                {isDaySelected && (
                  <Check size={14} className="text-white" />
                )}
              </div>
            ) : (
              // Target per spostamento
              <div
                className={`
                  w-5 h-5 rounded flex items-center justify-center transition-all
                  ${isDaySelected
                    ? 'bg-blue-100 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
                  }
                `}
                title={isDaySelected ? 'Giorno selezionato' : 'Sposta qui'}
              >
                {isDaySelected ? (
                  <Check size={12} className="text-blue-400" />
                ) : (
                  <ArrowDownToLine size={12} className="text-white" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Date display / Date picker */}
        {editMode ? (
          <input
            type="date"
            value={day.date.toISOString().split('T')[0]}
            onChange={(e) => onUpdateDayDate?.(dayIndex, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-1 py-0.5 border rounded text-center w-full"
            style={{
              fontSize: '11px',
              borderColor: ALTROVE_COLORS.border
            }}
          />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span
                className="text-xs uppercase"
                style={{ color: ALTROVE_COLORS.textMuted }}
              >
                {dayNames[day.date.getDay()]}
              </span>
              <span
                className="text-lg font-semibold"
                style={{ color: isSelected ? ALTROVE_COLORS.accent : ALTROVE_COLORS.text }}
              >
                {day.date.getDate()}
              </span>
              <span
                className="text-[11px]"
                style={{ color: ALTROVE_COLORS.textMuted }}
              >
                {monthNames[day.date.getMonth()]}
              </span>
            </div>
            {isToday && (
              <span
                className="text-[9px] font-medium px-1 py-0.5 rounded-full"
                style={{
                  backgroundColor: ALTROVE_COLORS.accent,
                  color: '#FFFFFF'
                }}
              >
                OGGI
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content - flex column per allineare pernottamento in fondo */}
      <div className="px-3 pt-1 pb-2 flex flex-col" style={{ minHeight: '140px' }}>
        {isEmpty ? (
          <div
            className="flex items-center justify-center flex-1"
            style={{ color: ALTROVE_COLORS.textMuted }}
          >
            {isSelected ? (
              <div className="text-center px-2 space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <MapPin size={12} style={{ color: ALTROVE_COLORS.accent }} />
                  <Lightbulb size={12} style={{ color: ALTROVE_COLORS.accent }} />
                  <Bed size={12} style={{ color: ALTROVE_COLORS.accent }} />
                </div>
                <p className="text-[11px] leading-tight">
                  Aggiungi destinazioni, attività e pernottamento
                </p>
              </div>
            ) : (
              <span className="text-lg">—</span>
            )}
          </div>
        ) : (
          <>
            {/* Destinazione - ALTEZZA FISSA con contenuto centrato verticalmente */}
            <div
              className="flex-shrink-0 overflow-hidden flex items-center"
              style={{ height: '34px' }}
            >
              {destinations.length > 0 && (
                <div className="flex flex-wrap items-center" style={{ rowGap: '0px', lineHeight: '1.2' }}>
                  {/* Prima destinazione con MapPin */}
                  <div className="flex items-center gap-1 min-w-0">
                    {hasGeoTag && (
                      <MapPin
                        size={12}
                        className="flex-shrink-0"
                        style={{ color: getDestinationColor(destinations[0]) }}
                      />
                    )}
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: getDestinationColor(destinations[0]) }}
                    >
                      {destinations[0]}
                    </span>
                  </div>

                  {/* Seconda destinazione con freccia */}
                  {destinations.length > 1 && destinations[1] && (
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: ALTROVE_COLORS.textMuted }}
                      >
                        →
                      </span>
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: getDestinationColor(destinations[1]) }}
                      >
                        {destinations[1]}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attività - FLEX-1 prende spazio rimanente */}
            <div className="flex-1 overflow-hidden py-1">
              {shownActivities.length > 0 && (
                <div className="space-y-0.5">
                  {shownActivities.map((activity: any, idx: number) => (
                    <div
                      key={activity.id || idx}
                      className="flex items-center gap-1"
                    >
                      <BookingDot status={activity.bookingStatus} />
                      <ActivityTypeIcon
                        type={activity.type}
                        size={12}
                        showColor={true}
                        className="flex-shrink-0"
                        calendarOnly={true}
                      />
                      <span
                        className="text-xs truncate flex-1"
                        style={{ color: ALTROVE_COLORS.text, opacity: 0.8 }}
                      >
                        {activity.title || 'Attività'}
                      </span>
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <span
                      className="text-[11px] block"
                      style={{ color: ALTROVE_COLORS.textMuted }}
                    >
                      +{hiddenCount} {hiddenCount === 1 ? 'altra' : 'altre'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Pernottamento - ALTEZZA FISSA sempre in fondo */}
            <div
              className="flex-shrink-0"
              style={{ height: '24px' }}
            >
              {accommodation && (
                <div
                  className="flex items-center gap-1.5 pt-0.5 border-t"
                  style={{ borderColor: ALTROVE_COLORS.border }}
                >
                  <BookingDot status={accommodationBookingStatus} />
                  <Bed
                    size={12}
                    className="flex-shrink-0"
                    style={{ color: ALTROVE_COLORS.success }}
                  />
                  <span
                    className="text-xs truncate flex-1"
                    style={{ color: ALTROVE_COLORS.text }}
                  >
                    {accommodation}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CardView: React.FC<CardViewProps> = ({
  trip,
  selectedDayIndex,
  getCellData,
  isToday,
  onCardClick,
  // Edit mode props
  editMode = false,
  editTab = 'select',
  selectedDays = [],
  onToggleDaySelection,
  onUpdateDayDate,
  onMoveAfterDay
}) => {
  return (
    <div className="flex gap-2 pb-2">
      {trip.days.map((day: any, dayIndex: number) => (
        <DayCard
          key={day.id}
          day={day}
          dayIndex={dayIndex}
          isSelected={selectedDayIndex === dayIndex}
          isToday={isToday(day.date)}
          getCellData={getCellData}
          onClick={() => onCardClick(dayIndex)}
          trip={trip}
          editMode={editMode}
          editTab={editTab}
          selectedDays={selectedDays}
          onToggleDaySelection={onToggleDaySelection}
          onUpdateDayDate={onUpdateDayDate}
          onMoveAfterDay={onMoveAfterDay}
        />
      ))}
    </div>
  );
};

export default CardView;