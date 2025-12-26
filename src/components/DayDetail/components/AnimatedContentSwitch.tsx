import React, { useState, useRef, useLayoutEffect } from 'react';
import { durations, easings } from '../../../styles/animations';

// ============================================
// AnimatedContentSwitch
// Cross-fade fluido tra due contenuti con animazione altezza
// ============================================

interface AnimatedContentSwitchProps {
  showSecond: boolean;
  isOpen?: boolean;
  first: React.ReactNode;
  second: React.ReactNode;
  className?: string;
}

const AnimatedContentSwitch: React.FC<AnimatedContentSwitchProps> = ({
  showSecond,
  isOpen = true,
  first,
  second,
  className = ''
}) => {
  const firstRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);

  // Stato per l'animazione
  const [state, setState] = useState<{
    height: number | 'auto';
    isAnimating: boolean;
    activeContent: 'first' | 'second' | 'none';
    fadingOut: 'first' | 'second' | null;
    fadingIn: 'first' | 'second' | null;
  }>({
    height: isOpen ? 'auto' : 0,
    isAnimating: false,
    activeContent: isOpen ? (showSecond ? 'second' : 'first') : 'none',
    fadingOut: null,
    fadingIn: null,
  });

  // Ref per tracciare i valori precedenti
  const prevIsOpen = useRef(isOpen);
  const prevShowSecond = useRef(showSecond);

  useLayoutEffect(() => {
    const wasOpen = prevIsOpen.current;
    const wasShowingSecond = prevShowSecond.current;

    prevIsOpen.current = isOpen;
    prevShowSecond.current = showSecond;

    // Caso 1: Chiusura (isOpen: true -> false)
    if (wasOpen && !isOpen) {
      const currentRef = wasShowingSecond ? secondRef : firstRef;
      const currentHeight = currentRef.current?.offsetHeight || 0;

      setState(prev => ({
        ...prev,
        height: currentHeight,
        isAnimating: true,
      }));

      requestAnimationFrame(() => {
        setState(prev => ({
          ...prev,
          height: 0,
          activeContent: 'none',
          fadingOut: wasShowingSecond ? 'second' : 'first',
        }));

        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isAnimating: false,
            fadingOut: null,
          }));
        }, durations.slow);
      });
      return;
    }

    // Caso 2: Apertura (isOpen: false -> true)
    if (!wasOpen && isOpen) {
      const targetContent = showSecond ? 'second' : 'first';
      const targetRef = showSecond ? secondRef : firstRef;

      // Inizia con il contenuto visibile ma opacity 0
      setState(prev => ({
        ...prev,
        height: 0,
        isAnimating: true,
        activeContent: targetContent,
        fadingIn: targetContent,
      }));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetHeight = targetRef.current?.offsetHeight || 0;

          // Anima altezza e fade in
          setState(prev => ({
            ...prev,
            height: targetHeight,
            fadingIn: null, // Rimuove fadingIn per triggerare opacity 1
          }));

          setTimeout(() => {
            setState(prev => ({
              ...prev,
              height: 'auto',
              isAnimating: false,
            }));
          }, durations.slow);
        });
      });
      return;
    }

    // Caso 3: Switch contenuto (showSecond cambia mentre isOpen è true)
    if (isOpen && wasShowingSecond !== showSecond) {
      const fromRef = wasShowingSecond ? secondRef : firstRef;
      const toRef = showSecond ? secondRef : firstRef;
      const fromContent = wasShowingSecond ? 'second' : 'first';
      const toContent = showSecond ? 'second' : 'first';

      const currentHeight = fromRef.current?.offsetHeight || 0;

      // Prima: mostra entrambi, quello nuovo con opacity 0
      setState(prev => ({
        ...prev,
        height: currentHeight,
        isAnimating: true,
        activeContent: toContent,
        fadingOut: fromContent,
        fadingIn: toContent,
      }));

      // Dopo un frame: triggera il cross-fade
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetHeight = toRef.current?.offsetHeight || 0;

          setState(prev => ({
            ...prev,
            height: targetHeight,
            fadingIn: null, // Rimuove fadingIn per triggerare opacity 1
          }));

          setTimeout(() => {
            setState(prev => ({
              ...prev,
              height: 'auto',
              isAnimating: false,
              fadingOut: null,
            }));
          }, durations.slow);
        });
      });
    }
  }, [isOpen, showSecond]);

  const { height, isAnimating, activeContent, fadingOut, fadingIn } = state;

  // Determina visibilità e opacity
  const firstVisible = activeContent === 'first' || fadingOut === 'first' || fadingIn === 'first';
  const secondVisible = activeContent === 'second' || fadingOut === 'second' || fadingIn === 'second';

  // Opacity: 0 se sta facendo fade out O se sta iniziando fade in, 1 se è attivo
  const firstOpacity = fadingOut === 'first' || fadingIn === 'first' ? 0 : (activeContent === 'first' ? 1 : 0);
  const secondOpacity = fadingOut === 'second' || fadingIn === 'second' ? 0 : (activeContent === 'second' ? 1 : 0);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        height: height === 'auto' ? 'auto' : height,
        transition: isAnimating ? `height ${durations.slow}ms ${easings.smooth}` : 'none',
      }}
    >
      {/* First content */}
      {firstVisible && (
        <div
          ref={firstRef}
          style={{
            opacity: firstOpacity,
            transition: `opacity ${durations.slow}ms ${easings.easeOut}`,
            position: isAnimating ? 'absolute' : (activeContent === 'first' ? 'relative' : 'absolute'),
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: activeContent === 'first' && !isAnimating ? 'auto' : 'none',
          }}
        >
          {first}
        </div>
      )}

      {/* Second content */}
      {secondVisible && (
        <div
          ref={secondRef}
          style={{
            opacity: secondOpacity,
            transition: `opacity ${durations.slow}ms ${easings.easeOut}`,
            position: isAnimating ? 'absolute' : (activeContent === 'second' ? 'relative' : 'absolute'),
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: activeContent === 'second' && !isAnimating ? 'auto' : 'none',
          }}
        >
          {second}
        </div>
      )}
    </div>
  );
};

export default AnimatedContentSwitch;
