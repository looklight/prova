/**
 * mapUtils.ts
 * 
 * Utility per estrarre e ordinare i marker dalla struttura trip.data
 * per la visualizzazione sulla mappa.
 */

import { CATEGORIES, TRANSPORT_OPTIONS } from '../../utils/constants';

export interface MapPin {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  categoryId: string;
  categoryLabel: string;
  color: string;           // Colore del pin
  icon?: string;           // Emoji opzionale (solo per trasporti e pernottamento)
  order: number;
  isWaypoint: boolean;
  parentCategoryId?: string;
  dayId: number;
  dayNumber: number;
}

// Tipo di icona per il CalendarView
export type MapIconType = 'none' | 'gray' | 'blue';

// Ordine delle categorie per la visualizzazione giornaliera
const DAY_VIEW_ORDER = [
  'attivita1',
  'ristori1',
  'spostamenti1',
  'attivita2',
  'ristori2',
  'spostamenti2',
  'attivita3',
  'pernottamento'
];

// Colori per categoria (hex)
const CATEGORY_COLORS: Record<string, string> = {
  'base': '#6B7280',        // gray-500
  'attivita1': '#22C55E',   // green-500
  'attivita2': '#3B82F6',   // blue-500
  'attivita3': '#8B5CF6',   // violet-500
  'ristori1': '#F97316',    // orange-500
  'ristori2': '#F97316',    // orange-500
  'spostamenti1': '#EAB308', // yellow-500
  'spostamenti2': '#EAB308', // yellow-500
  'pernottamento': '#6366F1', // indigo-500
};

/**
 * Ottiene l'emoji per il trasporto
 */
const getTransportEmoji = (transportMode: string): string => {
  const transport = TRANSPORT_OPTIONS.find(t => t.value === transportMode);
  return transport?.emoji || '🚗';
};

/**
 * Ottiene il colore per una categoria
 */
const getCategoryColor = (categoryId: string): string => {
  return CATEGORY_COLORS[categoryId] || '#6B7280';
};

/**
 * Ottiene l'icona (emoji) per una categoria - solo per spostamenti e pernottamento
 */
const getCategoryIcon = (categoryId: string, cellData: any): string | undefined => {
  if (categoryId.startsWith('spostamenti') && cellData?.transportMode) {
    return getTransportEmoji(cellData.transportMode);
  }
  if (categoryId === 'pernottamento') {
    return '🛏️';
  }
  return undefined;
};

/**
 * Ottiene il label della categoria
 */
const getCategoryLabel = (categoryId: string): string => {
  const category = CATEGORIES.find(c => c.id === categoryId);
  return category?.label || categoryId;
};

/**
 * Estrae i pin per un singolo giorno
 */
export const extractDayPins = (
  tripData: Record<string, any>,
  dayId: number,
  dayNumber: number,
  includeBase: boolean = false
): MapPin[] => {
  const pins: MapPin[] = [];
  let orderCounter = 1;

  const categoriesToProcess = includeBase 
    ? ['base', ...DAY_VIEW_ORDER]
    : DAY_VIEW_ORDER;

  for (const categoryId of categoriesToProcess) {
    const key = `${dayId}-${categoryId}`;
    const cellData = tripData[key];

    if (!cellData) continue;

    const color = getCategoryColor(categoryId);
    const icon = getCategoryIcon(categoryId, cellData);

    // Aggiungi location principale della categoria
    if (cellData.location?.coordinates) {
      pins.push({
        id: `${key}-main`,
        name: cellData.title || cellData.location.name || getCategoryLabel(categoryId),
        coordinates: cellData.location.coordinates,
        categoryId,
        categoryLabel: getCategoryLabel(categoryId),
        color,
        icon,
        order: orderCounter++,
        isWaypoint: false,
        dayId,
        dayNumber
      });
    }

    // Aggiungi waypoints della categoria (stesso colore della categoria padre)
    if (cellData.waypoints && Array.isArray(cellData.waypoints)) {
      for (const waypoint of cellData.waypoints) {
        if (waypoint.location?.coordinates && waypoint.name?.trim()) {
          pins.push({
            id: `${key}-wp-${waypoint.id}`,
            name: waypoint.name,
            coordinates: waypoint.location.coordinates,
            categoryId,
            categoryLabel: getCategoryLabel(categoryId),
            color,
            icon, // Waypoints ereditano l'icona (se presente)
            order: orderCounter++,
            isWaypoint: true,
            parentCategoryId: categoryId,
            dayId,
            dayNumber
          });
        }
      }
    }
  }

  return pins;
};

