// ============================================
// ALTROVE - Analytics Service
// Servizio centralizzato per Firebase Analytics
// ============================================

import { getAnalyticsInstance } from '../firebase';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import {
  isSeriousTrip,
  getExpenseUsageLevel,
  getActiveMemberCount,
  hasAnyExpense,
  hasAnyMedia
} from '../utils/analyticsHelpers';

// ============================================
// TYPES
// ============================================

interface UserData {
  totalTrips?: number;
  activeTrips?: number;
  seriousTrips?: number;
  tripsAsOwner?: number;
  tripsAsMember?: number;
  username?: string;
  avatar?: string;
  accountAgeDays?: number;
  engagementLevel?: string;
}

interface TripData {
  id: string | number;
  name?: string;
  metadata?: {
    destinations?: string[];
    description?: string;
  };
  days?: any[];
  image?: string;
  data?: Record<string, any>;
  sharing?: {
    members?: Record<string, any>;
  };
}

// ============================================
// USER INITIALIZATION
// ============================================

export const setAnalyticsUserId = (userId: string): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    setUserId(analytics, userId);
  } catch (error) {
    console.error('Errore impostazione user ID:', error);
  }
};

export const setAnalyticsUserProperties = (properties: Record<string, any>): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    setUserProperties(analytics, properties);
  } catch (error) {
    console.error('Errore impostazione properties:', error);
  }
};

export const updateUserAnalyticsProperties = (userData: UserData): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    setUserProperties(analytics, {
      total_trips: userData.totalTrips || 0,
      active_trips: userData.activeTrips || 0,
      serious_trips: userData.seriousTrips || 0,
      trips_as_owner: userData.tripsAsOwner || 0,
      trips_as_member: userData.tripsAsMember || 0,
      has_username: !!userData.username,
      has_avatar: !!userData.avatar,
      account_age_days: userData.accountAgeDays || 0,
      engagement_level: userData.engagementLevel || 'lurker'
    });
  } catch (error) {
    console.error('Errore update properties:', error);
  }
};

// ============================================
// TRIP EVENTS
// ============================================

export const trackTripCreated = (tripData: TripData): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    const memberCount = getActiveMemberCount(tripData);

    logEvent(analytics, 'trip_created', {
      trip_id: String(tripData.id),
      trip_name: tripData.name || 'Nuovo Viaggio',
      destinations_count: tripData.metadata?.destinations?.length || 0,
      destinations: (tripData.metadata?.destinations || []).join(','),
      days_count: tripData.days?.length || 1,
      is_serious_trip: isSeriousTrip(tripData),
      has_destinations: (tripData.metadata?.destinations?.length || 0) > 0,
      has_description: !!(tripData.metadata?.description?.trim()),
      has_image: !!tripData.image,
      expense_usage_level: getExpenseUsageLevel(tripData),
      has_expenses: hasAnyExpense(tripData),
      has_media: hasAnyMedia(tripData),
      member_count: memberCount,
      is_shared: memberCount > 1
    });

    // Track each destination separately for popularity analysis
    (tripData.metadata?.destinations || []).forEach((destination) => {
      trackDestinationAdded(destination, String(tripData.id), 'creation');
    });
  } catch (error) {
    console.error('Errore track trip_created:', error);
  }
};

export const trackTripOpened = (
  tripId: string | number,
  tripName: string,
  daysCount: number,
  memberCount: number
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_opened', {
      trip_id: String(tripId),
      trip_name: tripName,
      days_count: daysCount,
      member_count: memberCount,
      is_shared: memberCount > 1
    });
  } catch (error) {
    console.error('Errore track trip_opened:', error);
  }
};

export const trackTripDeleted = (
  tripId: string | number,
  tripName: string,
  action: 'deleted' | 'left',
  memberCount: number,
  wasSerious: boolean = false
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_deleted', {
      trip_id: String(tripId),
      trip_name: tripName,
      action: action,
      member_count: memberCount,
      was_serious_trip: wasSerious
    });
  } catch (error) {
    console.error('Errore track trip_deleted:', error);
  }
};

export const trackTripExported = (
  tripId: string | number,
  tripName: string,
  daysCount: number,
  totalCost: number
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_exported', {
      trip_id: String(tripId),
      trip_name: tripName,
      days_count: daysCount,
      total_cost: Math.round(totalCost || 0)
    });
  } catch (error) {
    console.error('Errore track trip_exported:', error);
  }
};

export const trackTripImported = (
  tripName: string,
  daysCount: number,
  categoriesCount: number
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_imported', {
      trip_name: tripName,
      days_count: daysCount,
      categories_count: categoriesCount
    });
  } catch (error) {
    console.error('Errore track trip_imported:', error);
  }
};

// ============================================
// DESTINATION EVENTS
// ============================================

export const trackDestinationAdded = (
  destination: string,
  tripId: string,
  context: 'creation' | 'edit' = 'edit'
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'destination_added', {
      destination: destination,
      trip_id: String(tripId),
      context: context
    });
  } catch (error) {
    console.error('Errore track destination:', error);
  }
};

export const trackDestinationRemoved = (
  destination: string,
  tripId: string | number
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'destination_removed', {
      destination: destination,
      trip_id: String(tripId)
    });
  } catch (error) {
    console.error('Errore track destination removed:', error);
  }
};

// ============================================
// COLLABORATION EVENTS
// ============================================

export const trackInviteLinkGenerated = (tripId: string | number): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'invite_link_generated', {
      trip_id: String(tripId)
    });
  } catch (error) {
    console.error('Errore track link generation:', error);
  }
};

export const trackInvitationAccepted = (
  tripId: string | number,
  tripName: string,
  inviteMethod: string,
  newMemberCount: number
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'invitation_accepted', {
      trip_id: String(tripId),
      trip_name: tripName,
      invite_method: inviteMethod,
      new_member_count: newMemberCount
    });
  } catch (error) {
    console.error('Errore track accept:', error);
  }
};

// ============================================
// ENGAGEMENT EVENTS
// ============================================

export const trackCalendarViewOpened = (
  tripId: string | number,
  daysCount: number
): void => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;

  try {
    logEvent(analytics, 'calendar_view_opened', {
      trip_id: String(tripId),
      days_count: daysCount
    });
  } catch (error) {
    console.error('Errore track calendar:', error);
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  setAnalyticsUserId,
  setAnalyticsUserProperties,
  updateUserAnalyticsProperties,
  trackTripCreated,
  trackTripOpened,
  trackTripDeleted,
  trackTripExported,
  trackTripImported,
  trackDestinationAdded,
  trackDestinationRemoved,
  trackInviteLinkGenerated,
  trackInvitationAccepted,
  trackCalendarViewOpened
};
