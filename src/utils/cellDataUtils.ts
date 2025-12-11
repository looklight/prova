/**
 * cellDataUtils.ts
 * 
 * Funzioni per manipolare i dati delle celle nel CalendarView.
 * Gestisce spostamento, copia e scambio di dati tra celle.
 */

export interface CellLocation {
  dayId: number;
  categoryId: string;
}

export interface CellData {
  title?: string;
  cost?: string;
  costBreakdown?: Array<{
    userId: string;
    amount: number;
  }>;
  notes?: string;
  location?: {
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  startTime?: string;
  endTime?: string;
  reminder?: {
    date: string;
    time: string;
    note?: string;
  };
  reminderId?: string;
  bookingStatus?: 'yes' | 'no' | 'na';
  transportMode?: string;
  links?: string[];
  images?: string[];
  videos?: string[];
  mediaNotes?: string[];
  [key: string]: any; // Per eventuali altri campi
}

export type CellAction = 'move' | 'copy' | 'swap';

/**
 * Genera la chiave per accedere ai dati di una cella
 */
export const getCellKey = (dayId: number, categoryId: string): string => {
  return `${dayId}-${categoryId}`;
};

/**
 * Verifica se una cella ha contenuto
 */
export const cellHasContent = (cellData: CellData | null | undefined): boolean => {
  if (!cellData) return false;
  
  return !!(
    cellData.title ||
    cellData.cost ||
    cellData.notes ||
    cellData.location?.address ||
    cellData.location?.coordinates ||
    cellData.startTime ||
    cellData.endTime ||
    cellData.reminder?.date ||
    (cellData.links && cellData.links.length > 0) ||
    (cellData.images && cellData.images.length > 0) ||
    (cellData.videos && cellData.videos.length > 0)
  );
};

/**
 * Clona i dati di una cella (deep copy)
 */
export const cloneCellData = (cellData: CellData | null): CellData | null => {
  if (!cellData) return null;
  return JSON.parse(JSON.stringify(cellData));
};

/**
 * Prepara i dati per il trasferimento tra categorie diverse.
 * Rimuove campi specifici della categoria origine che non hanno senso nella destinazione.
 */
export const prepareCellDataForTransfer = (
  cellData: CellData,
  fromCategoryId: string,
  toCategoryId: string
): CellData => {
  const cloned = cloneCellData(cellData);
  if (!cloned) return {};

  // Se cambia categoria, alcuni campi potrebbero non avere senso
  if (fromCategoryId !== toCategoryId) {
    // transportMode ha senso solo per spostamenti
    if (!toCategoryId.startsWith('spostamenti')) {
      delete cloned.transportMode;
    }

    // Se la destinazione è 'note', mantieni solo notes
    if (toCategoryId === 'note') {
      return {
        notes: cloned.notes || cloned.title || ''
      };
    }

    // Se l'origine è 'note', sposta notes in title
    if (fromCategoryId === 'note' && cloned.notes) {
      cloned.title = cloned.notes;
      delete cloned.notes;
    }
  }

  return cloned;
};

/**
 * Risultato di un'operazione su celle
 */
export interface CellOperationResult {
  success: boolean;
  updates: Record<string, CellData | null>;
  error?: string;
}

/**
 * SPOSTA: Muove i dati da origine a destinazione, svuota origine
 */
export const moveCellData = (
  tripData: Record<string, any>,
  from: CellLocation,
  to: CellLocation
): CellOperationResult => {
  const fromKey = getCellKey(from.dayId, from.categoryId);
  const toKey = getCellKey(to.dayId, to.categoryId);

  // Stessa cella, niente da fare
  if (fromKey === toKey) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono la stessa cella' };
  }

  const fromData = tripData[fromKey];
  
  if (!cellHasContent(fromData)) {
    return { success: false, updates: {}, error: 'La cella origine è vuota' };
  }

  // Prepara i dati per la destinazione
  const transferData = prepareCellDataForTransfer(fromData, from.categoryId, to.categoryId);

  return {
    success: true,
    updates: {
      [fromKey]: null, // Svuota origine
      [toKey]: transferData // Popola destinazione
    }
  };
};

/**
 * COPIA: Copia i dati da origine a destinazione, mantiene origine
 */
export const copyCellData = (
  tripData: Record<string, any>,
  from: CellLocation,
  to: CellLocation
): CellOperationResult => {
  const fromKey = getCellKey(from.dayId, from.categoryId);
  const toKey = getCellKey(to.dayId, to.categoryId);

  // Stessa cella, niente da fare
  if (fromKey === toKey) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono la stessa cella' };
  }

  const fromData = tripData[fromKey];
  
  if (!cellHasContent(fromData)) {
    return { success: false, updates: {}, error: 'La cella origine è vuota' };
  }

  // Prepara i dati per la destinazione
  const transferData = prepareCellDataForTransfer(fromData, from.categoryId, to.categoryId);

  return {
    success: true,
    updates: {
      [toKey]: transferData // Solo destinazione cambia
    }
  };
};

/**
 * SCAMBIA: Scambia i dati tra origine e destinazione
 */
export const swapCellData = (
  tripData: Record<string, any>,
  from: CellLocation,
  to: CellLocation
): CellOperationResult => {
  const fromKey = getCellKey(from.dayId, from.categoryId);
  const toKey = getCellKey(to.dayId, to.categoryId);

  // Stessa cella, niente da fare
  if (fromKey === toKey) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono la stessa cella' };
  }

  const fromData = tripData[fromKey];
  const toData = tripData[toKey];

  // Almeno una delle due deve avere contenuto
  if (!cellHasContent(fromData) && !cellHasContent(toData)) {
    return { success: false, updates: {}, error: 'Entrambe le celle sono vuote' };
  }

  // Prepara i dati per lo scambio
  const dataForTo = fromData 
    ? prepareCellDataForTransfer(fromData, from.categoryId, to.categoryId)
    : null;
  
  const dataForFrom = toData
    ? prepareCellDataForTransfer(toData, to.categoryId, from.categoryId)
    : null;

  return {
    success: true,
    updates: {
      [fromKey]: dataForFrom,
      [toKey]: dataForTo
    }
  };
};

/**
 * Esegue l'azione richiesta
 */
export const executeCellAction = (
  action: CellAction,
  tripData: Record<string, any>,
  from: CellLocation,
  to: CellLocation
): CellOperationResult => {
  switch (action) {
    case 'move':
      return moveCellData(tripData, from, to);
    case 'copy':
      return copyCellData(tripData, from, to);
    case 'swap':
      return swapCellData(tripData, from, to);
    default:
      return { success: false, updates: {}, error: 'Azione non valida' };
  }
};

/**
 * Verifica se il cambio di categoria richiede un avviso
 */
export const requiresCategoryChangeWarning = (
  fromCategoryId: string,
  toCategoryId: string
): boolean => {
  return fromCategoryId !== toCategoryId;
};

/**
 * Genera il messaggio di warning per cambio categoria
 */
export const getCategoryChangeWarning = (
  fromCategoryLabel: string,
  toCategoryLabel: string
): string => {
  return `Stai spostando da "${fromCategoryLabel}" a "${toCategoryLabel}". Alcuni dati potrebbero essere adattati.`;
};