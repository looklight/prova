/* ============================================
   ALTROVE - Design System Theme
   Import: import { colors, spacing, ... } from '@/styles/theme'
   
   🎨 Palette: Vivace & Moderna con gradienti sottili
   ============================================ */

// ============================================
// COLORS
// ============================================

export const colors = {
  // Primary / Accent - Turchese Brillante
  accent: 'var(--color-accent)',
  accentDark: 'var(--color-accent-dark)',
  accentSoft: 'var(--color-accent-soft)',

  // Success - Verde Smeraldo
  success: 'var(--color-success)',
  successSoft: 'var(--color-success-soft)',

  // Warning - Giallo Oro
  warning: 'var(--color-warning)',
  warningSoft: 'var(--color-warning-soft)',

  // Warm / Error - Corallo Energico
  warm: 'var(--color-warm)',
  warmSoft: 'var(--color-warm-soft)',

  // Action - Blu per azioni
  action: 'var(--color-action)',
  actionDark: 'var(--color-action-dark)',
  actionSoft: 'var(--color-action-soft)',

  // Danger - Rosso per eliminazione
  danger: 'var(--color-danger)',
  dangerDark: 'var(--color-danger-dark)',
  dangerSoft: 'var(--color-danger-soft)',

  // Backgrounds
  bg: 'var(--color-bg)',
  bgCard: 'var(--color-bg-card)',
  bgSubtle: 'var(--color-bg-subtle)',

  // Backgrounds - Warm
  bgWarm: 'var(--color-bg-warm)',
  bgWarmSubtle: 'var(--color-bg-warm-subtle)',
  bgWarmCard: 'var(--color-bg-warm-card)',

  // Text
  text: 'var(--color-text)',
  textMuted: 'var(--color-text-muted)',
  textPlaceholder: 'var(--color-text-placeholder)',
  
  // Borders
  border: 'var(--color-border)',
  borderLight: 'var(--color-border-light)',
} as const;

// Valori raw per quando servono i valori effettivi (es. SVG, canvas)
// 🎨 Palette: Vivace & Moderna
export const rawColors = {
  // Primary / Accent - Turchese Brillante
  accent: '#4ECDC4',
  accentDark: '#3DBDB5',
  accentSoft: '#E0F7F6',

  // Success - Verde Smeraldo
  success: '#2ECC71',
  successDark: '#27AE60',
  successSoft: '#E8F8F0',

  // Warning - Giallo Oro
  warning: '#F1C40F',
  warningDark: '#D4AC0D',
  warningSoft: '#FEF9E7',

  // Warm / Error - Corallo Energico
  warm: '#FF6B6B',
  warmDark: '#EE5A5A',
  warmSoft: '#FFE8E8',

  // Error alias
  error: '#FF6B6B',
  errorDark: '#EE5A5A',
  errorSoft: '#FFE8E8',

  // Action colors (per bottoni azione come Sposta)
  action: '#3B82F6',
  actionDark: '#2563EB',
  actionSoft: '#DBEAFE',

  // Danger (per eliminazione)
  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerSoft: '#FEE2E2',

  // Backgrounds - Neutro & Pulito
  bg: '#FAFAFA',
  bgCard: '#FFFFFF',
  bgSubtle: '#F5F5F5',

  // Backgrounds - Warm (header, toolbar) - più sottile
  bgWarm: '#F8F8F8',
  bgWarmSubtle: '#EFEFEF',
  bgWarmCard: '#FFFFFF',

  // Text - Scuro per contrasto
  text: '#2D3436',
  textMuted: '#636E72',
  textPlaceholder: '#B2BEC3',

  // Text - Warm (per aree con sfondo caldo)
  textWarm: '#2D3436',
  textWarmMuted: '#636E72',

  // Borders
  border: '#E0E0E0',
  borderLight: '#EEEEEE',
} as const;

// ============================================
// GRADIENTS - Novità!
// ============================================

