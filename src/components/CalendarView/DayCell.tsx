import React, { useCallback } from 'react';
import { MapPin, Bell } from 'lucide-react';
import { TRANSPORT_OPTIONS } from '../../utils/constants';
import { useLongPress } from '../../hooks/useLongPress';
import { useCellDrag } from './CellDragDrop';

/**
 * Helper per determinare il colore del costo basato su UTENTI UNICI ATTIVI
 */
const getCostColor = (cellData, currentUserId, tripMembers) => {
  if (!cellData.costBreakdown || cellData.costBreakdown.length === 0 || !tripMembers) {
    return 'text-gray-400';
  }

  const activeBreakdown = cellData.costBreakdown.filter(entry => {
    const member = tripMembers[entry.userId];
    return member && member.status === 'active';
  });

  if (activeBreakdown.length === 0) {
    return 'text-gray-400';
  }

  const uniquePayers = new Set(activeBreakdown.map(e => e.userId));
  const uniquePayersCount = uniquePayers.size;

  if (uniquePayersCount > 1) {
    return 'text-orange-400';
  }

  const singlePayer = activeBreakdown[0].userId;

  if (singlePayer === currentUserId) {
    return 'text-blue-500';
  } else {
    return 'text-gray-400';
  }
};

/**
 * Helper per verificare se una cella ha media allegati
 */
const hasMediaAttachments = (cellData) => {
  if (!cellData) return false;

  const hasLinks = cellData.links && cellData.links.length > 0;
  const hasImages = cellData.images && cellData.images.length > 0;
  const hasVideos = cellData.videos && cellData.videos.length > 0;
  const hasMediaNotes = cellData.mediaNotes && cellData.mediaNotes.length > 0;

  return hasLinks || hasImages || hasVideos || hasMediaNotes;
};

/**
 * Helper per verificare se la cella ha contenuto
 */
const cellHasContentCheck = (cellData, categoryId, otherExpensesData) => {
  if (categoryId === 'otherExpenses') {
    return otherExpensesData && otherExpensesData.count > 0;
  }
  return cellData && (cellData.title || cellData.cost || cellData.notes);
};

