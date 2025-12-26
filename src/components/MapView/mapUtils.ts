/**
 * mapUtils.ts
 *
 * Utility per estrarre e ordinare i marker dalla struttura trip.data
 * per la visualizzazione sulla mappa.
 *
 * Supporta sia la nuova struttura (attivita array, pernottamento, destinazione)
 * che le categorie legacy per retrocompatibilità.
 */

import { rawColors } from '../../styles/theme';

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
  icon?: ActivityIconType; // Identificatore icona Lucide
  order: number;
  isWaypoint: boolean;
  parentCategoryId?: string;
  dayId: number;
  dayNumber: number;
  // Campi extra per popup informativi
  time?: string;           // Orario (es. "10:00" o "14:30 - 16:00")
  isBooked?: boolean;      // Se prenotato (bookingStatus === 'yes')
  activityType?: string;   // Tipo attività originale
}

export interface MapRoute {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color: string;
  icon?: ActivityIconType; // Identificatore icona Lucide
  label?: string;          // Nome dell'attività
  activityType: string;    // Tipo trasporto (flight, car, transport, etc.)
  dashed?: boolean;        // Linea tratteggiata per voli
}

export interface DayPinsResult {
  pins: MapPin[];
  routes: MapRoute[];
}

// Tipo di icona per il CalendarView
export type MapIconType = 'none' | 'gray' | 'blue';

// Colori per categoria (hex) - usa theme colors dove possibile
const CATEGORY_COLORS: Record<string, string> = {
  'destinazione': rawColors.accent,    // Salvia menta
  'attivita': '#F59E0B',               // amber-500
  'pernottamento': rawColors.success,  // Verde
  // Legacy colors
  'base': '#6B7280',
  'attivita1': '#22C55E',
  'attivita2': '#3B82F6',
  'attivita3': '#8B5CF6',
  'ristori1': '#F97316',
  'ristori2': '#F97316',
  'spostamenti1': '#EAB308',
  'spostamenti2': '#EAB308',
};

// Tipo di icona per attività (usato per SVG Lucide)
export type ActivityIconType =
  | 'generic' | 'restaurant' | 'museum' | 'nature' | 'beach'
  | 'shopping' | 'entertainment' | 'sport' | 'flight' | 'train' | 'bus' | 'ferry' | 'car' | 'bed';

// Mappa tipo attività -> identificatore icona
const ACTIVITY_TYPE_ICON: Record<string, ActivityIconType> = {
  'generic': 'generic',
  'restaurant': 'restaurant',
  'museum': 'museum',
  'nature': 'nature',
  'beach': 'beach',
  'shopping': 'shopping',
  'entertainment': 'entertainment',
  'sport': 'sport',
  'flight': 'flight',
  'train': 'train',
  'bus': 'bus',
  'ferry': 'ferry',
  'car': 'car',
};

// Colori distintivi per ogni tipo di attività
const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  'generic': '#6B7280',     // gray-500
  'restaurant': '#F97316',  // orange-500
  'museum': '#8B5CF6',      // violet-500
  'nature': '#22C55E',      // green-500
  'beach': '#06B6D4',       // cyan-500
  'shopping': '#EC4899',    // pink-500
  'entertainment': '#A855F7', // purple-500
  'sport': '#EAB308',       // yellow-500
  'flight': '#3B82F6',      // blue-500
  'train': '#7EB5A6',       // salvia
  'bus': '#8BA6A6',         // verde grigio
  'ferry': '#5B9BD5',       // blu mare
  'car': '#F59E0B',         // amber-500
  'bed': '#10B981',         // emerald-500 (pernottamento)
};

// Colori per tipo trasporto (per le linee)
const TRANSPORT_ROUTE_COLORS: Record<string, string> = {
  'flight': '#3B82F6',    // blue-500 - voli
  'train': '#7EB5A6',     // salvia - treno
  'bus': '#8BA6A6',       // verde grigio - bus
  'ferry': '#5B9BD5',     // blu mare - traghetto
  'car': '#F59E0B',       // amber-500 - auto
};

