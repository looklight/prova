// ============================================
// ALTROVE - Costanti
// ============================================

import { rawColors } from '../styles/theme';

// Nomi icone Lucide per le categorie
// Usare con: import { MapPin, Star, Bed } from 'lucide-react'
export type CategoryIconName = 'MapPin' | 'Star' | 'Bed' | 'Lightbulb' | 'Car' | 'Utensils' | 'Wallet' | 'StickyNote';

// Categorie base per il calendario (3 righe)
export const CATEGORIES = [
  { id: 'destinazione', label: 'Destinazione', icon: 'MapPin' as CategoryIconName, color: 'bg-blue-50' },
  { id: 'attivita', label: 'Attività', icon: 'Star' as CategoryIconName, color: 'bg-amber-50' },
  { id: 'pernottamento', label: 'Pernottamento', icon: 'Bed' as CategoryIconName, color: 'bg-emerald-50' }
];

// Categorie legacy (per retrocompatibilità con dati esistenti)
// Queste verranno migrate/mappate alle nuove categorie nel Detail
export const LEGACY_CATEGORIES = [
  { id: 'base', label: 'Luogo', icon: 'MapPin' as CategoryIconName, color: 'bg-gray-100' },
  { id: 'attivita1', label: 'Attività', icon: 'Lightbulb' as CategoryIconName, color: 'bg-green-100' },
  { id: 'attivita2', label: 'Attività', icon: 'Lightbulb' as CategoryIconName, color: 'bg-green-100' },
  { id: 'attivita3', label: 'Attività', icon: 'Lightbulb' as CategoryIconName, color: 'bg-green-100' },
  { id: 'spostamenti1', label: 'Spostamenti', icon: 'Car' as CategoryIconName, color: 'bg-yellow-100' },
  { id: 'spostamenti2', label: 'Spostamenti', icon: 'Car' as CategoryIconName, color: 'bg-yellow-100' },
  { id: 'ristori1', label: 'Ristori', icon: 'Utensils' as CategoryIconName, color: 'bg-orange-100' },
  { id: 'ristori2', label: 'Ristori', icon: 'Utensils' as CategoryIconName, color: 'bg-orange-100' },
  { id: 'pernottamento', label: 'Pernottamento', icon: 'Bed' as CategoryIconName, color: 'bg-blue-100' },
  { id: 'otherExpenses', label: 'Altre Spese', icon: 'Wallet' as CategoryIconName, color: 'bg-teal-100' },
  { id: 'note', label: 'Note', icon: 'StickyNote' as CategoryIconName, color: 'bg-purple-100' }
];

// Mappa per convertire ID legacy -> nuova categoria
export const CATEGORY_MIGRATION_MAP: Record<string, string> = {
  'base': 'destinazione',
  'attivita1': 'attivita',
  'attivita2': 'attivita',
  'attivita3': 'attivita',
  // Le altre categorie legacy vengono gestite nel Detail/Spese
};

// Tipi icone per trasporto
export type TransportIconName = 'Car' | 'Taxi' | 'Plane' | 'Train' | 'X' | 'Bus' | 'Truck' | 'Ship' | 'Bike' | 'Footprints';

// Opzioni di trasporto
export const TRANSPORT_OPTIONS = [
  { value: 'car', icon: 'Car' as TransportIconName, label: 'Auto' },
  { value: 'taxi', icon: 'Taxi' as TransportIconName, label: 'Taxi' },
  { value: 'plane', icon: 'Plane' as TransportIconName, label: 'Aereo' },
  { value: 'train', icon: 'Train' as TransportIconName, label: 'Treno' },
  { value: 'default', icon: 'X' as TransportIconName, label: 'Nessuno' },
  { value: 'bus', icon: 'Bus' as TransportIconName, label: 'Bus' },
  { value: 'van', icon: 'Truck' as TransportIconName, label: 'Van' },
  { value: 'ship', icon: 'Ship' as TransportIconName, label: 'Nave' },
  { value: 'bike', icon: 'Bike' as TransportIconName, label: 'Bici' },
  { value: 'walk', icon: 'Footprints' as TransportIconName, label: 'A piedi' }
];

// Palette colori Altrove - importa da theme per consistenza
// Usa rawColors per avere valori hex diretti (non CSS vars)
export const ALTROVE_COLORS = {
  bg: rawColors.bg,
  bgSubtle: rawColors.bgSubtle,
  bgCard: rawColors.bgCard,
  text: rawColors.text,
  textMuted: rawColors.textMuted,
  textPlaceholder: rawColors.textPlaceholder,
  accent: rawColors.accent,
  accentSoft: rawColors.accentSoft,
  warm: rawColors.warm,
  warmSoft: rawColors.warmSoft,
  success: rawColors.success,
  successSoft: rawColors.successSoft,
  warning: rawColors.warning,
  warningSoft: rawColors.warningSoft,
  border: rawColors.border,
  borderLight: rawColors.borderLight
};

// Colori per destinazioni (usati per il testo colorato)
export const DESTINATION_COLORS: Record<string, string> = {
  // Verranno popolati dinamicamente in base alle destinazioni del viaggio
  // Oppure si può usare un algoritmo per generare colori consistenti
};

// Helper per ottenere il componente icona da usare nei componenti React
// Esempio di utilizzo:
// import { MapPin, Star, Bed } from 'lucide-react';
// const iconMap = { MapPin, Star, Bed };
// const IconComponent = iconMap[category.icon];
// <IconComponent size={16} />