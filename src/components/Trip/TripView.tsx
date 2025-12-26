import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import CalendarView from '../CalendarView';
import { ViewMode } from '../CalendarView/CalendarHeader';
import DayDetailView from '../DayDetail/DayDetailView';
import { TripCostsView } from '../TripCosts';
import { DayMapView } from '../MapView';
import { useBudgetSync } from '../../hooks/useBudgetSync';
import { useAnalytics } from '../../hooks/useAnalytics';
import { colors, glowShadows } from '../../styles/theme';
import { easings, durations } from '../../styles/animations';

// ============================================
// ALTROVE - TripView
// Mobile: Split view verticale con resize
// Desktop: Split orizzontale 60/40
// ============================================

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

// ============================================
// RESIZE HANDLE COMPONENT
// ============================================

interface ResizeHandleProps {
  onDrag: (deltaY: number) => void;
  onDragEnd: (velocity: number) => void;
  onTap: () => void;
  isDragging?: boolean;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onDrag, onDragEnd, onTap, isDragging: isParentDragging }) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const TAP_THRESHOLD = 8;

  // Velocity tracking per flick gesture stile iOS
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const VELOCITY_THRESHOLD = 0.4; // px/ms - soglia per considerare un flick

  // Usa requestAnimationFrame per throttle naturale
  const flushDrag = useCallback(() => {
    if (pendingDeltaRef.current !== 0) {
      onDrag(pendingDeltaRef.current);
      pendingDeltaRef.current = 0;
    }
    rafRef.current = null;
  }, [onDrag]);

  const scheduleDrag = useCallback((delta: number) => {
    pendingDeltaRef.current += delta;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushDrag);
    }
  }, [flushDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startYRef.current = e.touches[0].clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    
    // Calcola velocity (px/ms) per flick detection
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      // Smooth velocity con media mobile
      velocityRef.current = 0.7 * velocityRef.current + 0.3 * (deltaY / dt);
    }
    lastTimeRef.current = now;

    if (Math.abs(deltaY) > TAP_THRESHOLD) {
      hasDraggedRef.current = true;
    }

    startYRef.current = currentY;
    scheduleDrag(deltaY);
  }, [scheduleDrag]);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    document.body.style.overflow = '';
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';

    // Flush any pending drag
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (pendingDeltaRef.current !== 0) {
        onDrag(pendingDeltaRef.current);
        pendingDeltaRef.current = 0;
      }
    }

    if (!hasDraggedRef.current) {
      onTap();
    } else {
      onDragEnd(velocityRef.current);
    }
  }, [onDrag, onDragEnd, onTap]);

  // Mouse events for testing on desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = e.clientY - startYRef.current;
      
      // Calcola velocity
      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        velocityRef.current = 0.7 * velocityRef.current + 0.3 * (deltaY / dt);
      }
      lastTimeRef.current = now;

      if (Math.abs(deltaY) > TAP_THRESHOLD) {
        hasDraggedRef.current = true;
      }

      startYRef.current = e.clientY;
      scheduleDrag(deltaY);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        if (pendingDeltaRef.current !== 0) {
          onDrag(pendingDeltaRef.current);
          pendingDeltaRef.current = 0;
        }
      }

      if (!hasDraggedRef.current) {
        onTap();
      } else {
        onDragEnd(velocityRef.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag, onDragEnd, onTap, scheduleDrag]);

  useEffect(() => {
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={handleRef}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
      className="flex-shrink-0 h-6 flex items-center justify-center cursor-row-resize touch-none"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* Handle visuale con feedback durante drag */}
      <div
        className="rounded-full transition-all"
        style={{
          width: isParentDragging ? 48 : 36,
          height: 4,
          backgroundColor: isParentDragging ? colors.accent : colors.border,
          transition: `all ${durations.fast}ms ${easings.easeOut}`,
        }}
      />
    </div>
  );
};

// ============================================
// TRIP VIEW COMPONENT
// ============================================

interface TripViewProps {
  trip: any;
  onUpdateTrip: (updates: any) => void;
  onBackToHome: () => void;
  currentUser: any;
  initialDayIndex?: number;
  initialTab?: 'planning' | 'notes' | 'expenses';
}

