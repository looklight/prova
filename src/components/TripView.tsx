import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import CalendarView from './CalendarView';
import DayDetailView from './DayDetail/DayDetailView';
import { UserPlus } from 'lucide-react';
import { useBudgetSync } from '../hooks/useBudgetSync';
import { useAnalytics } from '../hooks/useAnalytics';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

const TripView = ({ trip, onUpdateTrip, onBackToHome, currentUser }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(null);
  const [scrollToDayId, setScrollToDayId] = useState(null);
  const [view, setView] = useState('calendar');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [highlightCategoryId, setHighlightCategoryId] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(true); // 🆕 Stato per toggle pannello desktop
  const analytics = useAnalytics();

  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 💰 Sincronizzazione automatica budget
  useBudgetSync(trip, onUpdateTrip);

  // 🆕 Valida selectedDayIndex quando cambiano i giorni
  useEffect(() => {
    if (selectedDayIndex !== null && selectedDayIndex >= trip.days.length) {
      console.log('⚠️ selectedDayIndex invalido, reset a null');
      setSelectedDayIndex(null);
    }
  }, [trip.days.length, selectedDayIndex]);

  /**
   * ✅ MODIFICATO: Riceve anche categoryId per highlight + riapre pannello su desktop
   */
  const handleOpenDay = (dayIndex, currentScrollPosition = null, categoryId = null) => {
    setSelectedDayIndex(dayIndex);
    setHighlightCategoryId(categoryId);

    // 🆕 Su desktop, riapri il pannello se era chiuso
    if (isDesktop) {
      setShowDetailPanel(true);
    }

    if (!isDesktop) {
      setScrollPosition(currentScrollPosition);
      setView('detail');
    }
  };

  const handleBackToCalendar = () => {
    setView('calendar');
    setHighlightCategoryId(null);
    if (selectedDayIndex !== null) {
      setScrollToDayId(trip.days[selectedDayIndex].id);
    }
  };

  const handleScrollComplete = () => {
    setScrollToDayId(null);
    setScrollPosition(null);
  };

  const handleChangeDayIndex = (newIndex) => {
    setSelectedDayIndex(newIndex);
    setHighlightCategoryId(null);
    if (isDesktop) {
      setScrollToDayId(trip.days[newIndex].id);
    }
  };

  // 🆕 Handler per chiudere il pannello desktop
  const handleClosePanel = () => {
    setShowDetailPanel(false);
  };

  useEffect(() => {
    if (!isDesktop && view === 'detail' && selectedDayIndex !== null) {
      // Mantieni la selezione quando passi a mobile
    } else if (isDesktop && view === 'detail') {
      setView('calendar');
    }
  }, [isDesktop]);

  // 📊 Track apertura calendario
  useEffect(() => {
    if (view === 'calendar' && trip?.id) {
      analytics.trackCalendarViewOpened(trip.id, trip.days.length);
    }
  }, [view, trip?.id, trip?.days.length]);

  // ========== RENDERING MOBILE ==========
  if (!isDesktop) {
    if (view === 'detail' && selectedDayIndex !== null) {
      return (
        <>
          <DayDetailView
            trip={trip}
            dayIndex={selectedDayIndex}
            onUpdateTrip={onUpdateTrip}
            onBack={handleBackToCalendar}
            onChangeDayIndex={handleChangeDayIndex}
            isDesktop={false}
            user={currentUser}
            highlightCategoryId={highlightCategoryId}
          />
        </>
      );
    }

    return (
      <>
        <CalendarView
          trip={trip}
          onUpdateTrip={onUpdateTrip}
          onBack={onBackToHome}
          onOpenDay={handleOpenDay}
          scrollToDayId={scrollToDayId}
          savedScrollPosition={scrollPosition}
          onScrollComplete={handleScrollComplete}
          isDesktop={false}
          selectedDayIndex={selectedDayIndex}
          currentUser={currentUser}
          onInviteClick={() => setShowInviteModal(true)}
        />
      </>
    );
  }

  // ========== RENDERING DESKTOP ==========
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Calendario - si espande quando il pannello è chiuso */}
      <div
        className={`border-r border-gray-300 overflow-hidden flex-col transition-all duration-300 ${showDetailPanel ? 'w-[60%]' : 'w-full'
          }`}
      >
        <CalendarView
          trip={trip}
          onUpdateTrip={onUpdateTrip}
          onBack={onBackToHome}
          onOpenDay={handleOpenDay}
          scrollToDayId={scrollToDayId}
          savedScrollPosition={null}
          onScrollComplete={handleScrollComplete}
          isDesktop={true}
          selectedDayIndex={showDetailPanel ? selectedDayIndex : null}
          currentUser={currentUser}
          onInviteClick={() => setShowInviteModal(true)}
        />
      </div>

      {/* Pannello dettaglio - visibile solo se showDetailPanel è true */}
      {showDetailPanel && (
        <div className="w-[40%] overflow-y-auto flex flex-col bg-white">
          {selectedDayIndex !== null ? (
            <DayDetailView
              trip={trip}
              dayIndex={selectedDayIndex}
              onUpdateTrip={onUpdateTrip}
              onBack={null}
              onChangeDayIndex={handleChangeDayIndex}
              isDesktop={true}
              user={currentUser}
              highlightCategoryId={highlightCategoryId}
              onClosePanel={handleClosePanel}
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
      )}
    </div>
  );
};

export default TripView;