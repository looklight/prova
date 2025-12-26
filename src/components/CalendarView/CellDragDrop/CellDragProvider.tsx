import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  CellLocation,
  CellAction,
  cellHasContent,
  executeCellAction,
  executeFullDayAction,
  dayHasContent,
  requiresCategoryChangeWarning
} from '../../../utils/cellDataUtils';
import { useCellDragDrop, SelectionState } from '../../../hooks/useCellDragDrop';
import CellActionModal from './CellActionModal';
import { CATEGORIES } from '../../../utils/constants';

// ============================================
// ALTROVE - CellDragProvider
// Gestisce drag & drop celle (solo attività e pernottamento)
// ============================================

interface CellDragContextValue {
  /** Stato della selezione corrente */
  selectionState: SelectionState;
  /** Seleziona una cella (dopo long-press) */
  selectCell: (source: CellLocation) => void;
  /** Seleziona un giorno intero (dopo long-press sull'header) */
  selectFullDay: (dayId: number) => void;
  /** Gestisce click su una cella */
  handleCellClick: (target: CellLocation) => 'action' | 'open' | 'ignore';
  /** Gestisce click su un header giorno (per selezione giorno intero) */
  handleDayHeaderClick: (dayId: number) => 'action' | 'ignore';
  /** Annulla la selezione */
  cancelSelection: () => void;
  /** Verifica se la cella è selezionata */
  isSelectedCell: (dayId: number, categoryId: string, activityIndex?: number) => boolean;
  /** Verifica se un giorno intero è selezionato */
  isSelectedDay: (dayId: number) => boolean;
  /** Se siamo in modalità selezione */
  isSelectionMode: () => boolean;
  /** Se siamo in modalità selezione giorno intero */
  isFullDaySelectionMode: () => boolean;
  /** Se il drag and drop è abilitato */
  isDragEnabled: boolean;
  /** Verifica se una cella è una destinazione valida per lo spostamento */
  isValidTarget: (categoryId: string) => boolean;
}

const CellDragContext = createContext<CellDragContextValue | null>(null);

interface CellDragProviderProps {
  children: ReactNode;
  /** Dati del trip (include anche destinazioni nel formato speciale) */
  tripData: Record<string, any>;
  /** Array dei giorni del trip (per riferimento) */
  tripDays?: any[];
  /** Callback per aggiornare i dati del trip */
  onUpdateTripData: (updates: Record<string, any>) => Promise<void>;
  /** Funzione per ottenere i dati di una cella */
  getCellData: (dayId: number, categoryId: string) => any;
  /** Se il drag è abilitato (es. non in edit mode) */
  isDragEnabled?: boolean;
}

// Categorie che supportano il drag
const DRAGGABLE_CATEGORIES = ['attivita', 'pernottamento', 'destinazione'];

/**
 * Verifica se una categoria supporta il drag
 */
const isDraggableCategory = (categoryId: string): boolean => {
  return DRAGGABLE_CATEGORIES.includes(categoryId);
};

/**
 * Toast component per mostrare istruzioni dopo la selezione
 */