// Tipi di attività che sono trasporti (hanno partenza/arrivo)
const TRANSPORT_ACTIVITY_TYPES = ['flight', 'train', 'bus', 'ferry', 'car'];

/**
 * Ottiene il colore per una categoria
 */
const getCategoryColor = (categoryId: string): string => {
  return CATEGORY_COLORS[categoryId] || '#6B7280';
};

/**
 * Ottiene l'identificatore icona per un tipo di attività
 */
const getActivityIcon = (activityType?: string): ActivityIconType | undefined => {
  if (!activityType) return undefined;
  return ACTIVITY_TYPE_ICON[activityType];
};

/**
 * Ottiene il colore per un tipo di attività
 */
const getActivityColor = (activityType?: string): string => {
  if (!activityType) return ACTIVITY_TYPE_COLORS.generic;
  return ACTIVITY_TYPE_COLORS[activityType] || ACTIVITY_TYPE_COLORS.generic;
};

/**
 * Estrae i pin per un singolo giorno
 * Supporta la nuova struttura (attivita array, pernottamento) e legacy
 * Restituisce sia pins che routes (per trasporti con partenza/arrivo)
 */
export const extractDayPins = (
  tripData: Record<string, any>,
  dayId: number,
  dayNumber: number,
  _includeBase: boolean = false // Parametro mantenuto per retrocompatibilità
): DayPinsResult => {
  const pins: MapPin[] = [];
  const routes: MapRoute[] = [];
  let orderCounter = 1;

  // === 1. Estrai pin dalle ATTIVITÀ (nuova struttura: { activities: [...] }) ===
  const activitiesKey = `${dayId}-attivita`;
  const activitiesContainer = tripData[activitiesKey];
  const activitiesData = activitiesContainer?.activities;

  if (Array.isArray(activitiesData)) {
    for (const activity of activitiesData) {
      const isTransport = TRANSPORT_ACTIVITY_TYPES.includes(activity.type);

      // Location principale dell'attività (per attività non-trasporto)
      if (activity.location?.coordinates && !isTransport) {
        // Costruisci stringa orario
        let timeStr: string | undefined;
        if (activity.startTime && activity.endTime) {
          timeStr = `${activity.startTime} - ${activity.endTime}`;
        } else if (activity.startTime) {
          timeStr = activity.startTime;
        } else if (activity.time) {
          timeStr = activity.time;
        }

        pins.push({
          id: `${activitiesKey}-${activity.id}`,
          name: activity.title || 'Attività',
          coordinates: activity.location.coordinates,
          categoryId: 'attivita',
          categoryLabel: 'Attività',
          color: getActivityColor(activity.type),
          icon: getActivityIcon(activity.type),
          order: orderCounter++,
          isWaypoint: false,
          dayId,
          dayNumber,
          // Extra info
          time: timeStr,
          isBooked: activity.bookingStatus === 'yes',
          activityType: activity.type
        });
      }

      // Per attività di tipo trasporto: departure e arrival + route
      const hasDeparture = activity.departure?.location?.coordinates;
      const hasArrival = activity.arrival?.location?.coordinates;

      if (hasDeparture) {
        const routeColor = TRANSPORT_ROUTE_COLORS[activity.type] || getCategoryColor('attivita');
        pins.push({
          id: `${activitiesKey}-${activity.id}-dep`,
          name: activity.departure.location.name || activity.title || 'Partenza',
          coordinates: activity.departure.location.coordinates,
          categoryId: 'attivita',
          categoryLabel: 'Partenza',
          color: routeColor,
          icon: getActivityIcon(activity.type),
          order: orderCounter++,
          isWaypoint: false,
          dayId,
          dayNumber,
          // Extra info per trasporti
          time: activity.departure.time || activity.startTime,
          isBooked: activity.bookingStatus === 'yes',
          activityType: activity.type
        });
      }

      if (hasArrival) {
        const routeColor = TRANSPORT_ROUTE_COLORS[activity.type] || getCategoryColor('attivita');
        pins.push({
          id: `${activitiesKey}-${activity.id}-arr`,
          name: activity.arrival.location.name || activity.title || 'Arrivo',
          coordinates: activity.arrival.location.coordinates,
          categoryId: 'attivita',
          categoryLabel: 'Arrivo',
          color: routeColor,
          icon: getActivityIcon(activity.type),
          order: orderCounter++,
          isWaypoint: false,
          dayId,
          dayNumber,
          // Extra info per trasporti
          time: activity.arrival.time || activity.endTime,
          isBooked: activity.bookingStatus === 'yes',
          activityType: activity.type
        });
      }

      // Crea la route se ci sono entrambi i punti
      if (hasDeparture && hasArrival) {
        const routeColor = TRANSPORT_ROUTE_COLORS[activity.type] || '#6B7280';
        routes.push({
          id: `route-${activity.id}`,
          from: activity.departure.location.coordinates,
          to: activity.arrival.location.coordinates,
          color: routeColor,
          icon: getActivityIcon(activity.type),
          label: activity.title,
          activityType: activity.type,
          dashed: activity.type === 'flight' // Linea tratteggiata per i voli
        });
      }
    }
  }

  // === 2. Estrai pin dal PERNOTTAMENTO ===
  const accommodationKey = `${dayId}-pernottamento`;
  const accommodationData = tripData[accommodationKey];

  if (accommodationData?.location?.coordinates) {
    pins.push({
      id: `${accommodationKey}-main`,
      name: accommodationData.title || 'Pernottamento',
      coordinates: accommodationData.location.coordinates,
      categoryId: 'pernottamento',
      categoryLabel: 'Pernottamento',
      color: getActivityColor('bed'),
      icon: 'bed',
      order: orderCounter++,
      isWaypoint: false,
      dayId,
      dayNumber,
      // Extra info per pernottamento
      time: accommodationData.startTime, // Check-in
      isBooked: accommodationData.bookingStatus === 'yes',
      activityType: 'bed'
    });
  }

  // === 3. Legacy: supporta anche le vecchie categorie ===
  const legacyCategories = [
    'base', 'attivita1', 'attivita2', 'attivita3',
    'ristori1', 'ristori2', 'spostamenti1', 'spostamenti2'
  ];

  for (const categoryId of legacyCategories) {
    const key = `${dayId}-${categoryId}`;
    const cellData = tripData[key];

    if (!cellData?.location?.coordinates) continue;

    const color = getCategoryColor(categoryId);

    pins.push({
      id: `${key}-main`,
      name: cellData.title || cellData.location.name || categoryId,
      coordinates: cellData.location.coordinates,
      categoryId,
      categoryLabel: categoryId,
      color,
      order: orderCounter++,
      isWaypoint: false,
      dayId,
      dayNumber
    });

    // Waypoints legacy
    if (Array.isArray(cellData.waypoints)) {
      for (const waypoint of cellData.waypoints) {
        if (waypoint.location?.coordinates && waypoint.name?.trim()) {
          pins.push({
            id: `${key}-wp-${waypoint.id}`,
            name: waypoint.name,
            coordinates: waypoint.location.coordinates,
            categoryId,
            categoryLabel: categoryId,
            color,
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

  return { pins, routes };
};

/**
 * Estrae i pin per più giorni (vista multi-giorno / viaggio)
 * Mostra le destinazioni con geotag dal metadata del viaggio
 */
export const extractMultiDayPins = (
  tripData: Record<string, any>,
  days: Array<{ id: number; number: number; date?: string; destinations?: string[] }>,
  tripMetadata?: { destinations?: Array<{ name: string; coordinates?: { lat: number; lng: number } }> }
): MapPin[] => {
  const pins: MapPin[] = [];
  let orderCounter = 1;

  // Mappa delle destinazioni con coordinate dal metadata
  const destinationsWithCoords = new Map<string, { lat: number; lng: number }>();

  if (tripMetadata?.destinations) {
    for (const dest of tripMetadata.destinations) {
      if (dest.coordinates && dest.name) {
        destinationsWithCoords.set(dest.name.toLowerCase(), dest.coordinates);
      }
    }
  }

  // Per ogni giorno, cerca le sue destinazioni
  for (const day of days) {
    const dayDestinations = day.destinations || [];

    for (const destName of dayDestinations) {
      const coords = destinationsWithCoords.get(destName.toLowerCase());

      if (coords) {
        // Evita duplicati: controlla se questo pin esiste già
        const pinId = `dest-${destName.toLowerCase().replace(/\s+/g, '-')}`;
        const existingPin = pins.find(p => p.id === pinId);

        if (!existingPin) {
          pins.push({
            id: pinId,
            name: destName,
            coordinates: coords,
            categoryId: 'destinazione',
            categoryLabel: 'Destinazione',
            color: getCategoryColor('destinazione'),
            icon: 'generic',
            order: orderCounter++,
            isWaypoint: false,
            dayId: day.id,
            dayNumber: day.number
          });
        }
      }
    }
  }

  // Fallback: se non ci sono destinazioni nel nuovo formato, prova il legacy 'base'
  if (pins.length === 0) {
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
 * Verifica se un giorno ha almeno un pin con location (attività o pernottamento)
 */
export const dayHasNonBaseLocations = (
  tripData: Record<string, any>,
  dayId: number
): boolean => {
  // Controlla attività (nuova struttura: { activities: [...] })
  const activitiesContainer = tripData[`${dayId}-attivita`];
  const activitiesData = activitiesContainer?.activities;
  if (Array.isArray(activitiesData)) {
    for (const activity of activitiesData) {
      if (activity.location?.coordinates) return true;
      if (activity.departure?.location?.coordinates) return true;
      if (activity.arrival?.location?.coordinates) return true;
    }
  }

  // Controlla pernottamento
  const accommodationData = tripData[`${dayId}-pernottamento`];
  if (accommodationData?.location?.coordinates) return true;

  // Legacy: controlla vecchie categorie
  const legacyCategories = [
    'attivita1', 'attivita2', 'attivita3',
    'ristori1', 'ristori2', 'spostamenti1', 'spostamenti2'
  ];

  for (const categoryId of legacyCategories) {
    const cellData = tripData[`${dayId}-${categoryId}`];
    if (cellData?.location?.coordinates) return true;
    if (cellData?.waypoints?.some((wp: any) => wp.location?.coordinates)) return true;
  }

  return false;
};

/**
 * Verifica se un giorno ha una destinazione con geotag
 */
export const dayHasDestinationLocation = (
  day: { destinations?: string[] },
  tripMetadata?: { destinations?: Array<{ name: string; coordinates?: { lat: number; lng: number } }> }
): boolean => {
  if (!day.destinations?.length || !tripMetadata?.destinations?.length) {
    return false;
  }

  const destinationsWithCoords = new Set(
    tripMetadata.destinations
      .filter(d => d.coordinates)
      .map(d => d.name.toLowerCase())
  );

  return day.destinations.some(name =>
    destinationsWithCoords.has(name.toLowerCase())
  );
};

/**
 * Verifica se un giorno ha la location base (legacy)
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
  dayId: number,
  day?: { destinations?: string[] },
  tripMetadata?: { destinations?: Array<{ name: string; coordinates?: { lat: number; lng: number } }> }
): boolean => {
  // Controlla destinazioni con geotag
  if (day && tripMetadata && dayHasDestinationLocation(day, tripMetadata)) {
    return true;
  }
  // Controlla legacy base e nuove categorie
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