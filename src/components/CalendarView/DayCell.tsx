import React from 'react';
import { TRANSPORT_OPTIONS } from '../../utils/constants';

/**
 * 🔧 FIX: Helper per determinare il colore del costo basato su UTENTI UNICI ATTIVI
 * 🔵 BLU    → Pagato interamente da ME (1 utente attivo = io, anche più contributi)
 * 🟠 ARANCIO → Spesa condivisa (2+ utenti attivi diversi)
 * ⚪ GRIGIO  → Pagato interamente da ALTRI attivi (1 utente attivo ≠ io)
 */
const getCostColor = (cellData, currentUserId, tripMembers) => {
  if (!cellData.costBreakdown || cellData.costBreakdown.length === 0 || !tripMembers) {
    return 'text-gray-400'; // Default
  }

  // 🔧 FIX: Filtra solo membri ATTIVI nel breakdown
  const activeBreakdown = cellData.costBreakdown.filter(entry => {
    const member = tripMembers[entry.userId];
    return member && member.status === 'active';
  });

  // Se non ci sono membri attivi che hanno pagato
  if (activeBreakdown.length === 0) {
    return 'text-gray-400';
  }

  // 🔧 Conta utenti UNICI ATTIVI che hanno pagato
  const uniquePayers = new Set(activeBreakdown.map(e => e.userId));
  const uniquePayersCount = uniquePayers.size;

  // Condivisa (2+ utenti attivi diversi)
  if (uniquePayersCount > 1) {
    return 'text-orange-400';
  }

  // Singola (1 utente attivo solo, anche con più contributi)
  const singlePayer = activeBreakdown[0].userId;
  
  if (singlePayer === currentUserId) {
    return 'text-blue-500'; // 🔵 Pagato da ME
  } else {
    return 'text-gray-400'; // ⚪ Pagato da ALTRI
  }
};

/**
 * 📸 Helper per verificare se una cella ha media allegati
 */
