// ============================================
// ALTROVE - useAnalytics Hook
// Hook React per Firebase Analytics
// ============================================

import { useCallback } from 'react';
import analyticsService from '../services/analyticsService';

/**
 * Hook per semplificare l'uso di Firebase Analytics nei componenti
 *
 * Usage:
 * const analytics = useAnalytics();
 * analytics.trackTripCreated(tripData);
 */
export const useAnalytics = () => {
  // Trip events
  const trackTripCreated = useCallback((tripData) => {
    analyticsService.trackTripCreated(tripData);
  }, []);

  const trackTripOpened = useCallback((tripId, tripName, daysCount, memberCount) => {
    analyticsService.trackTripOpened(tripId, tripName, daysCount, memberCount);
  }, []);

  const trackTripDeleted = useCallback((tripId, tripName, action, memberCount, wasSerious) => {
    analyticsService.trackTripDeleted(tripId, tripName, action, memberCount, wasSerious);
  }, []);

  const trackTripExported = useCallback((tripId, tripName, daysCount, totalCost) => {
    analyticsService.trackTripExported(tripId, tripName, daysCount, totalCost);
  }, []);

  const trackTripImported = useCallback((tripName, daysCount, categoriesCount) => {
    analyticsService.trackTripImported(tripName, daysCount, categoriesCount);
  }, []);

  // Destination events
  const trackDestinationAdded = useCallback((destination, tripId, context = 'edit') => {
    analyticsService.trackDestinationAdded(destination, tripId, context);
  }, []);

  const trackDestinationRemoved = useCallback((destination, tripId) => {
    analyticsService.trackDestinationRemoved(destination, tripId);
  }, []);

  // Collaboration events
  const trackInviteLinkGenerated = useCallback((tripId) => {
    analyticsService.trackInviteLinkGenerated(tripId);
  }, []);

  const trackInvitationAccepted = useCallback((tripId, tripName, inviteMethod, newMemberCount) => {
    analyticsService.trackInvitationAccepted(tripId, tripName, inviteMethod, newMemberCount);
  }, []);

  // Engagement events
  const trackCalendarViewOpened = useCallback((tripId, daysCount) => {
    analyticsService.trackCalendarViewOpened(tripId, daysCount);
  }, []);

  return {
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
};

export default useAnalytics;
