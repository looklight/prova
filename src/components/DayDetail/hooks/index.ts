// ============================================
// ALTROVE - DayDetail Hooks
// Export centralizzato hooks
// ============================================

// Activity-specific hooks
export { useActivityLocation } from './useActivityLocation';
export type { LocationTarget } from './useActivityLocation';

export { useActivityMedia } from './useActivityMedia';

// Generic hooks (riutilizzabili)
export { useMedia } from './useMedia';
export type { MediaDialogType } from './useMedia';

export { useAccommodationSearch } from './useAccommodationSearch';

export { useGenericImageUpload } from './useGenericImageUpload';

// Expense operations
export { useExpenseOperations } from './useExpenseOperations';
export type { ExpenseItem, TripMember, PayerInfo } from './useExpenseOperations';
export { hasCost, formatDayHeader, isToday, getItemStyle } from './useExpenseOperations';