const hasMediaAttachments = (cellData) => {
  if (!cellData) return false;
  
  const hasLinks = cellData.links && cellData.links.length > 0;
  const hasImages = cellData.images && cellData.images.length > 0;
  const hasVideos = cellData.videos && cellData.videos.length > 0;
  const hasMediaNotes = cellData.mediaNotes && cellData.mediaNotes.length > 0;
  
  return hasLinks || hasImages || hasVideos || hasMediaNotes;
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
  currentUserId: string;
  trip: any;
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
  currentUserId,
  trip,
  onCellClick,
  onCellHoverEnter,
  onCellHoverLeave
}) => {
  // 💸 Se è la riga "Altre Spese", calcola il totale (solo membri attivi)
  let otherExpensesData = null;
  if (category.id === 'otherExpenses') {
    const key = `${day.id}-otherExpenses`;
    const expensesRaw = trip.data[key];
    
    // Assicurati che sia un array
    const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];
    
    // Conta solo spese con contenuto (titolo o costo) e breakdown attivo
    const realExpenses = expenses.filter((exp: any) => {
      const hasContent = (exp.title && exp.title.trim() !== '') || (exp.cost && exp.cost.trim() !== '');
      if (!hasContent) return false;
      
      // Se ha breakdown, verifica che ci siano membri attivi
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
    
    // Calcola totale solo da breakdown di membri attivi
    const total = realExpenses.reduce((sum: number, exp: any) => {
      if (!exp.costBreakdown || !Array.isArray(exp.costBreakdown)) {
        return sum + (exp.cost ? parseFloat(exp.cost) : 0);
      }
      
      // Somma solo contributi di membri attivi
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

  // 📸 Verifica se la cella ha media (solo per categorie rilevanti)
  const showMediaIndicator = expandedNotes && 
    category.id !== 'base' && 
    category.id !== 'note' && 
    category.id !== 'otherExpenses' &&
    hasMediaAttachments(cellData);

  return (
    <td
      key={`${day.id}-${category.id}`}
      onClick={() => onCellClick(dayIndex, category.id)}
      onMouseEnter={() => onCellHoverEnter(cellKey)}
      onMouseLeave={onCellHoverLeave}
      className={`px-1 py-0.5 text-center border-l ${
        selectedDays.includes(dayIndex) ? 'bg-blue-50' : highlightColor || ''
      } ${editMode ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${
        isDesktop && selectedDayIndex === dayIndex ? 'bg-blue-50' : ''}
      `}
      style={{ 
        height: category.id === 'note' ? (expandedNotes ? '80px' : '48px') : 
                category.id === 'otherExpenses' ? (expandedOtherExpenses ? '80px' : '48px') : 
                '48px', 
        width: '140px', 
        minWidth: '140px', 
        maxWidth: '140px' 
      }}
    >
      {hasContent ? (
        <div className={`text-xs relative overflow-hidden h-full flex flex-col ${
          category.id === 'note' && expandedNotes ? 'justify-start py-1' : 'justify-center'
        }`}>
          {/* 📸 Pallino MEDIA in ALTO a SINISTRA - visibile solo con toggle Note attivo */}
          {showMediaIndicator && (
            <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-purple-400" 
                 title="Contiene media allegati" />
          )}

          {/* Emoji trasporto in BASSO a SINISTRA */}
          {(category.id === 'spostamenti1' || category.id === 'spostamenti2') && 
           cellData.transportMode && cellData.transportMode !== 'none' && (
            <div className="absolute bottom-0.5 left-0.5 text-sm">
              {TRANSPORT_OPTIONS.find(t => t.value === cellData.transportMode)?.emoji}
            </div>
          )}
          
          {/* Pallino booking in ALTO a DESTRA */}
          {category.id !== 'base' && category.id !== 'note' && 
           cellData.bookingStatus && cellData.bookingStatus !== 'na' && (
            <div className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${
              cellData.bookingStatus === 'yes' ? 'bg-green-500' : 'bg-orange-500'
            }`} />
          )}
          
          {/* 💰 COSTO in BASSO a DESTRA - visibile solo durante scroll/hover */}
          {category.id !== 'base' && category.id !== 'note' && category.id !== 'otherExpenses' &&
           displayCost > 0 && (
            <div 
              className={`absolute bottom-[1px] right-0.5 text-[9px] font-semibold leading-none transition-opacity duration-150 ${
                getCostColor(cellData, currentUserId, trip.sharing?.members)
              } ${costVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              {displayCost.toFixed(0)}€
            </div>
          )}
          
          {/* 💸 COSTO ALTRE SPESE in BASSO a DESTRA (grigio, solo con toggle) */}
          {category.id === 'otherExpenses' && otherExpensesData.total > 0 && (
            <div 
              className={`absolute bottom-[1px] right-0.5 text-[9px] font-semibold leading-none transition-opacity duration-150 text-gray-500 ${
                costVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {otherExpensesData.total.toFixed(0)}€
            </div>
          )}
          
          {/* 💸 ALTRE SPESE: numero compresso, lista espansa */}
          {category.id === 'otherExpenses' ? (
            expandedOtherExpenses ? (
              // Vista ESPANSA: Lista titolo + costo
              <div className="flex flex-col gap-0.5 px-2 py-1 h-full justify-center overflow-hidden">
                {otherExpensesData.count > 0 ? (
                  (() => {
                    const key = `${day.id}-otherExpenses`;
                    const expensesRaw = trip.data[key];
                    const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];
                    
                    // Filtra spese con contenuto e membri attivi
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
                    
                    const maxVisible = 3;
                    const visibleExpenses = realExpenses.slice(0, maxVisible);
                    const remainingCount = realExpenses.length - maxVisible;
                    
                    return (
                      <>
                        {visibleExpenses.map((exp: any, idx: number) => {
                          // Calcola costo da membri attivi
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
              // Vista COMPRESSA: Solo numero
              <div className="text-xs font-medium text-gray-700">
                {otherExpensesData.count}
              </div>
            )
          ) : category.id === 'note' ? (
            <div className="text-[11px] text-gray-700 px-0.5 overflow-hidden" style={{ 
              display: '-webkit-box',
              WebkitLineClamp: expandedNotes ? '5' : '2',
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis',
              lineHeight: expandedNotes ? '1.0' : '1.2'
            }}>
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