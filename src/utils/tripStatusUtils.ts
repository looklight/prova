/**
 * tripStatusUtils - Utility per determinare lo stato del viaggio
 *
 * Identifica viaggi "correnti" (in corso oggi) e fornisce
 * informazioni sul giorno corrente.
 */

import { calculateDayCost } from './costsUtils';
import { TRANSPORT_TYPES } from './activityTypes';

// Tipi
interface TripDay {
  id: number | string;
  date: Date | string | number;
  number: number;
}

interface TripMember {
  role: 'owner' | 'member';
  status: 'active' | 'left' | 'removed';
}

interface Trip {
  id: string | number;
  name?: string;
  image?: string | null;
  days: TripDay[];
  data: Record<string, unknown>;
  sharing?: {
    members?: Record<string, TripMember>;
  };
}

export interface TransportActivity {
  id: string;
  title: string;
  type: 'flight' | 'train' | 'bus' | 'ferry' | 'car';
  startTime?: string;
  departure?: {
    location?: { name?: string };
    time?: string;
  };
  arrival?: {
    location?: { name?: string };
    time?: string;
  };
}

export interface CurrentTripInfo {
  trip: Trip;
  currentDayIndex: number;
  currentDay: TripDay;
  destination: string;
  expensesToDate: number;
  totalDays: number;
  transports: TransportActivity[];
}

/**
 * Normalizza una data rimuovendo l'orario (imposta a mezzanotte)
 */
const normalizeDate = (date: Date | string | number): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Verifica se un viaggio è "corrente" (oggi è compreso nel range di date)
 */
export const isCurrentTrip = (trip: Trip): boolean => {
  if (!trip.days || trip.days.length === 0) return false;

  const today = normalizeDate(new Date());
  const firstDay = normalizeDate(trip.days[0].date);
  const lastDay = normalizeDate(trip.days[trip.days.length - 1].date);

  return today >= firstDay && today <= lastDay;
};

/**
 * Trova l'indice del giorno corrente nel viaggio
 * Ritorna -1 se oggi non è un giorno del viaggio
 */
export const findCurrentDayIndex = (trip: Trip): number => {
  const today = normalizeDate(new Date());

  return trip.days.findIndex(day => {
    const dayDate = normalizeDate(day.date);
    return dayDate.getTime() === today.getTime();
  });
};

/**
 * Estrae la destinazione del giorno corrente
 */
export const getCurrentDayDestination = (trip: Trip, dayId: string | number): string => {
  const destKey = `${dayId}-destinazione`;
  const destData = trip.data[destKey] as { title?: string } | undefined;
  return destData?.title || '';
};

/**
 * Estrae le attività di trasporto del giorno corrente
 */
export const getCurrentDayTransports = (trip: Trip, dayId: string | number): TransportActivity[] => {
  const activitiesKey = `${dayId}-attivita`;
  const activitiesContainer = trip.data[activitiesKey] as { activities?: TransportActivity[] } | undefined;

  // La struttura corretta è: { activities: Activity[] }
  const activities = activitiesContainer?.activities;
  if (!activities || !Array.isArray(activities)) return [];

  // Filtra solo i tipi trasporto (usa costante centralizzata)
  return activities
    .filter(activity => TRANSPORT_TYPES.includes(activity.type as any))
    .sort((a, b) => {
      // Ordina per orario di partenza
      const timeA = a.departure?.time || a.startTime || '';
      const timeB = b.departure?.time || b.startTime || '';
      return timeA.localeCompare(timeB);
    });
};

/**
 * Calcola le spese sostenute fino al giorno specificato (incluso)
 */
export const calculateExpensesToDate = (
  trip: Trip,
  upToDayIndex: number
): number => {
  let total = 0;
  const tripMembers = trip.sharing?.members || null;

  for (let i = 0; i <= upToDayIndex; i++) {
    const day = trip.days[i];
    total += calculateDayCost(day, trip.data, tripMembers);
  }

  return total;
};

/**
 * Funzione aggregata che ritorna tutte le info sul viaggio corrente
 * Ritorna null se il viaggio non è corrente
 * Ottimizzata per evitare calcoli ridondanti
 */
export const getCurrentTripInfo = (trip: Trip): CurrentTripInfo | null => {
  if (!trip.days || trip.days.length === 0) return null;

  // Calcola oggi una sola volta
  const today = normalizeDate(new Date());
  const firstDay = normalizeDate(trip.days[0].date);
  const lastDay = normalizeDate(trip.days[trip.days.length - 1].date);

  // Verifica se è un viaggio corrente
  if (today < firstDay || today > lastDay) return null;

  // Trova il giorno corrente
  const currentDayIndex = trip.days.findIndex(day => {
    const dayDate = normalizeDate(day.date);
    return dayDate.getTime() === today.getTime();
  });

  if (currentDayIndex === -1) return null;

  const currentDay = trip.days[currentDayIndex];

  return {
    trip,
    currentDayIndex,
    currentDay,
    destination: getCurrentDayDestination(trip, currentDay.id),
    expensesToDate: calculateExpensesToDate(trip, currentDayIndex),
    totalDays: trip.days.length,
    transports: getCurrentDayTransports(trip, currentDay.id)
  };
};
