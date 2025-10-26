import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { CATEGORIES, TRANSPORT_OPTIONS } from '../constants.js';
import { calculateDayCost } from '../costsUtils.js';
import TripMetadataModal from './TripMetadataModal.js';

/**
 * Componente principale per la visualizzazione calendario del viaggio
 * Mostra una tabella con giorni come colonne e categorie come righe
 */
const CalendarView = ({ trip, onUpdateTrip, onBack, onOpenDay, scrollToDayId, savedScrollPosition, onScrollComplete, isDesktop = false, selectedDayIndex = null, currentUser }) => {
  const [isEditingTripName, setIsEditingTripName] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [moveAfterIndex, setMoveAfterIndex] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [justMounted, setJustMounted] = useState(true);
  // 🆕 Stato per modal metadata
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const scrollContainerRef = useRef(null);

  /**
   * Verifica se una data corrisponde a oggi
   */
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  /**
   * Gestisce lo scroll automatico al mount o quando cambia scrollToDayId
   * - Ripristina posizione salvata
   * - Oppure centra il giorno target nel viewport
   */
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const timer = setTimeout(() => {
      // Ripristina posizione salvata
      if (savedScrollPosition !== null) { 
        const targetScrolled = savedScrollPosition > 10;
        setIsScrolled(targetScrolled);
        scrollContainerRef.current.scrollLeft = savedScrollPosition;
        if (onScrollComplete) onScrollComplete();
        
        setTimeout(() => setJustMounted(false), 500);
        return;
      }

      // Scroll automatico al giorno target
      if (scrollToDayId) {  
        const dayIndex = trip.days.findIndex(d => d.id === scrollToDayId);
        if (dayIndex !== -1) {
          const headerElement = document.querySelector(`th[data-day-id="${scrollToDayId}"]`);
          if (headerElement && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const containerWidth = container.clientWidth;
            const categoryColumnWidth = 120;
            const dayColumnLeft = headerElement.offsetLeft;
            const dayColumnWidth = 140;
            const availableWidth = containerWidth - categoryColumnWidth;

             // Calcola scroll per centrare il giorno
            const targetScroll = dayColumnLeft - categoryColumnWidth - (availableWidth / 2) + (dayColumnWidth / 2);
            const finalScroll = Math.max(0, targetScroll);
            
            setIsScrolled(finalScroll > 10);
            container.scrollLeft = finalScroll;
          }
        }
        if (onScrollComplete) onScrollComplete();
        
        setTimeout(() => setJustMounted(false), 500);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [scrollToDayId, savedScrollPosition, trip.days, onScrollComplete]);

  /**
   * Recupera i dati di una cella specifica
   */
  const getCellData = (dayId, categoryId) => {
    return trip.data[`${dayId}-${categoryId}`] || null;
  };

  /**
   * Assegna un colore di sfondo per contenuti ripetuti
   * Funziona solo per categorie 'base' e 'pernottamento'
   * Usa hash del contenuto per consistenza
   */
  const getColorForContent = (categoryId, content) => {
    if (categoryId !== 'base' && categoryId !== 'pernottamento') return null;
    if (!content) return null;
    
    // Conta occorrenze del contenuto
    const occurrences = trip.days.filter(day => {
      const cellData = getCellData(day.id, categoryId);
      return cellData?.title === content;
    }).length;
    
    if (occurrences < 2) return null;
    
    // Palette colori diverse per categoria
    const baseColors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-indigo-50', 'bg-teal-50'];
    const pernottamentoColors = ['bg-yellow-50', 'bg-pink-50', 'bg-orange-50', 'bg-cyan-50', 'bg-lime-50'];
    const colors = categoryId === 'base' ? baseColors : pernottamentoColors;
    
    // Hash del contenuto per assegnare colore consistente
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = content.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  /**
   * Aggiunge un nuovo giorno alla fine del viaggio
   */
  const addDay = () => {
    const lastDay = trip.days[trip.days.length - 1];
    const nextDate = new Date(lastDay.date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    onUpdateTrip({
      days: [...trip.days, {
        id: Date.now(),
        date: nextDate,
        number: trip.days.length + 1
      }]
    });
  };

  /**
   * Rimuove i giorni selezionati
   * Se si rimuovono tutti i giorni, crea un nuovo giorno di default
   */
  const removeSelectedDays = () => {
    if (selectedDays.length === 0) return;
    
    // Se si rimuovono tutti i giorni, crea un nuovo giorno
    if (selectedDays.length === trip.days.length) {
      const newDay = { id: Date.now(), date: new Date(), number: 1 };
      onUpdateTrip({ days: [newDay], data: {} });
      setSelectedDays([]);
      return;
    }
    
    // Filtra e rinumera i giorni rimanenti
    const updatedDays = trip.days
      .filter((_, index) => !selectedDays.includes(index))
      .map((day, index) => ({ ...day, number: index + 1 }));
    
    onUpdateTrip({ days: updatedDays });
    setSelectedDays([]);
  };

  /**
   * Gestisce il click su una cella
   * In modalità normale apre la vista dettaglio del giorno
   */
  const handleCellClick = (dayIndex, category) => {
  if (!editMode) {
    const currentScrollPosition = scrollContainerRef.current?.scrollLeft || 0;
    onOpenDay(dayIndex, currentScrollPosition, category.id); // Passa anche l'ID della categoria
    
    if (!isDesktop) {
      // Scroll automatico alla categoria nella vista dettaglio (mobile)
      setTimeout(() => {
        const element = document.getElementById(`category-${category.id}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      // Scroll automatico alla categoria nella vista dettaglio (desktop)
      setTimeout(() => {
        const element = document.getElementById(`category-${category.id}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }
};
  /**
   * Aggiorna la data di un giorno e propaga il cambiamento ai giorni successivi
   */
  const updateDayDate = (dayIndex, newDate) => {
    const updatedDays = [...trip.days];
    updatedDays[dayIndex].date = new Date(newDate);
    
    // Propaga il cambiamento ai giorni successivi
    for (let i = dayIndex + 1; i < updatedDays.length; i++) {
      const prevDate = new Date(updatedDays[i - 1].date);
      prevDate.setDate(prevDate.getDate() + 1);
      updatedDays[i].date = prevDate;
    }
    
    onUpdateTrip({ days: updatedDays });
  };

  /**
   * Toggle selezione di un giorno (per operazioni bulk)
   */
  const toggleDaySelection = (index) => {
    setSelectedDays(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  /**
   * Sposta i giorni selezionati dopo un giorno target
   * Ricalcola numeri e date consecutive
   */
  const moveDaysAfter = () => {
    if (selectedDays.length === 0 || moveAfterIndex === null) return;
    
    const updatedDays = [...trip.days];
    const selectedDayObjects = selectedDays.map(i => updatedDays[i]);
    const remainingDays = updatedDays.filter((_, i) => !selectedDays.includes(i));
    
    // Calcola indice di inserimento corretto
    let insertIndex = moveAfterIndex + 1;
    for (let i = 0; i < selectedDays.length; i++) {
      if (selectedDays[i] < moveAfterIndex) insertIndex--;
    }
    
    // Inserisce i giorni selezionati nella nuova posizione
    remainingDays.splice(insertIndex, 0, ...selectedDayObjects);
    remainingDays.forEach((day, index) => { day.number = index + 1; });
    
    // Ricalcola tutte le date in sequenza
    const startDate = new Date(remainingDays[0].date);
    remainingDays.forEach((day, index) => {
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + index);
      day.date = newDate;
    });
    
    onUpdateTrip({ days: remainingDays });
    setSelectedDays([]);
    setMoveAfterIndex(null);
  };

  /**
   * 🆕 Handler per salvare metadata dal modal
   */
  const handleSaveMetadata = (metadata) => {
    onUpdateTrip({ 
      metadata,
      // Retrocompatibilità
      name: metadata.name,
      image: metadata.image
    });
  };

  /**
   * Converte classi Tailwind in valori hex per stili inline
   */
  const getCategoryBgColor = (color) => {
    const colorMap = {
      'bg-gray-100': '#f3f4f6',
      'bg-blue-100': '#dbeafe',
      'bg-green-100': '#dcfce7',
      'bg-yellow-100': '#fef9c3',
      'bg-orange-100': '#ffedd5',
      'bg-purple-100': '#f3e8ff'
    };
    return colorMap[color] || '#f3f4f6';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-4" style={{ 
      maxWidth: isDesktop ? '100%' : '430px',
      margin: '0 auto',
      height: isDesktop ? '100%' : 'auto'
       }}>
      {/* 🆕 Modal per modifica metadata viaggio */}
      <TripMetadataModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        onSave={handleSaveMetadata}
        initialData={trip.metadata}
        currentUser={currentUser}
        mode="edit"
      />

      <div className="bg-white px-2 py-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between mb-2">
          {onBack && (<button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full ml-2 mr-1">
            <ChevronLeft size={24} />
          </button>
          )}
          
          {/* 🆕 Header cliccabile per aprire modal metadata */}
          <div 
            className="flex items-center gap-2 flex-1 min-w-0 ml-0 mr-2 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -m-2 transition-colors"
            onClick={() => setShowMetadataModal(true)}
          >
            <div className="flex-shrink-0">
              {trip.image || trip.metadata?.image ? (
                <img 
                  src={trip.image || trip.metadata?.image} 
                  alt="Trip" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {(trip.name || trip.metadata?.name || 'N')[0].toUpperCase()}
                </div>
              )}
            </div>
            
            <h1 className="text-xl font-bold flex-1 min-w-0 truncate">
              {trip.metadata?.name || trip.name}
            </h1>
          </div>
          
          <button
            onClick={() => {
              setEditMode(!editMode);
              setSelectedDays([]);
              setMoveAfterIndex(null);
            }}
            className={`rounded-full flex items-center gap-1 font-semibold transition-all shadow-sm flex-shrink-0 ${
              editMode 
                ? 'bg-green-100 text-green-600 hover:bg-green-200 px-2 py-2 mr-2' 
                : 'bg-gray-200 hover:bg-green-200 text-gray-700 hover:text-green-900 p-2 mr-4'
            }`}
          >
            {editMode ? (
              <>
                <Check size={20} />
                <span>Fine</span>
              </>
            ) : (
              <Edit2 size={20} />
            )}
          </button>
        </div>

        {editMode && (
          <div className="space-y-2 mt-3">
            <div className="flex gap-2">
              <button 
                onClick={removeSelectedDays} 
                disabled={selectedDays.length === 0}
                className={`flex-1 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-1 transition-all ${
                  selectedDays.length > 0 
                    ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 active:scale-95' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Trash2 size={16} /> Rimuovi {selectedDays.length > 0 && `(${selectedDays.length})`}
              </button>
              <button 
                onClick={addDay} 
                className="flex-1 py-2 bg-green-500 text-white rounded-full text-sm font-medium flex items-center justify-center gap-1 hover:bg-green-600 active:bg-green-700 active:scale-95 transition-all"
              >
                <Plus size={16} /> Giorno ({trip.days.length})
              </button>
            </div>
            
            {selectedDays.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium mb-2">{selectedDays.length} giorni selezionati</div>
                <select
                  value={moveAfterIndex ?? ''}
                  onChange={(e) => setMoveAfterIndex(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                >
                  <option value="">Sposta dopo il giorno...</option>
                  {trip.days.map((day, index) => (
                    <option key={day.id} value={index}>Giorno {day.number}</option>
                  ))}
                </select>
                <button
                  onClick={moveDaysAfter}
                  disabled={moveAfterIndex === null}
                  className="w-full py-2 bg-blue-500 text-white rounded-full text-sm font-medium disabled:bg-gray-300"
                >
                  Sposta
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto px-2 mt-4" 
        onScroll={(e) => setIsScrolled(e.target.scrollLeft > 10)}
      >
        <table className="w-full border-collapse bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100">
              <th 
                className={`p-2 text-left font-medium sticky left-0 z-10 text-xs ${
                  isScrolled ? 'bg-transparent' : 'bg-gray-100'
                }`}
                style={{ 
                  width: isScrolled ? '60px' : '120px', 
                  minWidth: isScrolled ? '60px' : '120px', 
                  maxWidth: isScrolled ? '60px' : '120px',
                  transition: justMounted ? 'none' : 'all 0.3s'
                }}
              >
                {!isScrolled && 'Categoria'}
              </th>
              {trip.days.map((day, index) => (
                <th 
                  key={day.id}
                  data-day-id={day.id}
                  className={`p-2 text-center font-medium relative text-xs ${
                    selectedDays.includes(index) ? 'bg-blue-100' : ''
                  } ${isToday(day.date) ? 'ring-2 ring-blue-400 ring-inset' : ''} ${
                    isDesktop && selectedDayIndex === index ? 'bg-blue-200 ring-2 ring-blue-500' : ''}
                  `}
                  style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }}
                >
                  {editMode && (
                    <div className="absolute top-1 left-1">
                      <div 
                        onClick={() => toggleDaySelection(index)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                          selectedDays.includes(index) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {selectedDays.includes(index) && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  )}
                  <div className="font-bold text-sm">Giorno {day.number}</div>
                  {editMode ? (
                    <input
                      type="date"
                      value={day.date.toISOString().split('T')[0]}
                      onChange={(e) => updateDayDate(index, e.target.value)}
                      className="text-xs mt-1 px-1 py-0.5 border rounded text-center"
                      style={{ fontSize: '10px' }}
                    />
                  ) : (
                    <div className="text-xs text-gray-600">
                      {day.date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((category) => (
              <tr key={category.id} className="border-t" style={{ height: category.id === 'note' ? '80px' : '48px' }}>
                <td 
                  className={`p-1 font-medium sticky left-0 z-10 ${
                    isScrolled ? 'bg-transparent' : 'bg-white'
                  }`}
                  style={{ 
                    width: isScrolled ? '60px' : '120px', 
                    minWidth: isScrolled ? '60px' : '120px', 
                    maxWidth: isScrolled ? '60px' : '120px', 
                    height: category.id === 'note' ? '80px' : '48px',
                    transition: justMounted ? 'none' : 'all 0.3s'
                  }}
                >
                  <div 
                    className="flex items-center justify-center relative overflow-hidden transition-all duration-300"
                    style={{ 
                      height: '36px', 
                      width: '100%',
                      borderRadius: '9999px',
                      backgroundColor: getCategoryBgColor(category.color)
                    }}
                  >
                    <span className={`transition-all duration-300ms ease-in-out absolute ${isScrolled ? 'opacity-0 scale-50' : 'opacity-100 scale-100'} text-xs whitespace-nowrap px-2`}>
                      {category.label}
                    </span>
                    <span className={`transition-all duration-300ms ease-in-out absolute ${isScrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} style={{ fontSize: '22px', lineHeight: '22px' }}>
                      {category.emoji}
                    </span>
                  </div>
                </td>
                {trip.days.map((day, dayIndex) => {
                  const cellData = getCellData(day.id, category.id);
                  const highlightColor = cellData?.title ? getColorForContent(category.id, cellData.title) : null;
                  const hasContent = cellData && (cellData.title || cellData.cost || cellData.notes);
                  
                  return (
                    <td
                      key={`${day.id}-${category.id}`}
                      onClick={() => handleCellClick(dayIndex, category)}
                      className={`p-1 text-center border-l ${
                        selectedDays.includes(dayIndex) ? 'bg-blue-50' : highlightColor || ''
                      } ${editMode ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${
                        isDesktop && selectedDayIndex === dayIndex ? 'bg-blue-50' : ''}
                      `}
                      style={{ height: category.id === 'note' ? '80px' : '48px', width: '140px', minWidth: '140px', maxWidth: '140px' }}
                    >
                      {hasContent ? (
                        <div className="text-xs relative overflow-hidden h-full flex flex-col justify-center">
                          {(category.id === 'spostamenti1' || category.id === 'spostamenti2') && cellData.transportMode && cellData.transportMode !== 'none' && (
                            <div className="absolute top-0.5 left-0.5 text-sm">
                              {TRANSPORT_OPTIONS.find(t => t.value === cellData.transportMode)?.emoji}
                            </div>
                          )}
                          {category.id !== 'base' && category.id !== 'note' && cellData.bookingStatus && cellData.bookingStatus !== 'na' && (
                            <div className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${
                              cellData.bookingStatus === 'yes' ? 'bg-green-500' : 'bg-orange-500'
                            }`} />
                          )}
                          {category.id === 'note' ? (
                            <div className="text-xs text-gray-700 px-2 py-1 overflow-hidden" style={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: '4',
                              WebkitBoxOrient: 'vertical',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.3'
                            }}>
                              {cellData.notes}
                            </div>
                          ) : (
                            <div 
                              className="font-medium px-1" 
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
                })}
              </tr>
            ))}
            <tr className="border-t-2 bg-gray-50 font-bold" style={{ height: '48px' }}>
              <td 
                className={`p-1 sticky left-0 z-10 ${
                  isScrolled ? 'bg-transparent' : 'bg-gray-50'
                }`}
                style={{ 
                  width: isScrolled ? '60px' : '120px', 
                  minWidth: isScrolled ? '60px' : '120px', 
                  maxWidth: isScrolled ? '60px' : '120px', 
                  height: '48px',
                  transition: justMounted ? 'none' : 'all 0.3s'
                }}
              >
                <div 
                  className="flex items-center justify-center relative overflow-hidden transition-all duration-300"
                  style={{ 
                    height: '36px', 
                    width: '100%',
                    borderRadius: '9999px',
                    backgroundColor: '#fee2e2'
                  }}
                >
                  <span className={`transition-all duration-300 absolute ${isScrolled ? 'opacity-0 scale-50' : 'opacity-100 scale-100'} text-xs px-2`}>
                    Costi
                  </span>
                  <span className={`transition-all duration-300 absolute ${isScrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} style={{ fontSize: '22px', lineHeight: '22px' }}>
                    💰
                  </span>
                </div>
              </td>
              {trip.days.map((day) => (
                <td key={`cost-${day.id}`} className={`p-1 text-center border-l text-sm ${
                  selectedDays.includes(trip.days.indexOf(day)) ? 'bg-blue-50' : ''
                }`} style={{ height: '48px', width: '140px', minWidth: '140px', maxWidth: '140px' }}>
                  {calculateDayCost(day, trip.data).toFixed(2)}€
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CalendarView;