import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  /** Durata in ms per attivare il long-press (default: 300) */
  delay?: number;
  /** Callback quando inizia il long-press */
  onLongPressStart?: () => void;
  /** Callback quando finisce (rilascio o annullamento) */
  onLongPressEnd?: () => void;
  /** Distanza massima di movimento prima di annullare (default: 10px) */
  moveThreshold?: number;
}

interface UseLongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * Hook per rilevare long-press (tenere premuto) su elementi.
 * Funziona sia con mouse (desktop) che touch (mobile).
 * 
 * @param onLongPress - Callback eseguito quando il long-press è completato
 * @param onClick - Callback per click normale (opzionale)
 * @param options - Opzioni di configurazione
 * 
 * @example
 * const longPressHandlers = useLongPress(
 *   () => console.log('Long press!'),
 *   () => console.log('Click normale'),
 *   { delay: 300 }
 * );
 * 
 * <div {...longPressHandlers}>Tieni premuto</div>
 */
export const useLongPress = (
  onLongPress: () => void,
  onClick?: () => void,
  options: UseLongPressOptions = {}
): UseLongPressResult => {
  const {
    delay = 300,
    onLongPressStart,
    onLongPressEnd,
    moveThreshold = 10
  } = options;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((x: number, y: number) => {
    // Reset stato
    isLongPressRef.current = false;
    startPosRef.current = { x, y };

    // Avvia timer
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPressStart?.();
      onLongPress();
    }, delay);
  }, [delay, onLongPress, onLongPressStart]);

  const cancel = useCallback(() => {
    clearTimer();
    if (isLongPressRef.current) {
      onLongPressEnd?.();
    }
    startPosRef.current = null;
  }, [clearTimer, onLongPressEnd]);

  const handleMove = useCallback((x: number, y: number) => {
    if (!startPosRef.current) return;

    // Se si muove troppo, annulla il long-press
    const deltaX = Math.abs(x - startPosRef.current.x);
    const deltaY = Math.abs(y - startPosRef.current.y);

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      cancel();
    }
  }, [moveThreshold, cancel]);

  const end = useCallback(() => {
    clearTimer();
    
    // Se non era un long-press, è un click normale
    if (!isLongPressRef.current && onClick) {
      onClick();
    }
    
    if (isLongPressRef.current) {
      onLongPressEnd?.();
    }
    
    isLongPressRef.current = false;
    startPosRef.current = null;
  }, [clearTimer, onClick, onLongPressEnd]);

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Solo tasto sinistro
    if (e.button !== 0) return;
    start(e.clientX, e.clientY);
  }, [start]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    end();
  }, [end]);

  const onMouseLeave = useCallback((e: React.MouseEvent) => {
    cancel();
  }, [cancel]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    start(touch.clientX, touch.clientY);
  }, [start]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    end();
  }, [end]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onMouseMove,
    onTouchStart,
    onTouchEnd,
    onTouchMove
  };
};

export default useLongPress;