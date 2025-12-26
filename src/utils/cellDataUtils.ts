/**
 * cellDataUtils.ts
 * 
 * Funzioni per manipolare i dati delle celle nel CalendarView.
 * Gestisce spostamento, copia e scambio di dati tra celle.
 */

export interface CellLocation {
  dayId: number;
  categoryId: string;
  activityIndex?: number; // Indice dell'attività specifica (per righe attività multiple)
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
 * Per le destinazioni, usa un formato speciale: "days:{dayId}:destinations"
 */
export const getCellKey = (dayId: number, categoryId: string): string => {
  if (categoryId === 'destinazione') {
    return `days:${dayId}:destinations`;
  }
  return `${dayId}-${categoryId}`;
};

/**
 * Verifica se una chiave è per una destinazione
 */
export const isDestinationKey = (key: string): boolean => {
  return key.startsWith('days:') && key.endsWith(':destinations');
};

/**
 * Estrae il dayId da una chiave destinazione
 */
export const getDayIdFromDestinationKey = (key: string): number | null => {
  const match = key.match(/^days:(\d+):destinations$/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Verifica se una cella ha contenuto
 * Per le destinazioni, cellData è l'array destinations
 */
export const cellHasContent = (cellData: CellData | string[] | null | undefined): boolean => {
  if (!cellData) return false;

  // Se è un array (destinazioni), verifica se ha elementi
  if (Array.isArray(cellData)) {
    return cellData.length > 0;
  }

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
    (cellData.videos && cellData.videos.length > 0) ||
    ((cellData as any).activities && (cellData as any).activities.length > 0)
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
 * Se activityIndex è specificato, sposta solo quella singola attività
 */
export const moveCellData = (
  tripData: Record<string, any>,
  from: CellLocation,
  to: CellLocation
): CellOperationResult => {
  const fromKey = getCellKey(from.dayId, from.categoryId);
  const toKey = getCellKey(to.dayId, to.categoryId);

  // Stessa cella E stessa attività, niente da fare
  if (fromKey === toKey && from.activityIndex === to.activityIndex) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono la stessa cella' };
  }

  const fromData = tripData[fromKey];
  const toData = tripData[toKey];

  if (!cellHasContent(fromData)) {
    return { success: false, updates: {}, error: 'La cella origine è vuota' };
  }

  // Ogni categoria può essere spostata solo nella stessa categoria
  if (from.categoryId !== to.categoryId) {
    return { success: false, updates: {}, error: 'Puoi spostare solo verso celle della stessa categoria' };
  }

  // Se stiamo spostando una singola attività
  if (from.categoryId === 'attivita' && from.activityIndex !== undefined) {
    const activities = fromData.activities || [];
    const visibleActivities = activities.filter((a: any) => a.showInCalendar === true);
    const activityToMove = visibleActivities[from.activityIndex];

    if (!activityToMove) {
      return { success: false, updates: {}, error: 'Attività non trovata' };
    }

    // Trova l'indice reale nell'array originale
    const realIndex = activities.findIndex((a: any) => a.id === activityToMove.id);

    // Rimuovi l'attività dall'origine
    const newFromActivities = [...activities];
    newFromActivities.splice(realIndex, 1);

    // Aggiungi l'attività alla destinazione
    const toActivities = toData?.activities || [];
    const newToActivities = [...toActivities, { ...activityToMove }];

    return {
      success: true,
      updates: {
        [fromKey]: { ...fromData, activities: newFromActivities },
        [toKey]: { ...(toData || {}), activities: newToActivities }
      }
    };
  }

  // Gestione speciale per destinazioni (sono array di stringhe)
  if (from.categoryId === 'destinazione') {
    return {
      success: true,
      updates: {
        [fromKey]: [], // Svuota origine (array vuoto)
        [toKey]: Array.isArray(fromData) ? [...fromData] : [] // Copia array
      }
    };
  }

  // Comportamento standard per celle non-attività
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
 * Se activityIndex è specificato, copia solo quella singola attività
 */
export const copyCellData = (
  tripData: Record<string, any>,
  from: CellLocation,
  to: CellLocation
): CellOperationResult => {
  const fromKey = getCellKey(from.dayId, from.categoryId);
  const toKey = getCellKey(to.dayId, to.categoryId);

  // Stessa cella E stessa attività, niente da fare
  if (fromKey === toKey && from.activityIndex === to.activityIndex) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono la stessa cella' };
  }

  const fromData = tripData[fromKey];
  const toData = tripData[toKey];

  if (!cellHasContent(fromData)) {
    return { success: false, updates: {}, error: 'La cella origine è vuota' };
  }

  // Ogni categoria può essere copiata solo nella stessa categoria
  if (from.categoryId !== to.categoryId) {
    return { success: false, updates: {}, error: 'Puoi copiare solo verso celle della stessa categoria' };
  }

  // Se stiamo copiando una singola attività
  if (from.categoryId === 'attivita' && from.activityIndex !== undefined) {
    const activities = fromData.activities || [];
    const visibleActivities = activities.filter((a: any) => a.showInCalendar === true);
    const activityToCopy = visibleActivities[from.activityIndex];

    if (!activityToCopy) {
      return { success: false, updates: {}, error: 'Attività non trovata' };
    }

    // Copia l'attività nella destinazione con nuovo ID
    const toActivities = toData?.activities || [];
    const copiedActivity = {
      ...activityToCopy,
      id: `${activityToCopy.id}-copy-${Date.now()}`
    };
    const newToActivities = [...toActivities, copiedActivity];

    return {
      success: true,
      updates: {
        [toKey]: { ...(toData || {}), activities: newToActivities }
      }
    };
  }

  // Gestione speciale per destinazioni (sono array di stringhe)
  if (from.categoryId === 'destinazione') {
    return {
      success: true,
      updates: {
        [toKey]: Array.isArray(fromData) ? [...fromData] : [] // Copia array, origine rimane
      }
    };
  }

  // Comportamento standard per celle non-attività
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
 * Se activityIndex è specificato, scambia solo quelle singole attività
 */
export const swapCellData = (
  tripData: Record<string, any>,
  from: CellLocation,
  to: CellLocation
): CellOperationResult => {
  const fromKey = getCellKey(from.dayId, from.categoryId);
  const toKey = getCellKey(to.dayId, to.categoryId);

  // Stessa cella E stessa attività, niente da fare
  if (fromKey === toKey && from.activityIndex === to.activityIndex) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono la stessa cella' };
  }

  const fromData = tripData[fromKey];
  const toData = tripData[toKey];

  // Ogni categoria può essere scambiata solo con la stessa categoria
  if (from.categoryId !== to.categoryId) {
    return { success: false, updates: {}, error: 'Puoi scambiare solo con celle della stessa categoria' };
  }

  // Se stiamo scambiando singole attività
  if (from.categoryId === 'attivita' && from.activityIndex !== undefined) {
    const fromActivities = fromData?.activities || [];
    const toActivities = toData?.activities || [];

    const fromVisibleActivities = fromActivities.filter((a: any) => a.showInCalendar === true);
    const toVisibleActivities = toActivities.filter((a: any) => a.showInCalendar === true);

    const activityFromSource = fromVisibleActivities[from.activityIndex];
    const activityFromTarget = to.activityIndex !== undefined ? toVisibleActivities[to.activityIndex] : null;

    if (!activityFromSource) {
      return { success: false, updates: {}, error: 'Attività origine non trovata' };
    }

    // Trova indici reali
    const realFromIndex = fromActivities.findIndex((a: any) => a.id === activityFromSource.id);

    // Prepara nuovi array
    const newFromActivities = [...fromActivities];
    const newToActivities = [...toActivities];

    // Rimuovi l'attività dall'origine
    newFromActivities.splice(realFromIndex, 1);

    if (activityFromTarget) {
      // Se c'è un'attività nella destinazione, scambia
      const realToIndex = toActivities.findIndex((a: any) => a.id === activityFromTarget.id);
      newToActivities.splice(realToIndex, 1);
      newFromActivities.push({ ...activityFromTarget });
      newToActivities.push({ ...activityFromSource });
    } else {
      // Se la destinazione è vuota, solo sposta
      newToActivities.push({ ...activityFromSource });
    }

    return {
      success: true,
      updates: {
        [fromKey]: { ...(fromData || {}), activities: newFromActivities },
        [toKey]: { ...(toData || {}), activities: newToActivities }
      }
    };
  }

  // Gestione speciale per destinazioni (sono array di stringhe)
  if (from.categoryId === 'destinazione') {
    const fromArray = Array.isArray(fromData) ? fromData : [];
    const toArray = Array.isArray(toData) ? toData : [];

    // Almeno uno dei due deve avere contenuto
    if (fromArray.length === 0 && toArray.length === 0) {
      return { success: false, updates: {}, error: 'Entrambe le celle sono vuote' };
    }

    return {
      success: true,
      updates: {
        [fromKey]: [...toArray], // Origine riceve contenuto destinazione
        [toKey]: [...fromArray]  // Destinazione riceve contenuto origine
      }
    };
  }

  // Comportamento standard per celle non-attività
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

// ============================================
// OPERAZIONI SU GIORNO INTERO
// ============================================

/** Categorie da includere nelle operazioni su giorno intero */
const FULL_DAY_CATEGORIES = ['destinazione', 'attivita', 'pernottamento'];

/**
 * Verifica se un giorno ha contenuto in almeno una categoria
 */
export const dayHasContent = (
  tripData: Record<string, any>,
  dayId: number
): boolean => {
  for (const categoryId of FULL_DAY_CATEGORIES) {
    const key = getCellKey(dayId, categoryId);
    const data = tripData[key];
    if (cellHasContent(data)) return true;
  }
  return false;
};

/**
 * SPOSTA GIORNO INTERO: Muove tutte le categorie da un giorno all'altro
 */
export const moveFullDay = (
  tripData: Record<string, any>,
  fromDayId: number,
  toDayId: number
): CellOperationResult => {
  if (fromDayId === toDayId) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono lo stesso giorno' };
  }

  if (!dayHasContent(tripData, fromDayId)) {
    return { success: false, updates: {}, error: 'Il giorno origine è vuoto' };
  }

  const updates: Record<string, any> = {};

  for (const categoryId of FULL_DAY_CATEGORIES) {
    const fromKey = getCellKey(fromDayId, categoryId);
    const toKey = getCellKey(toDayId, categoryId);
    const fromData = tripData[fromKey];

    if (cellHasContent(fromData)) {
      // Sposta i dati
      if (categoryId === 'destinazione') {
        updates[toKey] = Array.isArray(fromData) ? [...fromData] : [];
        updates[fromKey] = [];
      } else {
        updates[toKey] = cloneCellData(fromData);
        updates[fromKey] = null;
      }
    }
  }

  return { success: true, updates };
};

/**
 * COPIA GIORNO INTERO: Copia tutte le categorie da un giorno all'altro
 */
export const copyFullDay = (
  tripData: Record<string, any>,
  fromDayId: number,
  toDayId: number
): CellOperationResult => {
  if (fromDayId === toDayId) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono lo stesso giorno' };
  }

  if (!dayHasContent(tripData, fromDayId)) {
    return { success: false, updates: {}, error: 'Il giorno origine è vuoto' };
  }

  const updates: Record<string, any> = {};

  for (const categoryId of FULL_DAY_CATEGORIES) {
    const fromKey = getCellKey(fromDayId, categoryId);
    const toKey = getCellKey(toDayId, categoryId);
    const fromData = tripData[fromKey];

    if (cellHasContent(fromData)) {
      if (categoryId === 'destinazione') {
        updates[toKey] = Array.isArray(fromData) ? [...fromData] : [];
      } else if (categoryId === 'attivita' && fromData.activities) {
        // Copia le attività con nuovi ID
        const copiedActivities = fromData.activities.map((a: any) => ({
          ...a,
          id: `${a.id}-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        updates[toKey] = { ...fromData, activities: copiedActivities };
      } else {
        updates[toKey] = cloneCellData(fromData);
      }
    }
  }

  return { success: true, updates };
};

/**
 * SCAMBIA GIORNO INTERO: Scambia tutte le categorie tra due giorni
 */
export const swapFullDay = (
  tripData: Record<string, any>,
  fromDayId: number,
  toDayId: number
): CellOperationResult => {
  if (fromDayId === toDayId) {
    return { success: false, updates: {}, error: 'Origine e destinazione sono lo stesso giorno' };
  }

  const fromHasContent = dayHasContent(tripData, fromDayId);
  const toHasContent = dayHasContent(tripData, toDayId);

  if (!fromHasContent && !toHasContent) {
    return { success: false, updates: {}, error: 'Entrambi i giorni sono vuoti' };
  }

  const updates: Record<string, any> = {};

  for (const categoryId of FULL_DAY_CATEGORIES) {
    const fromKey = getCellKey(fromDayId, categoryId);
    const toKey = getCellKey(toDayId, categoryId);
    const fromData = tripData[fromKey];
    const toData = tripData[toKey];

    if (categoryId === 'destinazione') {
      updates[fromKey] = Array.isArray(toData) ? [...toData] : [];
      updates[toKey] = Array.isArray(fromData) ? [...fromData] : [];
    } else {
      updates[fromKey] = cellHasContent(toData) ? cloneCellData(toData) : null;
      updates[toKey] = cellHasContent(fromData) ? cloneCellData(fromData) : null;
    }
  }

  return { success: true, updates };
};

/**
 * Esegue l'azione richiesta su un giorno intero
 */
export const executeFullDayAction = (
  action: CellAction,
  tripData: Record<string, any>,
  fromDayId: number,
  toDayId: number
): CellOperationResult => {
  switch (action) {
    case 'move':
      return moveFullDay(tripData, fromDayId, toDayId);
    case 'copy':
      return copyFullDay(tripData, fromDayId, toDayId);
    case 'swap':
      return swapFullDay(tripData, fromDayId, toDayId);
    default:
      return { success: false, updates: {}, error: 'Azione non valida' };
  }
};

// ============================================
// UTILITÀ PER GESTIONE MEDIA
// ============================================

/**
 * Raccoglie tutti i path dei media (immagini e video) da una cella
 * Gestisce sia celle normali che celle attività (con array activities)
 */
export const collectMediaPaths = (cellData: any): string[] => {
  if (!cellData) return [];

  const paths: string[] = [];

  // Helper per estrarre paths da un array di media objects
  const extractPaths = (mediaArray: any[] | undefined) => {
    if (!mediaArray || !Array.isArray(mediaArray)) return;
    for (const item of mediaArray) {
      if (item?.path && typeof item.path === 'string') {
        paths.push(item.path);
      }
    }
  };

  // Se è un array (es. destinazioni), non ha media
  if (Array.isArray(cellData)) {
    return [];
  }

  // Estrai media dalla cella principale
  extractPaths(cellData.images);
  extractPaths(cellData.videos);

  // Se ha activities (cella attività), estrai media da ogni attività
  if (cellData.activities && Array.isArray(cellData.activities)) {
    for (const activity of cellData.activities) {
      extractPaths(activity.images);
      extractPaths(activity.videos);
    }
  }

  return paths;
};

/**
 * Raccoglie tutti i media paths che verranno eliminati/sovrascritti
 * dato un set di updates (da usare prima di applicare gli updates)
 *
 * @param currentData - I dati correnti del trip
 * @param updates - Gli aggiornamenti da applicare
 * @returns Array di paths di media che verranno persi
 */
export const collectOrphanedMediaPaths = (
  currentData: Record<string, any>,
  updates: Record<string, any>
): string[] => {
  const orphanedPaths: string[] = [];

  for (const [key, newValue] of Object.entries(updates)) {
    const currentValue = currentData[key];

    // Se non c'è un valore corrente, niente da pulire
    if (!currentValue) continue;

    // Raccogli media dal valore corrente
    const currentMediaPaths = collectMediaPaths(currentValue);
    if (currentMediaPaths.length === 0) continue;

    // Se il nuovo valore è null/undefined/empty, tutti i media sono orphaned
    if (newValue === null || newValue === undefined) {
      orphanedPaths.push(...currentMediaPaths);
      continue;
    }

    // Se è un array vuoto (destinazioni svuotate), niente media da pulire
    if (Array.isArray(newValue) && newValue.length === 0 && Array.isArray(currentValue)) {
      continue;
    }

    // Raccogli media dal nuovo valore
    const newMediaPaths = collectMediaPaths(newValue);
    const newPathsSet = new Set(newMediaPaths);

    // Media nel vecchio valore che non sono nel nuovo sono orphaned
    for (const path of currentMediaPaths) {
      if (!newPathsSet.has(path)) {
        orphanedPaths.push(path);
      }
    }
  }

  return orphanedPaths;
};