const SelectionToast: React.FC<{ visible: boolean; isFullDay?: boolean }> = ({ visible, isFullDay = false }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) return null;

  const toast = (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className="text-white px-4 py-3 rounded-xl shadow-lg flex flex-col items-start gap-1 min-w-[280px] max-w-[90vw]"
        style={{ backgroundColor: '#2D2A26' }}
      >
        {isFullDay ? (
          <>
            <span className="text-sm font-medium">📅 Giorno selezionato</span>
            <span className="text-xs opacity-70">Tocca un altro giorno per spostare/copiare/scambiare</span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">📍 Seleziona la cella di destinazione</span>
            <span className="text-xs opacity-70">Tocca una cella vuota o con contenuto</span>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(toast, document.body);
};

/**
 * Toast component per mostrare messaggi di errore
 */
const ErrorToast: React.FC<{ message: string | null }> = ({ message }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (message) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!shouldRender) return null;

  const toast = (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className="text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 min-w-[280px] max-w-[90vw]"
        style={{ backgroundColor: '#D4948A' }}
      >
        <span className="text-lg">⚠️</span>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );

  return createPortal(toast, document.body);
};

/**
 * Provider che gestisce la selezione e spostamento celle.
 *
 * Flusso:
 * 1. Long-press su cella A → selectCell() → cella evidenziata
 * 2. Click su cella B → handleCellClick() → mostra modal Sposta/Copia/Scambia
 * 3. Scegli azione → esegue e chiude
 * 4. Click su cella A o ESC → annulla selezione
 *
 * Note Altrove:
 * - Il drag è abilitato per 'attivita', 'pernottamento' e 'destinazione'
 * - Ogni categoria può essere spostata solo nella stessa categoria
 */
export const CellDragProvider: React.FC<CellDragProviderProps> = ({
  children,
  tripData,
  tripDays,
  onUpdateTripData,
  getCellData,
  isDragEnabled = true
}) => {
  // Stato per il modal azione
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    source: CellLocation | null;
    target: CellLocation | null;
    isFullDay?: boolean;
    sourceDayId?: number;
    targetDayId?: number;
  }>({
    isOpen: false,
    source: null,
    target: null
  });

  // Stato per selezione giorno intero
  const [selectedFullDayId, setSelectedFullDayId] = useState<number | null>(null);

  // Stato per il toast
  const [showToast, setShowToast] = useState(false);
  const [isFullDayToast, setIsFullDayToast] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stato per toast di errore
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const errorToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper per mostrare toast di errore
  const showError = useCallback((message: string) => {
    if (errorToastTimerRef.current) {
      clearTimeout(errorToastTimerRef.current);
    }
    setErrorToast(message);
    errorToastTimerRef.current = setTimeout(() => {
      setErrorToast(null);
      errorToastTimerRef.current = null;
    }, 3000);
  }, []);

  // Handler quando viene selezionata una destinazione
  const handleTargetSelected = useCallback((source: CellLocation, target: CellLocation) => {
    // Verifica che entrambe le categorie siano draggabili
    if (!isDraggableCategory(source.categoryId) || !isDraggableCategory(target.categoryId)) {
      console.warn('⚠️ Drag non supportato per questa categoria');
      return;
    }

    // Nascondi toast quando si seleziona destinazione
    setShowToast(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    // Verifica che le categorie siano le stesse
    if (source.categoryId !== target.categoryId) {
      const sourceCat = CATEGORIES.find(c => c.id === source.categoryId);
      const sourceLabel = sourceCat?.label || source.categoryId;
      showError(`Puoi spostare solo verso altre celle "${sourceLabel}"`);
      return;
    }

    setModalState({
      isOpen: true,
      source,
      target
    });
  }, [showError]);

  const {
    selectionState,
    selectCell: selectCellInternal,
    handleCellClick: handleCellClickInternal,
    cancelSelection: cancelSelectionInternal,
    isSelectedCell,
    isSelectionMode
  } = useCellDragDrop({
    getCellData,
    onSelect: () => {
      console.log('🎯 Cella selezionata');
      // Mostra toast per 5 secondi
      setShowToast(true);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
        toastTimerRef.current = null;
      }, 5000);
    },
    onDeselect: () => {
      console.log('🎯 Selezione annullata');
      setShowToast(false);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    },
    onTargetSelected: handleTargetSelected
  });

  // Wrapper per cancelSelection che pulisce anche il toast e la selezione giorno
  const cancelSelection = useCallback(() => {
    setShowToast(false);
    setIsFullDayToast(false);
    setSelectedFullDayId(null);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    cancelSelectionInternal();
  }, [cancelSelectionInternal]);

  // Seleziona un giorno intero
  const selectFullDay = useCallback((dayId: number) => {
    if (!isDragEnabled) return;

    // Verifica che il giorno abbia contenuto
    if (!dayHasContent(tripData, dayId)) {
      showError('Il giorno selezionato è vuoto');
      return;
    }

    // Annulla qualsiasi selezione cella precedente
    cancelSelectionInternal();

    setSelectedFullDayId(dayId);
    setIsFullDayToast(true);
    setShowToast(true);

    // Vibrazione haptic
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Timer per nascondere toast
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
      toastTimerRef.current = null;
    }, 5000);
  }, [isDragEnabled, tripData, cancelSelectionInternal, showError]);

  // Gestisce click su header giorno (per selezione giorno intero)
  const handleDayHeaderClick = useCallback((targetDayId: number): 'action' | 'ignore' => {
    // Se non c'è selezione giorno, ignora
    if (selectedFullDayId === null) {
      return 'ignore';
    }

    // Se clicco sullo stesso giorno, deseleziona
    if (selectedFullDayId === targetDayId) {
      cancelSelection();
      return 'ignore';
    }

    // Altrimenti, mostra il modal per l'azione
    setShowToast(false);
    setModalState({
      isOpen: true,
      source: null,
      target: null,
      isFullDay: true,
      sourceDayId: selectedFullDayId,
      targetDayId: targetDayId
    });

    return 'action';
  }, [selectedFullDayId, cancelSelection]);

  // Verifica se un giorno intero è selezionato
  const isSelectedDay = useCallback((dayId: number): boolean => {
    return selectedFullDayId === dayId;
  }, [selectedFullDayId]);

  // Verifica se siamo in modalità selezione giorno intero
  const isFullDaySelectionMode = useCallback((): boolean => {
    return selectedFullDayId !== null;
  }, [selectedFullDayId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (errorToastTimerRef.current) {
        clearTimeout(errorToastTimerRef.current);
      }
    };
  }, []);

  // Wrapper per selectCell che controlla se è abilitato e se la categoria supporta il drag
  const selectCell = useCallback((source: CellLocation) => {
    if (!isDragEnabled) return;
    if (!isDraggableCategory(source.categoryId)) return;
    selectCellInternal(source);
  }, [isDragEnabled, selectCellInternal]);

  // Wrapper per handleCellClick
  const handleCellClick = useCallback((target: CellLocation): 'action' | 'open' | 'ignore' => {
    if (!isDragEnabled) return 'open';
    
    // Se siamo in selezione e la categoria target non è draggabile, apri normalmente
    if (isSelectionMode() && !isDraggableCategory(target.categoryId)) {
      return 'open';
    }
    
    return handleCellClickInternal(target);
  }, [isDragEnabled, isSelectionMode, handleCellClickInternal]);

  // Listener per ESC key per annullare selezione (cella o giorno intero)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (selectionState.hasSelection || selectedFullDayId !== null)) {
        cancelSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionState.hasSelection, selectedFullDayId, cancelSelection]);

  // Handler quando l'utente sceglie un'azione nel modal
  const handleAction = useCallback(async (action: CellAction) => {
    const { source, target, isFullDay, sourceDayId, targetDayId } = modalState;

    // Gestione giorno intero
    if (isFullDay && sourceDayId !== undefined && targetDayId !== undefined) {
      const result = executeFullDayAction(action, tripData, sourceDayId, targetDayId);

      if (result.success) {
        try {
          await onUpdateTripData(result.updates);
        } catch (error) {
          console.error('❌ Errore durante l\'aggiornamento:', error);
        }
      } else {
        showError(result.error || 'Operazione non consentita');
      }

      // Reset stato
      setSelectedFullDayId(null);
      setModalState({ isOpen: false, source: null, target: null });
      return;
    }

    // Gestione cella singola
    if (!source || !target) {
      setModalState({ isOpen: false, source: null, target: null });
      return;
    }

    // Esegui l'azione
    const result = executeCellAction(action, tripData, source, target);

    if (result.success) {
      try {
        await onUpdateTripData(result.updates);
      } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento:', error);
      }
    } else {
      showError(result.error || 'Operazione non consentita');
    }

    // Chiudi modal
    setModalState({ isOpen: false, source: null, target: null });
  }, [modalState, tripData, onUpdateTripData, showError]);

  // Handler per chiudere il modal
  const handleCloseModal = useCallback(() => {
    setModalState({ isOpen: false, source: null, target: null });
  }, []);

  // Ottieni label delle categorie per il modal
  const getSourceCategoryLabel = () => {
    if (!modalState.source) return '';
    const cat = CATEGORIES.find(c => c.id === modalState.source?.categoryId);
    return cat?.label || modalState.source.categoryId;
  };

  const getTargetCategoryLabel = () => {
    if (!modalState.target) return '';
    const cat = CATEGORIES.find(c => c.id === modalState.target?.categoryId);
    return cat?.label || modalState.target.categoryId;
  };

  // Verifica se target ha contenuto
  // Per attività, controlla se esiste un'attività nello slot target
  // Per full day, controlla se il giorno target ha contenuto
  const targetHasContent = (() => {
    // Per operazioni su giorno intero
    if (modalState.isFullDay && modalState.targetDayId !== undefined) {
      return dayHasContent(tripData, modalState.targetDayId);
    }

    if (!modalState.target) return false;

    const targetData = getCellData(modalState.target.dayId, modalState.target.categoryId);

    // Se è una cella attività con activityIndex, controlla lo slot specifico
    if (modalState.target.categoryId === 'attivita' && modalState.target.activityIndex !== undefined) {
      const activities = targetData?.activities || [];
      const visibleActivities = activities.filter((a: any) => a.showInCalendar === true);
      return !!visibleActivities[modalState.target.activityIndex];
    }

    return cellHasContent(targetData);
  })();

  // Verifica se è un cambio categoria (es. da attività a pernottamento)
  const isCategoryChange = modalState.source && modalState.target
    ? requiresCategoryChangeWarning(modalState.source.categoryId, modalState.target.categoryId)
    : false;

  // Verifica se una categoria è una destinazione valida per lo spostamento
  // - Ogni categoria può essere spostata solo nella stessa categoria
  const isValidTarget = useCallback((targetCategoryId: string): boolean => {
    if (!selectionState.hasSelection || !selectionState.selectedCell) return false;

    // La categoria deve essere draggabile
    if (!isDraggableCategory(targetCategoryId)) return false;

    const source = selectionState.selectedCell;

    // Ogni categoria può essere spostata solo nella stessa categoria
    return targetCategoryId === source.categoryId;
  }, [selectionState]);

  const contextValue: CellDragContextValue = {
    selectionState,
    selectCell,
    selectFullDay,
    handleCellClick,
    handleDayHeaderClick,
    cancelSelection,
    isSelectedCell,
    isSelectedDay,
    isSelectionMode,
    isFullDaySelectionMode,
    isDragEnabled,
    isValidTarget
  };

  return (
    <CellDragContext.Provider value={contextValue}>
      {children}

      {/* Toast istruzioni dopo selezione */}
      <SelectionToast visible={showToast} isFullDay={isFullDayToast} />

      {/* Toast errore */}
      <ErrorToast message={errorToast} />

      {/* Modal per scegliere l'azione */}
      <CellActionModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onAction={handleAction}
        fromCategoryLabel={getSourceCategoryLabel()}
        toCategoryLabel={getTargetCategoryLabel()}
        targetHasContent={targetHasContent}
        isCategoryChange={isCategoryChange}
        isFullDay={modalState.isFullDay}
      />
    </CellDragContext.Provider>
  );
};

/**
 * Hook per accedere al contesto della selezione celle
 */
export const useCellDrag = (): CellDragContextValue => {
  const context = useContext(CellDragContext);

  if (!context) {
    throw new Error('useCellDrag must be used within a CellDragProvider');
  }

  return context;
};

export default CellDragProvider;