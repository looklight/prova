/**
 * 📜 useCalendarScroll
 * 
 * @description Hook per gestione scroll automatico del calendario
 * @usage Usato da: CalendarView
 * 
 * Funzionalità:
 * - Ripristina posizione scroll salvata quando si torna al calendario
 * - Centra automaticamente il giorno target nel viewport
 * - Gestisce stato isScrolled per animazioni UI
 * - Ritarda inizializzazione per evitare flash visivi
 */

import { useEffect, useRef } from 'react';

export const useCalendarScroll = ({
  scrollToDayId,
  savedScrollPosition,
  onScrollComplete,
  tripDays,
  setIsScrolled,
  setJustMounted
}) => {
  const scrollContainerRef = useRef(null);

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
        const dayIndex = tripDays.findIndex(d => d.id === scrollToDayId);
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
  }, [scrollToDayId, savedScrollPosition, tripDays, onScrollComplete]);

  return scrollContainerRef;
};