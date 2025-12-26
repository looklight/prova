import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import { Trash2 } from 'lucide-react';
import { rawColors, glowShadows, transitions } from '../../styles/theme';
import { useSwipeContext } from './SwipeContext';

// ============================================
// SwipeToDelete - Componente riutilizzabile
// Mobile: swipe a sinistra per eliminare
// Desktop: hover per mostrare il pulsante
//
// Comportamento stile WhatsApp:
// - Un solo elemento aperto alla volta
// - Toccare altrove chiude lo swipe
// - Iniziare swipe su altro elemento chiude il precedente
// ============================================

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  threshold?: number;
  disabled?: boolean;
  /** ID opzionale per identificare l'elemento (generato automaticamente se non fornito) */
  swipeId?: string;
}

const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({
  children,
  onDelete,
  threshold = 0.3,
  disabled = false,
  swipeId: externalSwipeId
}) => {
  // Genera ID unico per questa istanza
  const generatedId = useId();
  const swipeId = externalSwipeId || generatedId;

  // Context per coordinamento globale
  const { activeSwipeId, openSwipe, closeSwipe, registerSwipe, unregisterSwipe, isProvided } = useSwipeContext();

  // State locale
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const DELETE_BUTTON_WIDTH = 64;
  const BUTTON_SIZE = 44;

  // Questo elemento è quello attivo?
  const isActive = activeSwipeId === swipeId;

  // Registra/deregistra al mount/unmount
  useEffect(() => {
    if (isProvided) {
      registerSwipe(swipeId);
      return () => unregisterSwipe(swipeId);
    }
  }, [swipeId, registerSwipe, unregisterSwipe, isProvided]);

  // Reagisci ai cambiamenti del context: chiudi se non sei più attivo
  useEffect(() => {
    if (isProvided && !isActive && translateX !== 0 && !isDragging) {
      setTranslateX(0);
    }
  }, [isActive, translateX, isDragging, isProvided]);

  // Rileva se è un dispositivo touch
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    setIsTouchDevice(hasTouch && !hasPointer);
  }, []);

  // Touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isDeleting) return;

    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    currentXRef.current = translateX;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);

    // Se c'è un altro swipe aperto, chiudilo
    if (isProvided && activeSwipeId && activeSwipeId !== swipeId) {
      closeSwipe(activeSwipeId);
    }
  }, [disabled, isDeleting, translateX, isProvided, activeSwipeId, swipeId, closeSwipe]);

  // Touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Determina direzione al primo movimento significativo
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Se è scroll verticale, ignora
    if (isHorizontalSwipeRef.current === false) {
      setIsDragging(false);
      return;
    }

    // Swipe orizzontale
    if (isHorizontalSwipeRef.current === true) {
      let newTranslateX = currentXRef.current + diffX;

      // Limita il movimento: solo verso sinistra, con resistenza elastica
      if (newTranslateX > 0) {
        newTranslateX = newTranslateX * 0.2; // Resistenza se si va a destra
      } else if (newTranslateX < -DELETE_BUTTON_WIDTH) {
        // Resistenza elastica oltre il limite
        const overflow = Math.abs(newTranslateX) - DELETE_BUTTON_WIDTH;
        newTranslateX = -DELETE_BUTTON_WIDTH - (overflow * 0.3);
      }

      setTranslateX(newTranslateX);
    }
  }, [isDragging, disabled]);

  // Touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    isHorizontalSwipeRef.current = null;

    const thresholdPx = DELETE_BUTTON_WIDTH * threshold;

    if (translateX < -thresholdPx) {
      // Apri lo swipe
      setTranslateX(-DELETE_BUTTON_WIDTH);
      if (isProvided) {
        openSwipe(swipeId);
      }
    } else {
      // Chiudi lo swipe
      setTranslateX(0);
      if (isProvided) {
        closeSwipe(swipeId);
      }
    }
  }, [isDragging, translateX, threshold, isProvided, openSwipe, closeSwipe, swipeId]);

  // Hover handlers (desktop)
  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice && !disabled) {
      setIsHovered(true);
    }
  }, [isTouchDevice, disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (isDragging) {
      setIsDragging(false);
      setTranslateX(0);
    }
  }, [isDragging]);

  // Delete action
  const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Reset posizione immediatamente prima di chiamare onDelete
    // Questo evita che la card resti spostata quando appare il modal di conferma
    setTranslateX(0);
    setIsHovered(false);
    setIsDeleting(false);
    if (isProvided) {
      closeSwipe(swipeId);
    }

    // Chiama onDelete dopo un breve delay per permettere il reset visivo
    setTimeout(() => {
      onDelete();
    }, 50);
  }, [onDelete, isProvided, closeSwipe, swipeId]);

  // Click sul contenuto
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (translateX < 0) {
      // Se lo swipe è aperto, chiudilo e blocca il click
      e.preventDefault();
      e.stopPropagation();
      setTranslateX(0);
      if (isProvided) {
        closeSwipe(swipeId);
      }
    }
  }, [translateX, isProvided, closeSwipe, swipeId]);

  // Calcola visibilità del pulsante
  const swipeProgress = Math.min(Math.abs(translateX) / DELETE_BUTTON_WIDTH, 1);
  const showDesktopButton = !isTouchDevice && isHovered && !disabled;

  return (
    <div
      ref={containerRef}
      data-swipe-id={swipeId}
      className="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Contenuto principale */}
      <div
        className="relative flex-1 min-w-0"
        style={{
          transform: isTouchDevice ? `translateX(${translateX}px)` : 'none',
          transition: isDragging ? 'none' : `transform 0.25s ${transitions.bounce}`,
          touchAction: 'pan-y',
          willChange: isDragging ? 'transform' : 'auto'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {children}
      </div>

      {/* Delete button - MOBILE (centrato nello spazio rivelato) */}
      {isTouchDevice && translateX < 0 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center"
          style={{ width: Math.abs(translateX) }}
        >
          <button
            onClick={handleDelete}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleDelete(e);
            }}
            className="flex items-center justify-center text-white active:scale-95"
            style={{
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              minWidth: BUTTON_SIZE,
              minHeight: BUTTON_SIZE,
              borderRadius: '50%',
              backgroundColor: rawColors.danger,
              boxShadow: swipeProgress > 0.8 ? glowShadows.danger : 'none',
              opacity: swipeProgress > 0.3 ? 1 : swipeProgress / 0.3,
              transform: `scale(${Math.min(swipeProgress * 1.2, 1)})`,
              pointerEvents: swipeProgress > 0.5 ? 'auto' : 'none',
              transition: isDragging ? 'none' : `all 0.3s ${transitions.bounce}`
            }}
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Delete button - DESKTOP (a destra del contenuto) */}
      {!isTouchDevice && (
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: showDesktopButton ? BUTTON_SIZE + 16 : 0,
            opacity: showDesktopButton ? 1 : 0,
            overflow: 'hidden',
            transition: `all 0.2s ${transitions.bounce}`
          }}
        >
          <button
            onClick={handleDelete}
            className="flex items-center justify-center text-white active:scale-90 hover:scale-110"
            style={{
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              borderRadius: '50%',
              backgroundColor: rawColors.danger,
              transform: showDesktopButton ? 'scale(1)' : 'scale(0.8)',
              transition: `all 0.2s ${transitions.bounce}`,
              boxShadow: glowShadows.danger,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SwipeToDelete;