export const gradients = {
  // Accent gradient (bottoni primari)
  accent: 'linear-gradient(135deg, #4ECDC4 0%, #3DBDB5 100%)',
  
  // Success gradient
  success: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
  
  // Warning gradient  
  warning: 'linear-gradient(135deg, #F1C40F 0%, #F39C12 100%)',
  
  // Warm/Error gradient
  warm: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%)',
  
  // Card "oggi" o selezionata
  cardHighlight: 'linear-gradient(135deg, #FFE8E8 0%, #FFFFFF 50%, #E0F7F6 100%)',
  
  // Card hover subtle
  cardHover: 'linear-gradient(135deg, #FAFAFA 0%, #FFFFFF 100%)',
  
  // Badge accent
  badgeAccent: 'linear-gradient(135deg, #4ECDC4 0%, #2ECC71 100%)',
} as const;

// ============================================
// SHADOWS - Con colore!
// ============================================

export const shadows = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
} as const;

// Shadows colorate per effetto "glow"
export const glowShadows = {
  accent: `0 4px 14px rgba(78, 205, 196, 0.35)`,
  accentStrong: `0 8px 24px rgba(78, 205, 196, 0.45)`,
  success: `0 4px 14px rgba(46, 204, 113, 0.35)`,
  warning: `0 4px 14px rgba(241, 196, 15, 0.35)`,
  warm: `0 4px 14px rgba(255, 107, 107, 0.35)`,
  action: `0 4px 14px rgba(59, 130, 246, 0.35)`,
  danger: `0 4px 14px rgba(239, 68, 68, 0.35)`,
  card: `0 4px 12px rgba(0, 0, 0, 0.08)`,
  cardHover: `0 8px 24px rgba(78, 205, 196, 0.2), 0 4px 8px rgba(0, 0, 0, 0.05)`,
  cardSelected: `0 8px 24px rgba(78, 205, 196, 0.35), 0 4px 8px rgba(0, 0, 0, 0.08)`,
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  xs: 'var(--space-xs)',
  sm: 'var(--space-sm)',
  md: 'var(--space-md)',
  lg: 'var(--space-lg)',
  xl: 'var(--space-xl)',
  '2xl': 'var(--space-2xl)',
} as const;

export const rawSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  full: 'var(--radius-full)',
} as const;

export const rawRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamily: 'var(--font-family)',
  
  fontSize: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
    '3xl': 'var(--font-size-3xl)',
  },
  
  fontWeight: {
    normal: 'var(--font-weight-normal)',
    medium: 'var(--font-weight-medium)',
    semibold: 'var(--font-weight-semibold)',
    bold: 'var(--font-weight-bold)',
  },
  
  lineHeight: {
    tight: 'var(--line-height-tight)',
    normal: 'var(--line-height-normal)',
    relaxed: 'var(--line-height-relaxed)',
  },
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  fast: 'var(--transition-fast)',
  normal: 'var(--transition-normal)',
  slow: 'var(--transition-slow)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Per animazioni "playful"
} as const;

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  dropdown: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;

// ============================================
// SAFE AREAS (iOS/Android)
// ============================================

export const safeAreas = {
  top: 'var(--safe-area-top)',
  bottom: 'var(--safe-area-bottom)',
  left: 'var(--safe-area-left)',
  right: 'var(--safe-area-right)',
} as const;

// ============================================
// THEME OBJECT (tutto insieme)
// ============================================

export const theme = {
  colors,
  rawColors,
  gradients,
  spacing,
  rawSpacing,
  radius,
  rawRadius,
  shadows,
  glowShadows,
  typography,
  transitions,
  zIndex,
  safeAreas,
} as const;

// ============================================
// TYPES
// ============================================

export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeRadius = typeof radius;
export type ThemeShadows = typeof shadows;
export type ThemeGradients = typeof gradients;
export type ThemeGlowShadows = typeof glowShadows;
export type Theme = typeof theme;

// ============================================
// RETROCOMPATIBILITÀ con ALTROVE_COLORS
// ============================================

export const ALTROVE_COLORS = rawColors;

// ============================================
// RE-EXPORT ANIMATIONS
// ============================================

export {
  durations,
  easings,
  animationStyles,
  injectKeyframes,
  transitions as animationTransitions,
} from './animations';

// ============================================
// DEFAULT EXPORT
// ============================================

export default theme;