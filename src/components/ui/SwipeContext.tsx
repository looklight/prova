import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ============================================
// SwipeContext - Gestione swipe globale
// Permette un solo elemento swipe aperto alla volta
// Stile WhatsApp: toccare altrove chiude lo swipe
// ============================================

interface SwipeContextType {
  activeSwipeId: string | null;
  openSwipe: (id: string) => void;
  closeSwipe: (id: string) => void;
  closeAll: () => void;
  registerSwipe: (id: string) => void;
  unregisterSwipe: (id: string) => void;
}

const SwipeContext = createContext<SwipeContextType | null>(null);

interface SwipeProviderProps {
  children: React.ReactNode;
}

export const SwipeProvider: React.FC<SwipeProviderProps> = ({ children }) => {
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const registeredSwipes = useRef<Set<string>>(new Set());

  const openSwipe = useCallback((id: string) => {
    setActiveSwipeId(id);
  }, []);

  const closeSwipe = useCallback((id: string) => {
    setActiveSwipeId(current => current === id ? null : current);
  }, []);

  const closeAll = useCallback(() => {
    setActiveSwipeId(null);
  }, []);

  const registerSwipe = useCallback((id: string) => {
    registeredSwipes.current.add(id);
  }, []);

  const unregisterSwipe = useCallback((id: string) => {
    registeredSwipes.current.delete(id);
    // Se l'elemento rimosso era quello attivo, chiudilo
    setActiveSwipeId(current => current === id ? null : current);
  }, []);

  // Listener globale per chiudere swipe quando si tocca fuori
  useEffect(() => {
    const handleGlobalTouch = (e: TouchEvent) => {
      if (!activeSwipeId) return;

      // Verifica se il touch è su un elemento swipe registrato
      const target = e.target as HTMLElement;
      const isOnSwipeElement = target.closest('[data-swipe-id]');

      if (!isOnSwipeElement) {
        // Touch fuori da qualsiasi elemento swipe -> chiudi tutto
        closeAll();
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      if (!activeSwipeId) return;

      const target = e.target as HTMLElement;
      const isOnSwipeElement = target.closest('[data-swipe-id]');

      if (!isOnSwipeElement) {
        closeAll();
      }
    };

    // Usa capture per intercettare prima degli handler locali
    document.addEventListener('touchstart', handleGlobalTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', handleGlobalClick, { capture: true });

    return () => {
      document.removeEventListener('touchstart', handleGlobalTouch, { capture: true } as any);
      document.removeEventListener('mousedown', handleGlobalClick, { capture: true } as any);
    };
  }, [activeSwipeId, closeAll]);

  return (
    <SwipeContext.Provider value={{
      activeSwipeId,
      openSwipe,
      closeSwipe,
      closeAll,
      registerSwipe,
      unregisterSwipe
    }}>
      {children}
    </SwipeContext.Provider>
  );
};

/**
 * Hook per usare il contesto swipe
 * Se non c'è un provider, ritorna valori di fallback (funziona standalone)
 */
export const useSwipeContext = () => {
  const context = useContext(SwipeContext);

  // Fallback per uso standalone (senza provider)
  if (!context) {
    return {
      activeSwipeId: null,
      openSwipe: () => {},
      closeSwipe: () => {},
      closeAll: () => {},
      registerSwipe: () => {},
      unregisterSwipe: () => {},
      isProvided: false
    };
  }

  return { ...context, isProvided: true };
};

export default SwipeContext;
