import React from 'react';
import {
  Utensils,
  Car,
  Train,
  Bus,
  Ship,
  Plane,
  Landmark,
  Trees,
  ShoppingBag,
  Lightbulb,
  Sparkles,
  PartyPopper,
  Bed,
  LucideIcon
} from 'lucide-react';

// ============================================
// ALTROVE - Activity Types Configuration
// Mapping centralizzato tipi attività/spese → icone Lucide
// ============================================

export type ActivityType = 'generic' | 'restaurant' | 'car' | 'train' | 'bus' | 'ferry' | 'flight' | 'museum' | 'nature' | 'shopping' | 'experience' | 'fun' | 'accommodation';

export interface ActivityTypeConfig {
  icon: LucideIcon | null;        // Icona mostrata nelle viste (null = nessuna icona)
  selectorIcon: LucideIcon;       // Icona mostrata nel selettore tipi
  label: string;
  color: string;
}

// Configurazione tipi attività con icone Lucide
export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  generic: { icon: null, selectorIcon: Lightbulb, label: 'Generico', color: '#9CA3AF' },              // Grigio (nessuna icona nelle viste)
  restaurant: { icon: Utensils, selectorIcon: Utensils, label: 'Cibo', color: '#D4948A' },            // Rosa antico
  car: { icon: Car, selectorIcon: Car, label: 'Auto', color: '#6B8E9F' },                             // Blu grigio
  train: { icon: Train, selectorIcon: Train, label: 'Treno', color: '#7EB5A6' },                      // Salvia
  bus: { icon: Bus, selectorIcon: Bus, label: 'Bus', color: '#8BA6A6' },                              // Verde grigio
  ferry: { icon: Ship, selectorIcon: Ship, label: 'Traghetto', color: '#5B9BD5' },                    // Blu mare
  flight: { icon: Plane, selectorIcon: Plane, label: 'Volo', color: '#8BB8C9' },                      // Cielo
  museum: { icon: Landmark, selectorIcon: Landmark, label: 'Museo/Cultura', color: '#A89EC9' },       // Lavanda
  nature: { icon: Trees, selectorIcon: Trees, label: 'Natura', color: '#7CB892' },                    // Verde fresco
  shopping: { icon: ShoppingBag, selectorIcon: ShoppingBag, label: 'Shopping', color: '#D4A5B9' },    // Rosa cipria
  experience: { icon: Sparkles, selectorIcon: Sparkles, label: 'Esperienze', color: '#E8B86D' },      // Oro caldo
  fun: { icon: PartyPopper, selectorIcon: PartyPopper, label: 'Divertimento', color: '#E57373' },     // Rosso corallo
  accommodation: { icon: Bed, selectorIcon: Bed, label: 'Pernottamento', color: '#7EB5A6' }           // Salvia (come success)
};

// Helper per ottenere la configurazione di un tipo (con fallback a generic)
export const getActivityTypeConfig = (type?: string): ActivityTypeConfig => {
  if (!type || !(type in ACTIVITY_TYPE_CONFIG)) {
    return ACTIVITY_TYPE_CONFIG.generic;
  }
  return ACTIVITY_TYPE_CONFIG[type as ActivityType];
};

// Componente icona attività riutilizzabile
interface ActivityTypeIconProps {
  type?: string;
  size?: number;
  className?: string;
  showColor?: boolean; // true = usa colore del tipo, false = inherit
  calendarOnly?: boolean; // true = mostra solo icone trasporto/ristorante (per vista calendario)
}

export const ActivityTypeIcon: React.FC<ActivityTypeIconProps> = ({
  type,
  size = 16,
  className = '',
  showColor = true,
  calendarOnly = false
}) => {
  const config = getActivityTypeConfig(type);
  const IconComponent = config.icon;

  // Se non c'è icona (es. tipo "generic"), non renderizza nulla
  if (!IconComponent) {
    return null;
  }

  // In modalità calendario, mostra solo trasporti e ristoranti
  if (calendarOnly && !CALENDAR_ICON_TYPES.includes(type as ActivityType)) {
    return null;
  }

  return (
    <IconComponent
      size={size}
      className={className}
      style={showColor ? { color: config.color } : undefined}
    />
  );
};

// Lista completa tipi (per selettore spese - include pernottamento)
export const ACTIVITY_TYPES_LIST = Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => ({
  value: key as ActivityType,
  ...config
}));

// Lista tipi per selettore attività (esclude pernottamento - ha già categoria dedicata)
export const ACTIVITY_TYPES_FOR_SELECTOR = ACTIVITY_TYPES_LIST.filter(
  type => type.value !== 'accommodation'
);

// Tipi trasporto che usano layout partenza/arrivo
export const TRANSPORT_TYPES: ActivityType[] = ['flight', 'train', 'bus', 'ferry', 'car'];

// Tipi che mostrano icona nel calendario (trasporti + ristoranti)
export const CALENDAR_ICON_TYPES: ActivityType[] = ['flight', 'train', 'bus', 'ferry', 'car', 'restaurant'];

// Helper per verificare se è un tipo trasporto
export const isTransportType = (type?: ActivityType | string): boolean => {
  if (!type) return false;
  return TRANSPORT_TYPES.includes(type as ActivityType);
};

// Helper per verificare se il tipo mostra icona nel calendario
export const showsIconInCalendar = (type?: ActivityType | string): boolean => {
  if (!type) return false;
  return CALENDAR_ICON_TYPES.includes(type as ActivityType);
};