const TripView: React.FC<TripViewProps> = ({
  trip,
  onUpdateTrip,
  onBackToHome,
  currentUser,
  initialDayIndex,
  initialTab
}) => {
  // State
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);
  const [scrollToDayId, setScrollToDayId] = useState<number | null>(null);
  const [highlightCategoryId, setHighlightCategoryId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showCostsView, setShowCostsView] = useState(false); // 🆕 Vista spese
  const [showMapView, setShowMapView] = useState(false); // Vista mappa
  
  // Mobile split view state (percentuale altezza calendario)
  const [calendarHeightPercent, setCalendarHeightPercent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false); // Fullscreen DayDetail
  const savedHeightRef = useRef<number>(50); // Salva altezza prima di espandere
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Stato per calcolare il limite minimo del DayDetail basato sulla vista calendario
  const [calendarViewMode, setCalendarViewMode] = useState<ViewMode>('card');
  const [maxActivities, setMaxActivities] = useState(1);

  // Altezza reale del calendario misurata (usata come riferimento per il limite massimo)
  const measuredCalendarHeightRef = useRef<number | null>(null);

  const analytics = useAnalytics();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Budget sync
  useBudgetSync(trip, onUpdateTrip);

  // Valida selectedDayIndex quando cambiano i giorni
  useEffect(() => {
    if (selectedDayIndex !== null && selectedDayIndex >= trip.days.length) {
      console.log('⚠️ selectedDayIndex invalido, reset a null');
      setSelectedDayIndex(null);
    }
  }, [trip.days.length, selectedDayIndex]);

  // Auto-seleziona giorno corrente (o primo giorno) su mobile
  // E auto-scroll al giorno corrente all'apertura del viaggio
  // Se viene passato initialDayIndex, usa quello
  useEffect(() => {
    if (trip.days.length === 0) return;

    // Se viene passato un indice iniziale specifico, usalo
    if (initialDayIndex !== undefined && initialDayIndex >= 0 && initialDayIndex < trip.days.length) {
      setSelectedDayIndex(initialDayIndex);
      setScrollToDayId(trip.days[initialDayIndex].id);
      return;
    }

    // Trova il giorno corrente nel viaggio
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayIndex = trip.days.findIndex((day: any) => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === today.getTime();
    });

    // Se il giorno corrente esiste nel viaggio
    if (todayIndex !== -1) {
      // Imposta scroll al giorno corrente
      setScrollToDayId(trip.days[todayIndex].id);
      // Su mobile, seleziona anche il giorno corrente
      if (!isDesktop && selectedDayIndex === null) {
        setSelectedDayIndex(todayIndex);
      }
    } else if (!isDesktop && selectedDayIndex === null) {
      // Fallback: seleziona primo giorno su mobile
      setSelectedDayIndex(0);
    }
  // Esegui solo al mount del viaggio
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, initialDayIndex]);

  // Track apertura calendario
  useEffect(() => {
    if (trip?.id) {
      analytics.trackCalendarViewOpened(trip.id, trip.days.length);
    }
  }, [trip?.id, trip?.days.length]);

  // Calcola altezza iniziale basata sull'altezza del CalendarView
  useEffect(() => {
    if (!isDesktop && calendarRef.current && containerRef.current && calendarHeightPercent === null) {
      const calendarHeight = calendarRef.current.offsetHeight;
      const containerHeight = containerRef.current.clientHeight;
      const percent = (calendarHeight / containerHeight) * 100;

      // Salva l'altezza misurata come riferimento per il limite massimo
      measuredCalendarHeightRef.current = calendarHeight;

      // Imposta l'altezza iniziale (limita tra 8% minimo e l'altezza misurata)
      setCalendarHeightPercent(Math.max(8, percent));
    }
  }, [isDesktop, calendarHeightPercent]);

  // === HANDLERS ===

  const handleOpenDay = (dayIndex: number, currentScrollPosition: number | null = null, categoryId: string | null = null) => {
    setSelectedDayIndex(dayIndex);
    setHighlightCategoryId(categoryId);

    if (isDesktop) {
      setShowDetailPanel(true);
    }
  };

  const handleScrollComplete = () => {
    setScrollToDayId(null);
    setScrollPosition(null);
  };

  const handleChangeDayIndex = (newIndex: number) => {
    setSelectedDayIndex(newIndex);
    setHighlightCategoryId(null);
    setScrollToDayId(trip.days[newIndex].id);
  };

  const handleClosePanel = () => {
    setShowDetailPanel(false);
  };

  // 🆕 Handler vista spese
  const handleOpenCosts = () => {
    setShowCostsView(true);
  };

  const handleCloseCosts = () => {
    setShowCostsView(false);
  };

  // Handler vista mappa
  const handleOpenMap = () => {
    setShowMapView(true);
  };

  const handleCloseMap = () => {
    setShowMapView(false);
  };

  // Handler per cambio vista calendario (card/table)
  // Quando cambia la vista, ricalcola l'altezza misurata del calendario
  const handleCalendarViewModeChange = useCallback((mode: ViewMode, activities: number) => {
    setCalendarViewMode(mode);
    setMaxActivities(activities);

    // Ricalcola l'altezza misurata dopo il cambio vista (con delay per permettere il render)
    setTimeout(() => {
      if (calendarRef.current && containerRef.current) {
        const newHeight = calendarRef.current.offsetHeight;
        measuredCalendarHeightRef.current = newHeight;
      }
    }, 50);
  }, []);

  const handleNavigateToDay = (dayIndex: number, categoryId?: string) => {
    setSelectedDayIndex(dayIndex);
    setScrollToDayId(trip.days[dayIndex].id);
    if (categoryId) {
      setHighlightCategoryId(categoryId);
    }
  };

  // Resize handler per mobile con effetto rubber band
  const handleResize = useCallback((deltaY: number) => {
    if (!containerRef.current) return;

    // Imposta isDragging al primo movimento
    setIsDragging(true);

    // Reset expanded state quando si trascina manualmente
    if (isDetailExpanded) {
      setIsDetailExpanded(false);
    }

    const containerHeight = containerRef.current.clientHeight;
    const deltaPercent = (deltaY / containerHeight) * 100;

    // Usa l'altezza misurata del calendario come limite massimo
    const measuredHeight = measuredCalendarHeightRef.current || containerHeight * 0.5;
    const maxPercent = (measuredHeight / containerHeight) * 100;

    setCalendarHeightPercent(prev => {
      const newPercent = prev + deltaPercent;

      // Limite minimo (8%) - rubber band effect
      if (newPercent < 8) {
        const overscroll = 8 - newPercent;
        // Resistenza: più vai oltre, più è difficile muoversi (fattore 0.3)
        return 8 - (overscroll * 0.3);
      }

      // Limite massimo - rubber band effect
      if (newPercent > maxPercent) {
        const overscroll = newPercent - maxPercent;
        // Resistenza: più vai oltre, più è difficile muoversi (fattore 0.3)
        return maxPercent + (overscroll * 0.3);
      }

      return newPercent;
    });
  }, [isDetailExpanded]);

  // Velocity threshold per flick gesture
  const VELOCITY_THRESHOLD = 0.5; // px/ms

  const handleResizeEnd = useCallback((velocity: number) => {
    setIsDragging(false);

    if (calendarHeightPercent === null || !containerRef.current) return;

    // Usa l'altezza misurata del calendario come limite massimo
    const containerHeight = containerRef.current.clientHeight;
    const measuredHeight = measuredCalendarHeightRef.current || containerHeight * 0.5;
    const maxPercent = (measuredHeight / containerHeight) * 100;

    // Solo flick molto veloci vanno agli estremi
    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      if (velocity > 0) {
        // Flick verso il basso → collassa DayDetail (calendario al massimo misurato)
        setCalendarHeightPercent(maxPercent);
        setIsDetailExpanded(false);
      } else {
        // Flick verso l'alto → espandi DayDetail (calendario 8%)
        setCalendarHeightPercent(8);
        setIsDetailExpanded(true);
      }
    } else {
      // Nessun flick: snap back ai limiti se siamo oltre (rubber band return)
      if (calendarHeightPercent < 8) {
        setCalendarHeightPercent(8);
        setIsDetailExpanded(true);
      } else if (calendarHeightPercent > maxPercent) {
        setCalendarHeightPercent(maxPercent);
        setIsDetailExpanded(false);
      } else {
        // Dentro i limiti: mantieni posizione corrente
        setIsDetailExpanded(calendarHeightPercent <= 10);
      }
    }

    // Salva posizione per ripristino dopo tap
    if (calendarHeightPercent > 10 && calendarHeightPercent <= maxPercent) {
      savedHeightRef.current = calendarHeightPercent;
    }
  }, [calendarHeightPercent]);

  // Toggle tra vista espansa (DayDetail fullscreen) e vista normale
  const handleHandleTap = useCallback(() => {
    if (isDetailExpanded) {
      // Torna alla vista normale - ripristina altezza salvata
      setCalendarHeightPercent(savedHeightRef.current);
      setIsDetailExpanded(false);
    } else {
      // Espandi DayDetail a fullscreen
      if (calendarHeightPercent !== null && calendarHeightPercent > 10) {
        savedHeightRef.current = calendarHeightPercent;
      }
      setCalendarHeightPercent(8);
      setIsDetailExpanded(true);
    }
  }, [isDetailExpanded, calendarHeightPercent]);

  // Altezza header fisso (px)
  const HEADER_HEIGHT = 56;

  // ========== RENDERING MOBILE ==========
  if (!isDesktop) {
    // Vista mappa fullscreen su mobile
    if (showMapView) {
      return (
        <DayMapView
          trip={trip}
          initialDayIndex={selectedDayIndex ?? 0}
          initialViewMode="trip"
          onBack={handleCloseMap}
          onNavigateToDay={handleNavigateToDay}
          isDesktop={false}
        />
      );
    }

    // 🆕 Vista spese fullscreen su mobile
    if (showCostsView) {
      return (
        <TripCostsView
          trip={trip}
          onBack={handleCloseCosts}
          isDesktop={false}
        />
      );
    }

    // Calcola altezza pannello DayDetail in base alla percentuale
    // 100% - calendarHeightPercent = % occupata da DayDetail
    // Minimo: header (56px), Massimo: tutto sotto l'header
    const detailHeightPercent = 100 - calendarHeightPercent;

    return (
      <div
        ref={containerRef}
        className="h-screen flex flex-col overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #FFE8E8 0%, #FFFFFF 45%, #FFFFFF 55%, #E0F7F6 100%)',
          overscrollBehavior: 'none', // Previene pull-to-refresh
          touchAction: 'pan-x pan-y', // Permette scroll ma non refresh
        }}
      >
        {/* Calendario FULL (sempre visibile sotto) */}
        <div ref={calendarRef} className="flex-shrink-0">
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
            onOpenCosts={handleOpenCosts}
            onMapClick={handleOpenMap}
            onViewModeChange={handleCalendarViewModeChange}
          />
        </div>

        {/* DayDetail OVERLAY - si sovrappone dal basso con leggero overlap */}
        {calendarHeightPercent !== null && (
          <div
            className="absolute left-0 right-0 bottom-0 flex flex-col"
            style={{
              top: `calc(${calendarHeightPercent}% - 4px)`,
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
              willChange: isDragging ? 'top' : 'auto',
              // Curva iOS-style: partenza veloce, rallentamento graduale
              transition: isDragging ? 'none' : `top ${durations.slow}ms ${easings.smooth}`,
            }}
          >
          {/* Resize Handle */}
          <ResizeHandle
            onDrag={handleResize}
            onDragEnd={handleResizeEnd}
            onTap={handleHandleTap}
            isDragging={isDragging}
          />

          {/* Detail Content */}
          <div
            className="flex-1 overflow-auto"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {selectedDayIndex !== null ? (
              <DayDetailView
                trip={trip}
                dayIndex={selectedDayIndex}
                onUpdateTrip={onUpdateTrip}
                onBack={null}
                onChangeDayIndex={handleChangeDayIndex}
                isDesktop={false}
                user={currentUser}
                highlightCategoryId={highlightCategoryId}
                initialTab={initialTab}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <Calendar size={48} className="mx-auto mb-3 opacity-20" style={{ color: colors.textMuted }} />
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    Seleziona un giorno dal calendario
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    );
  }

  // ========== RENDERING DESKTOP ==========

  // Vista mappa fullscreen su desktop
  if (showMapView) {
    return (
      <DayMapView
        trip={trip}
        initialDayIndex={selectedDayIndex ?? 0}
        initialViewMode="trip"
        onBack={handleCloseMap}
        onNavigateToDay={handleNavigateToDay}
        isDesktop={true}
      />
    );
  }

  // 🆕 Vista spese come pannello laterale su desktop
  if (showCostsView) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: colors.bgWarm }}>
        {/* Calendario */}
        <div
          className="w-[60%] border-r overflow-hidden"
          style={{ borderColor: colors.border }}
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
            selectedDayIndex={null}
            currentUser={currentUser}
            onOpenCosts={handleOpenCosts}
            onMapClick={handleOpenMap}
            onViewModeChange={handleCalendarViewModeChange}
          />
        </div>

        {/* Pannello Spese */}
        <div
          className="w-[40%] overflow-y-auto"
          style={{ backgroundColor: colors.bgCard }}
        >
          <TripCostsView
            trip={trip}
            onBack={handleCloseCosts}
            isDesktop={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: colors.bgWarm }}>
      {/* Calendario - si espande quando il pannello è chiuso */}
      <div
        className={`border-r overflow-hidden flex-col transition-all duration-300 ${
          showDetailPanel ? 'w-[60%]' : 'w-full'
        }`}
        style={{ borderColor: colors.border }}
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
          onOpenCosts={handleOpenCosts}
          onMapClick={handleOpenMap}
          onViewModeChange={handleCalendarViewModeChange}
        />
      </div>

      {/* Pannello dettaglio - visibile solo se showDetailPanel è true */}
      {showDetailPanel && (
        <div
          className="w-[40%] overflow-y-auto flex flex-col"
          style={{ backgroundColor: colors.bgCard }}
        >
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
              initialTab={initialTab}
            />
          ) : (
            <div
              className="h-full flex items-center justify-center"
              style={{ backgroundColor: colors.bgSubtle }}
            >
              <div className="text-center px-6">
                <Calendar size={64} className="mx-auto mb-4 opacity-20" style={{ color: colors.textMuted }} />
                <p className="text-lg font-medium" style={{ color: colors.textMuted }}>
                  Seleziona un giorno
                </p>
                <p className="text-sm mt-2" style={{ color: colors.textPlaceholder }}>
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