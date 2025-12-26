// ============================================
// ALTROVE - DayDetail exports
// ============================================

// Main view
export { default as DayDetailView } from './DayDetailView';

// Tabs
export { default as TabBar } from './tabs/TabBar';
export { default as PlanningTab } from './tabs/PlanningTab';
export { default as NotesTab } from './tabs/NotesTab';
export { default as ExpensesTab } from './tabs/ExpensesTab';

// Sections
export { default as DestinationsSection } from './sections/DestinationsSection';
export { default as ActivitiesSection } from './sections/ActivitiesSection';
export { default as AccommodationSection } from './sections/AccommodationSection';

// Components (re-export from subfolder)
export {
  ActivityRow,
  ActivityExpanded,
  ActivityEditMode,
  ActivityTypeSelector,
  ActivityEditFooter,
  LocationAutocomplete,
  LocationFields,
  TransportFields,
  MediaGrid,
  MediaSection
} from './components';

// Modals (re-export from subfolder)
export {
  CostBreakdownModal,
  CurrencyConvertModal,
  ImageViewer,
  LocationModal,
  MediaDialog,
  WaypointsModal
} from './modals';

// Hooks (re-export from subfolder)
export {
  useActivityLocation,
  useActivityMedia,
  useGenericImageUpload
} from './hooks';

// UI components
export {
  BookingToggle,
  CostInput,
  CostConflictDialog
} from './ui';

// Types
export type { Activity, ActivityLocation } from './sections/ActivitiesSection';
export type { Waypoint } from './modals';
export type { LocationTarget, MediaDialogType } from './hooks';
