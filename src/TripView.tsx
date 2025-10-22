import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import CalendarView from './CalendarView';
import DayDetailView from './DayDetailView';

/**
 * Hook personalizzato per rilevare le dimensioni dello schermo
 * Restituisce true se la larghezza è >= 1024px (desktop)
 */
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Imposta valore iniziale
    setMatches(media.matches);
    
    // Listener per cambiamenti
    const listener = (e) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

/**
 * Componente principale che gestisce il layout dell'applicazione
 * - Mobile: mostra una vista alla volta (calendario O dettaglio)
 * - Desktop: split view con calendario (60%) + dettaglio (40%)
 */
const TripView = ({ trip, onUpdateTrip }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(null);
  const [scrollToDayId, setScrollToDayId] = useState(null);
  const [view, setView] = useState('calendar'); // 'calendar' | 'detail'
  
  // Rileva se siamo su desktop (>= 1024px)
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  /**
   * Gestisce l'apertura del dettaglio di un giorno
   * Su mobile cambia vista, su desktop solo aggiorna lo stato
   */
  const handleOpenDay = (dayIndex, currentScrollPosition = null, categoryId = null) => {
  setSelectedDayIndex(dayIndex);
  if (!isDesktop) {
    setScrollPosition(currentScrollPosition);
    setView('detail');
  }
  
  // Scroll alla categoria su desktop
  if (isDesktop && categoryId) {
    setTimeout(() => {
      const element = document.getElementById(`category-${categoryId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
};

  /**
   * Gestisce il ritorno al calendario da mobile
   */
  const handleBackToCalendar = () => {
    setView('calendar');
    if (selectedDayIndex !== null) {
      setScrollToDayId(trip.days[selectedDayIndex].id);
    }
  };

  /**
   * Callback quando lo scroll è completato
   */
  const handleScrollComplete = () => {
    setScrollToDayId(null);
    setScrollPosition(null);
  };

  /**
   * Gestisce il cambio di giorno dalla vista dettaglio
   */
  const handleChangeDayIndex = (newIndex) => {
    setSelectedDayIndex(newIndex);
    if (isDesktop) {
      // Su desktop, aggiorna anche lo scroll del calendario per centrare il nuovo giorno
      setScrollToDayId(trip.days[newIndex].id);
    }
  };

  // Reset selezione quando si passa da desktop a mobile
  useEffect(() => {
    if (!isDesktop && view === 'detail' && selectedDayIndex !== null) {
      // Mantieni la selezione quando passi a mobile
    } else if (isDesktop && view === 'detail') {
      // Torna automaticamente alla vista calendario su desktop
      setView('calendar');
    }
  }, [isDesktop]);

  // ========== RENDERING MOBILE ==========
  if (!isDesktop) {
    // Mostra solo una vista alla volta
    if (view === 'detail' && selectedDayIndex !== null) {
      return (
        <DayDetailView
          trip={trip}
          dayIndex={selectedDayIndex}
          onUpdateTrip={onUpdateTrip}
          onBack={handleBackToCalendar}
          onChangeDayIndex={handleChangeDayIndex}
          isDesktop={false}
        />
      );
    }

    return (
      <CalendarView
        trip={trip}
        onUpdateTrip={onUpdateTrip}
        onBack={() => window.location.href = '/'}
        onOpenDay={handleOpenDay}
        scrollToDayId={scrollToDayId}
        savedScrollPosition={scrollPosition}
        onScrollComplete={handleScrollComplete}
        isDesktop={false}
        selectedDayIndex={selectedDayIndex}
      />
    );
  }

// ========== RENDERING DESKTOP ==========
return (
  <div className="flex h-screen bg-gray-50">
    {/* Pannello Calendario - 60% larghezza */}
    <div className="w-[60%] border-r border-gray-300 overflow-hidden flex flex-col">
      <CalendarView
        trip={trip}
        onUpdateTrip={onUpdateTrip}
        onBack={() => window.location.href = '/'}
        onOpenDay={handleOpenDay}
        scrollToDayId={scrollToDayId}
        savedScrollPosition={null}
        onScrollComplete={handleScrollComplete}
        isDesktop={true}
        selectedDayIndex={selectedDayIndex}
      />
    </div>

    {/* Pannello Dettaglio Giorno - 40% larghezza */}
    <div className="w-[40%] overflow-y-auto flex flex-col bg-white">
      {selectedDayIndex !== null ? (
        <DayDetailView
          trip={trip}
          dayIndex={selectedDayIndex}
          onUpdateTrip={onUpdateTrip}
          onBack={null}
          onChangeDayIndex={handleChangeDayIndex}
          isDesktop={true}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center px-6">
            <Calendar size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-500">Seleziona un giorno</p>
            <p className="text-sm text-gray-400 mt-2">
              Clicca su una cella del calendario per visualizzare i dettagli
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default TripView;