interface DayCellProps {
  day: any;
  dayIndex: number;
  category: any;
  cellData: any;
  highlightColor: string | null;
  selectedDays: number[];
  editMode: boolean;
  isDesktop: boolean;
  selectedDayIndex: number | null;
  costVisible: boolean;
  expandedNotes: boolean;
  expandedOtherExpenses: boolean;
  showLocationIndicators: boolean;
  currentUserId: string;
  trip: any;
  cellHeight?: number;
  isCellDragEnabled?: boolean;
  onCellClick: (dayIndex: number, categoryId: string) => void;
  onCellHoverEnter: (cellKey: string) => void;
  onCellHoverLeave: () => void;
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  dayIndex,
  category,
  cellData,
  highlightColor,
  selectedDays,
  editMode,
  isDesktop,
  selectedDayIndex,
  costVisible,
  expandedNotes,
  expandedOtherExpenses,
  showLocationIndicators,
  currentUserId,
  trip,
  cellHeight = 48,
  isCellDragEnabled = false,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave
}) => {
  // 🆕 Accedi al contesto drag (se disponibile)
  let dragContext = null;
  try {
    dragContext = useCellDrag();
  } catch {
    // Non siamo dentro un CellDragProvider, ok
  }

  // 💸 Se è la riga "Altre Spese", calcola il totale (solo membri attivi)
  let otherExpensesData = null;
  if (category.id === 'otherExpenses') {
    const key = `${day.id}-otherExpenses`;
    const expensesRaw = trip.data[key];
    const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];

    const realExpenses = expenses.filter((exp: any) => {
      const hasContent = (exp.title && exp.title.trim() !== '') || (exp.cost && exp.cost.trim() !== '');
      if (!hasContent) return false;

      if (exp.costBreakdown && Array.isArray(exp.costBreakdown)) {
        const hasActiveMembers = exp.costBreakdown.some(entry => {
          const member = trip.sharing?.members?.[entry.userId];
          return member && member.status === 'active';
        });
        return hasActiveMembers;
      }

      return true;
    });

    const count = realExpenses.length;
    const total = realExpenses.reduce((sum: number, exp: any) => {
      if (!exp.costBreakdown || !Array.isArray(exp.costBreakdown)) {
        return sum + (exp.cost ? parseFloat(exp.cost) : 0);
      }
      const activeTotal = exp.costBreakdown
        .filter(entry => {
          const member = trip.sharing?.members?.[entry.userId];
          return member && member.status === 'active';
        })
        .reduce((subSum, entry) => subSum + (parseFloat(entry.amount) || 0), 0);
      return sum + activeTotal;
    }, 0);

    otherExpensesData = { count, total };
  }

  const hasContent = category.id === 'otherExpenses'
    ? otherExpensesData && otherExpensesData.count > 0
    : cellData && (cellData.title || cellData.cost || cellData.notes);

  const cellKey = `${dayIndex}-${category.id}`;

  // Calcola il costo visualizzato (solo da membri attivi)
  let displayCost = 0;
  if (category.id !== 'base' && category.id !== 'note' && category.id !== 'otherExpenses' && cellData?.costBreakdown) {
    const activeBreakdown = cellData.costBreakdown.filter(entry => {
      const member = trip.sharing?.members?.[entry.userId];
      return member && member.status === 'active';
    });
    displayCost = activeBreakdown.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  } else if (category.id !== 'otherExpenses' && cellData?.cost) {
    displayCost = parseFloat(cellData.cost) || 0;
  }

  // Indicatori
  const showMediaIndicator = expandedNotes &&
    category.id !== 'base' &&
    category.id !== 'note' &&
    category.id !== 'otherExpenses' &&
    hasMediaAttachments(cellData);

  const hasLocation = showLocationIndicators &&
    cellData?.location &&
    (cellData.location.coordinates || cellData.location.address);

  const hasStartTime = showLocationIndicators && cellData?.startTime;
  const hasEndTime = showLocationIndicators && cellData?.endTime;
  const hasReminder = showLocationIndicators && cellData?.reminder?.date;

  // 🆕 Stato selezione per questa cella
  const isSelected = dragContext?.isSelectedCell(day.id, category.id) ?? false;
  const isSelectionMode = dragContext?.isSelectionMode() ?? false;

  // 🆕 Handler per long-press (seleziona cella)
  const handleLongPress = useCallback(() => {
    if (!isCellDragEnabled || !dragContext || !hasContent) return;
    dragContext.selectCell({ dayId: day.id, categoryId: category.id });
  }, [isCellDragEnabled, dragContext, hasContent, day.id, category.id]);

  // 🆕 Handler per click
  const handleClick = useCallback(() => {
    if (!isCellDragEnabled || !dragContext) {
      // Nessun drag context, apri normalmente
      onCellClick(dayIndex, category.id);
      return;
    }

    // Usa il context per decidere cosa fare
    const result = dragContext.handleCellClick({ dayId: day.id, categoryId: category.id });

    if (result === 'open') {
      // Apri la cella normalmente
      onCellClick(dayIndex, category.id);
    }
    // 'action' e 'ignore' non fanno nulla qui (gestiti dal context)
  }, [isCellDragEnabled, dragContext, onCellClick, dayIndex, category.id, day.id]);

  // 🆕 Long press hook
  const longPressHandlers = useLongPress(
    handleLongPress,
    handleClick,
    { delay: 400 }
  );

  // 🆕 Calcola classi per stato selezione
  const getSelectionClasses = () => {
    if (isSelected) {
      // Cella selezionata (origine)
      return 'ring-2 ring-blue-500 ring-inset bg-blue-100';
    }

    if (isSelectionMode && !isSelected) {
      // Tutte le altre celle durante selezione (possibili target)
      if (hasContent) {
        return 'ring-2 ring-orange-100 ring-inset bg-orange-50/40';
      } else {
        return 'ring-2 ring-green-100 ring-inset bg-green-50/40';
      }
    }

    return '';
  };

  // Calcola altezza cella
  const calculatedHeight = category.id === 'note'
    ? (expandedNotes ? Math.round(cellHeight * 1.5) : cellHeight)
    : category.id === 'otherExpenses'
      ? (expandedOtherExpenses ? Math.round(cellHeight * 1.5) : cellHeight)
      : cellHeight;

  // Determina se usare long-press handlers
  const shouldUseLongPress = isCellDragEnabled && !editMode;

  return (
    <td
      key={`${day.id}-${category.id}`}
      {...(shouldUseLongPress ? longPressHandlers : {})}
      onClick={shouldUseLongPress ? undefined : () => onCellClick(dayIndex, category.id)}
      onMouseEnter={() => onCellHoverEnter(cellKey)}
      onMouseLeave={onCellHoverLeave}
      className={`px-1 py-0.5 text-center border-l transition-all duration-150 ${selectedDays.includes(dayIndex) ? 'bg-blue-50' : highlightColor || ''
        } ${editMode ? 'cursor-not-allowed' : 'cursor-pointer'} ${!editMode && !isSelectionMode ? 'hover:bg-gray-50' : ''
        } ${isDesktop && selectedDayIndex === dayIndex ? 'bg-blue-50' : ''} ${getSelectionClasses()}`}
      style={{
        height: `${calculatedHeight}px`,
        width: '140px',
        minWidth: '140px',
        maxWidth: '140px'
      }}
    >
      {hasContent ? (
        <div className={`text-xs relative overflow-hidden h-full flex flex-col ${category.id === 'note' && expandedNotes ? 'justify-center py-0.5' : 'justify-center'
          }`}>
          {/* RIGA SUPERIORE */}

          {/* Orario inizio + Reminder */}
          {hasStartTime && (
            <div className="absolute top-0 left-0 flex items-start gap-0.5">
              <span className="text-[9px] text-gray-400 leading-none">
                {cellData.startTime}
              </span>
              {hasReminder && (
                <Bell size={8} className="text-orange-400" />
              )}
            </div>
          )}

          {/* Pallino media */}
          {showMediaIndicator && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <div className="w-2 h-2 rounded-full bg-purple-400"
                title="Contiene media allegati" />
            </div>
          )}

          {/* Location + Booking */}
          {(hasLocation || (category.id !== 'base' && category.id !== 'note' && cellData?.bookingStatus && cellData.bookingStatus !== 'na')) && (
            <div className="absolute top-0 right-0 flex items-start justify-end gap-1">
              {hasLocation && (
                <MapPin size={10} className="text-red-500" />
              )}
              {category.id !== 'base' && category.id !== 'note' &&
                cellData?.bookingStatus && cellData.bookingStatus !== 'na' && (
                  <div className="h-[10px] flex items-start">
                    <div className={`w-2 h-2 rounded-full ${cellData.bookingStatus === 'yes' ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                  </div>
                )}
            </div>
          )}

          {/* RIGA INFERIORE */}

          {/* Trasporto + Orario fine */}
          {(((category.id === 'spostamenti1' || category.id === 'spostamenti2') &&
            cellData?.transportMode && cellData.transportMode !== 'none') || hasEndTime) && (
              <div className="absolute bottom-0 left-0 flex items-end gap-0.5">
                {(category.id === 'spostamenti1' || category.id === 'spostamenti2') &&
                  cellData?.transportMode && cellData.transportMode !== 'none' && (
                    <span className="ml-0.5 text-xs leading-none">
                      {TRANSPORT_OPTIONS.find(t => t.value === cellData.transportMode)?.emoji}
                    </span>
                  )}
                {hasEndTime && (
                  <span className="text-[9px] text-gray-400 leading-none">
                    {cellData.endTime}
                  </span>
                )}
              </div>
            )}

          {/* Costo */}
          {category.id !== 'base' && category.id !== 'note' && category.id !== 'otherExpenses' &&
            displayCost > 0 && (
              <div
                className={`absolute bottom-0 right-0.5 text-[9px] font-semibold leading-none transition-opacity duration-150 ${getCostColor(cellData, currentUserId, trip.sharing?.members)
                  } ${costVisible ? 'opacity-100' : 'opacity-0'}`}
              >
                {displayCost.toFixed(0)}€
              </div>
            )}

          {/* Costo Altre Spese */}
          {category.id === 'otherExpenses' && otherExpensesData && otherExpensesData.total > 0 && (
            <div
              className={`absolute bottom-[1px] right-0.5 text-[9px] font-semibold leading-none transition-opacity duration-150 text-gray-500 ${costVisible ? 'opacity-100' : 'opacity-0'
                }`}
            >
              {otherExpensesData.total.toFixed(0)}€
            </div>
          )}

          {/* CONTENUTO CENTRALE */}
          {category.id === 'otherExpenses' ? (
            expandedOtherExpenses ? (
              <div className="flex flex-col gap-0.5 px-2 py-1 h-full justify-center overflow-hidden">
                {otherExpensesData && otherExpensesData.count > 0 ? (
                  (() => {
                    const key = `${day.id}-otherExpenses`;
                    const expensesRaw = trip.data[key];
                    const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];

                    const realExpenses = expenses.filter((exp: any) => {
                      const hasExpContent = (exp.title && exp.title.trim() !== '') || (exp.cost && exp.cost.trim() !== '');
                      if (!hasExpContent) return false;

                      if (exp.costBreakdown && Array.isArray(exp.costBreakdown)) {
                        const hasActiveMembers = exp.costBreakdown.some(entry => {
                          const member = trip.sharing?.members?.[entry.userId];
                          return member && member.status === 'active';
                        });
                        return hasActiveMembers;
                      }

                      return true;
                    });

                    const maxVisible = 3;
                    const visibleExpenses = realExpenses.slice(0, maxVisible);
                    const remainingCount = realExpenses.length - maxVisible;

                    return (
                      <>
                        {visibleExpenses.map((exp: any, idx: number) => {
                          let expCost = 0;
                          if (exp.costBreakdown && Array.isArray(exp.costBreakdown)) {
                            expCost = exp.costBreakdown
                              .filter(entry => {
                                const member = trip.sharing?.members?.[entry.userId];
                                return member && member.status === 'active';
                              })
                              .reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
                          } else if (exp.cost) {
                            expCost = parseFloat(exp.cost) || 0;
                          }

                          return (
                            <div key={idx} className="flex justify-between items-center text-[10px] leading-tight">
                              <span className="truncate flex-1 text-left text-gray-700">
                                {exp.title || 'Spesa'}
                              </span>
                              {expCost > 0 && (
                                <span className="text-gray-600 font-medium ml-1 flex-shrink-0">
                                  {expCost.toFixed(0)}€
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {remainingCount > 0 && (
                          <div className="text-[9px] text-gray-400 text-center mt-0.5">
                            ...+{remainingCount} altre
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div className="text-gray-300 text-xl">+</div>
                )}
              </div>
            ) : (
              <div className="text-xs font-medium text-gray-700">
                ({otherExpensesData ? otherExpensesData.count : 0})
              </div>
            )
          ) : category.id === 'note' ? (
            <div
              className="text-[11px] text-gray-700 px-1 overflow-hidden w-full"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: expandedNotes ? '6' : '2',
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis',
                lineHeight: '1.1',
                wordBreak: 'break-word'
              }}
            >
              {cellData.notes}
            </div>
          ) : (
            <div
              className="text-[11px] font-medium px-1"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2',
                wordBreak: 'break-word'
              }}
            >
              {cellData.title}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-300 text-xl">+</div>
      )}
    </td>
  );
};

export default DayCell;