/**
 * Estrae i pin per più giorni (vista multi-giorno)
 * Mostra solo le location 'base' di ogni giorno
 */
export const extractMultiDayPins = (
  tripData: Record<string, any>,
  days: Array<{ id: number; number: number; date?: string }>
): MapPin[] => {
  const pins: MapPin[] = [];

  for (const day of days) {
    const key = `${day.id}-base`;
    const cellData = tripData[key];

    if (cellData?.location?.coordinates) {
      pins.push({
        id: `${key}-base`,
        name: cellData.title || cellData.location.name || `Giorno ${day.number}`,
        coordinates: cellData.location.coordinates,
        categoryId: 'base',
        categoryLabel: `Giorno ${day.number}`,
        color: getCategoryColor('base'),
        order: day.number,
        isWaypoint: false,
        dayId: day.id,
        dayNumber: day.number
      });
    }
  }

  return pins;
};

/**
 * Calcola i bounds per centrare la mappa su tutti i pin
 */
export const calculateBounds = (
  pins: MapPin[]
): [[number, number], [number, number]] | null => {
  if (pins.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const pin of pins) {
    const { lat, lng } = pin.coordinates;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

  return [
    [minLat - latPadding, minLng - lngPadding],
    [maxLat + latPadding, maxLng + lngPadding]
  ];
};

/**
 * Verifica se un giorno ha almeno un pin con location (escluso base)
 */
export const dayHasNonBaseLocations = (
  tripData: Record<string, any>,
  dayId: number
): boolean => {
  for (const categoryId of DAY_VIEW_ORDER) {
    const key = `${dayId}-${categoryId}`;
    const cellData = tripData[key];

    if (cellData?.location?.coordinates) {
      return true;
    }

    if (cellData?.waypoints?.some((wp: any) => wp.location?.coordinates)) {
      return true;
    }
  }

  return false;
};

/**
 * Verifica se un giorno ha la location base
 */
export const dayHasBaseLocation = (
  tripData: Record<string, any>,
  dayId: number
): boolean => {
  const key = `${dayId}-base`;
  const cellData = tripData[key];
  return !!cellData?.location?.coordinates;
};

/**
 * Determina il tipo di icona mappa da mostrare nel CalendarView
 * 
 * - 'none': nessun pin → niente icona
 * - 'gray': solo pin base (Luogo) → icona grigia → vista multi-giorno
 * - 'blue': almeno 1 pin di altre categorie → icona blu → vista giornaliera
 */
export const getMapIconType = (
  tripData: Record<string, any>,
  dayId: number
): MapIconType => {
  const hasNonBase = dayHasNonBaseLocations(tripData, dayId);
  
  if (hasNonBase) {
    return 'blue';
  }
  
  const hasBase = dayHasBaseLocation(tripData, dayId);
  
  if (hasBase) {
    return 'gray';
  }
  
  return 'none';
};

/**
 * Verifica se un giorno ha almeno una location (qualsiasi)
 */
export const dayHasLocations = (
  tripData: Record<string, any>,
  dayId: number
): boolean => {
  return dayHasBaseLocation(tripData, dayId) || dayHasNonBaseLocations(tripData, dayId);
};

/**
 * Conta il numero totale di location per un giorno
 */
export const countDayLocations = (
  tripData: Record<string, any>,
  dayId: number
): number => {
  const pins = extractDayPins(tripData, dayId, 0, true);
  return pins.length;
};