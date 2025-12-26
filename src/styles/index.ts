/* ============================================
   ALTROVE - Styles Index
   Import: import { colors, spacing, gradients } from '@/styles'
   ============================================ */

// Re-export tutto da theme
export {
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
  theme,
  ALTROVE_COLORS, // Retrocompatibilità
} from './theme';

// Types
export type {
  ThemeColors,
  ThemeSpacing,
  ThemeRadius,
  ThemeShadows,
  ThemeGradients,
  ThemeGlowShadows,
  Theme,
} from './theme';

// Default export
export { default } from './theme';