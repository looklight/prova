import { useState, useEffect, RefObject } from 'react';

/**
 * Hook per calcolare altezza dinamica delle celle in base allo spazio disponibile
 * 
 * @param headerRef - Ref dell'elemento header per misurarne l'altezza
 * @param categoryCount - Numero di categorie (righe) da visualizzare
 * @param minHeight - Altezza minima delle celle (default: 48px)
 * @returns cellHeight - Altezza calcolata per ogni cella
 */
export const useDynamicCellHeight = (
  headerRef: RefObject<HTMLDivElement>,
  categoryCount: number,
  minHeight: number = 48
): number => {
  const [cellHeight, setCellHeight] = useState(minHeight);

  useEffect(() => {
    const calculateHeight = () => {
      const viewportHeight = window.innerHeight;
      const headerHeight = headerRef.current?.offsetHeight || 100;
      const theadHeight = 50; // Header giorni
      const totalRowHeight = 48;
      const padding = Math.max(24, viewportHeight * 0.05); // 5% dello schermo, minimo 24px
      
      const availableHeight = viewportHeight - headerHeight - theadHeight - totalRowHeight - padding;
      const calculated = Math.floor(availableHeight / categoryCount);
      const finalHeight = Math.max(minHeight, calculated);
      
      setCellHeight(finalHeight);
    };

    // Calcola subito
    calculateHeight();
    
    // Ricalcola su resize
    window.addEventListener('resize', calculateHeight);
    
    // Ricalcola dopo un breve delay per permettere al DOM di aggiornarsi
    const timeout = setTimeout(calculateHeight, 100);

    return () => {
      window.removeEventListener('resize', calculateHeight);
      clearTimeout(timeout);
    };
  }, [headerRef, categoryCount, minHeight]);

  return cellHeight;
};