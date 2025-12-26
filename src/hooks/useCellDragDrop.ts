import { useState, useCallback } from 'react';
import { CellLocation, cellHasContent } from '../utils/cellDataUtils';

export interface SelectionState {
  /** Se c'è una cella selezionata */
  hasSelection: boolean;
  /** Cella selezionata (origine) */
  selectedCell: CellLocation | null;
}

export interface UseCellDragDropOptions {
  /** Callback quando una cella viene selezionata */
  onSelect?: (source: CellLocation) => void;
  /** Callback quando la selezione viene annullata */
  onDeselect?: () => void;
  /** Callback quando viene selezionata una destinazione */
  onTargetSelected?: (source: CellLocation, target: CellLocation) => void;
  /** Funzione per ottenere i dati di una cella */
  getCellData: (dayId: number, categoryId: string) => any;
}

export interface UseCellDragDropResult {
  /** Stato corrente della selezione */
  selectionState: SelectionState;
  /** Seleziona una cella (chiamato dopo long-press) */
  selectCell: (source: CellLocation) => void;
  /** Click su una cella (completa azione o apre cella) */
  handleCellClick: (target: CellLocation) => 'action' | 'open' | 'ignore';
  /** Annulla la selezione */
  cancelSelection: () => void;
  /** Verifica se una cella è quella selezionata */
  isSelectedCell: (dayId: number, categoryId: string) => boolean;
  /** Verifica se siamo in modalità selezione */
  isSelectionMode: () => boolean;
}

const initialState: SelectionState = {
  hasSelection: false,
  selectedCell: null
};

/**
 * Hook per gestire selezione e spostamento celle.
 * 
 * Flusso:
 * 1. Long-press su cella A → selectCell() → cella evidenziata
 * 2. Click su cella B → handleCellClick() → ritorna 'action' → mostra modal
 * 3. Click su cella A (stessa) → deseleziona
 * 4. Click altrove / ESC → cancelSelection()
 */
export const useCellDragDrop = (
  options: UseCellDragDropOptions
): UseCellDragDropResult => {
  const { onSelect, onDeselect, onTargetSelected, getCellData } = options;
  const [selectionState, setSelectionState] = useState<SelectionState>(initialState);

  const selectCell = useCallback((source: CellLocation) => {
    const cellData = getCellData(source.dayId, source.categoryId);
    
    // Non permettere selezione di celle vuote
    if (!cellHasContent(cellData)) {
      return;
    }

    setSelectionState({
      hasSelection: true,
      selectedCell: source
    });

    onSelect?.(source);

    // Vibrazione haptic su mobile (se supportata)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [getCellData, onSelect]);

  const cancelSelection = useCallback(() => {
    setSelectionState(initialState);
    onDeselect?.();
  }, [onDeselect]);

  const handleCellClick = useCallback((target: CellLocation): 'action' | 'open' | 'ignore' => {
    const { hasSelection, selectedCell } = selectionState;

    // Se non c'è selezione, apri normalmente la cella
    if (!hasSelection || !selectedCell) {
      return 'open';
    }

    // Se clicco sulla stessa cella selezionata, deseleziona
    if (selectedCell.dayId === target.dayId && 
        selectedCell.categoryId === target.categoryId) {
      cancelSelection();
      return 'ignore';
    }

    // Altrimenti, abbiamo source e target → triggera azione
    onTargetSelected?.(selectedCell, target);
    
    // Reset selezione (il modal gestirà il resto)
    setSelectionState(initialState);
    
    return 'action';
  }, [selectionState, cancelSelection, onTargetSelected]);

  const isSelectedCell = useCallback((dayId: number, categoryId: string, activityIndex?: number): boolean => {
    const selected = selectionState.selectedCell;
    if (!selected) return false;

    const baseMatch = selected.dayId === dayId && selected.categoryId === categoryId;

    // Se entrambi hanno activityIndex, devono corrispondere
    if (selected.activityIndex !== undefined && activityIndex !== undefined) {
      return baseMatch && selected.activityIndex === activityIndex;
    }

    // Se nessuno dei due ha activityIndex, basta il match base
    if (selected.activityIndex === undefined && activityIndex === undefined) {
      return baseMatch;
    }

    // Se solo uno ha activityIndex, non corrisponde
    return false;
  }, [selectionState.selectedCell]);

  const isSelectionMode = useCallback((): boolean => {
    return selectionState.hasSelection;
  }, [selectionState.hasSelection]);

  return {
    selectionState,
    selectCell,
    handleCellClick,
    cancelSelection,
    isSelectedCell,
    isSelectionMode
  };
};

export default useCellDragDrop;