import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  CellLocation,
  CellAction,
  cellHasContent,
  executeCellAction,
  requiresCategoryChangeWarning
} from '../../../utils/cellDataUtils';
import { useCellDragDrop, SelectionState } from '../../../hooks/useCellDragDrop';
import CellActionModal from './CellActionModal';
import { CATEGORIES } from '../../../utils/constants';

interface CellDragContextValue {
  /** Stato della selezione corrente */
  selectionState: SelectionState;
  /** Seleziona una cella (dopo long-press) */
  selectCell: (source: CellLocation) => void;
  /** Gestisce click su una cella */
  handleCellClick: (target: CellLocation) => 'action' | 'open' | 'ignore';
  /** Annulla la selezione */
  cancelSelection: () => void;
  /** Verifica se la cella è selezionata */
  isSelectedCell: (dayId: number, categoryId: string) => boolean;
  /** Se siamo in modalità selezione */
  isSelectionMode: () => boolean;
  /** Se il drag and drop è abilitato */
  isDragEnabled: boolean;
}

const CellDragContext = createContext<CellDragContextValue | null>(null);

interface CellDragProviderProps {
  children: ReactNode;
  /** Dati del trip */
  tripData: Record<string, any>;
  /** Callback per aggiornare i dati del trip */
  onUpdateTripData: (updates: Record<string, any>) => Promise<void>;
  /** Funzione per ottenere i dati di una cella */
  getCellData: (dayId: number, categoryId: string) => any;
  /** Se il drag è abilitato (es. non in edit mode) */
  isDragEnabled?: boolean;
}

/**
 * Toast component per mostrare istruzioni dopo la selezione
 */
const SelectionToast: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Piccolo delay per triggherare l'animazione
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Aspetta fine animazione prima di smontare
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) return null;

  const toast = (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] transition-all duration-600 ease-out ${isAnimating
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
        }`}
    >
      <div className="bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg flex flex-col items-start gap-1 min-w-[300px] max-w-[90vw]">
        <span className="text-sm font-medium">📍 Seleziona la cella di destinazione</span>
        <span className="text-xs opacity-70">(puoi spostare intere giornate dal menu edit)</span>
      </div>
    </div>
  );

  return createPortal(toast, document.body);
};

/**
 * Provider che gestisce la selezione e spostamento celle.
 * 
 * Flusso:
 * 1. Long-press su cella A → selectCell() → cella evidenziata con ring blu
 * 2. Click su cella B → handleCellClick() → mostra modal Sposta/Copia/Scambia
 * 3. Scegli azione → esegue e chiude
 * 4. Click su cella A o ESC → annulla selezione
 */
export const CellDragProvider: React.FC<CellDragProviderProps> = ({
  children,
  tripData,
  onUpdateTripData,
  getCellData,
  isDragEnabled = true
}) => {
  // Stato per il modal azione
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    source: CellLocation | null;
    target: CellLocation | null;
  }>({
    isOpen: false,
    source: null,
    target: null
  });

  // Stato per il toast
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handler quando viene selezionata una destinazione
  const handleTargetSelected = useCallback((source: CellLocation, target: CellLocation) => {
    // Nascondi toast quando si seleziona destinazione
    setShowToast(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setModalState({
      isOpen: true,
      source,
      target
    });
  }, []);

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
      // Nascondi toast
      setShowToast(false);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    },
    onTargetSelected: handleTargetSelected
  });

  // Wrapper per cancelSelection che pulisce anche il toast
  const cancelSelection = useCallback(() => {
    setShowToast(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    cancelSelectionInternal();
  }, [cancelSelectionInternal]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Wrapper per selectCell che controlla se è abilitato
  const selectCell = useCallback((source: CellLocation) => {
    if (!isDragEnabled) return;
    selectCellInternal(source);
  }, [isDragEnabled, selectCellInternal]);

  // Wrapper per handleCellClick
  const handleCellClick = useCallback((target: CellLocation): 'action' | 'open' | 'ignore' => {
    if (!isDragEnabled) return 'open';
    return handleCellClickInternal(target);
  }, [isDragEnabled, handleCellClickInternal]);

  // Listener per ESC key per annullare selezione
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionState.hasSelection) {
        cancelSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionState.hasSelection, cancelSelection]);

  // Handler quando l'utente sceglie un'azione nel modal
  const handleAction = useCallback(async (action: CellAction) => {
    const { source, target } = modalState;

    if (!source || !target) {
      setModalState({ isOpen: false, source: null, target: null });
      return;
    }

    // Esegui l'azione
    const result = executeCellAction(action, tripData, source, target);

    if (result.success) {
      try {
        // Aggiorna i dati del trip
        await onUpdateTripData(result.updates);
        console.log(`✅ Azione "${action}" completata`, result.updates);
      } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento:', error);
      }
    } else {
      console.warn('⚠️ Azione non riuscita:', result.error);
    }

    // Chiudi modal
    setModalState({ isOpen: false, source: null, target: null });
  }, [modalState, tripData, onUpdateTripData]);

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
  const targetHasContent = modalState.target
    ? cellHasContent(getCellData(modalState.target.dayId, modalState.target.categoryId))
    : false;

  // Verifica se è un cambio categoria
  const isCategoryChange = modalState.source && modalState.target
    ? requiresCategoryChangeWarning(modalState.source.categoryId, modalState.target.categoryId)
    : false;

  const contextValue: CellDragContextValue = {
    selectionState,
    selectCell,
    handleCellClick,
    cancelSelection,
    isSelectedCell,
    isSelectionMode,
    isDragEnabled
  };

  return (
    <CellDragContext.Provider value={contextValue}>
      {children}

      {/* Toast istruzioni dopo selezione */}
      <SelectionToast visible={showToast} />

      {/* Modal per scegliere l'azione */}
      <CellActionModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onAction={handleAction}
        fromCategoryLabel={getSourceCategoryLabel()}
        toCategoryLabel={getTargetCategoryLabel()}
        targetHasContent={targetHasContent}
        isCategoryChange={isCategoryChange}
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