// src/hooks/useAnalytics.js
import { useCallback } from 'react';
import analyticsService from '../services/analyticsService';

/**
 * 📊 HOOK USEANALYTICS
 * Hook React per semplificare l'uso di Firebase Analytics nei componenti
 * 
 * Usage:
 * const analytics = useAnalytics();
 * analytics.trackTripCreated(tripData);
 */

export const useAnalytics = () => {
  // Wrapper memoizzati per evitare re-render
  
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

  const trackTripMetadataUpdated = useCallback((tripId, changes) => {
    analyticsService.trackTripMetadataUpdated(tripId, changes);
  }, []);

  const trackDestinationAdded = useCallback((destination, tripId, context = 'edit') => {
    analyticsService.trackDestinationAdded(destination, tripId, context);
  }, []);

  const trackDestinationRemoved = useCallback((destination, tripId) => {
    analyticsService.trackDestinationRemoved(destination, tripId);
  }, []);

  const trackMemberInvited = useCallback((tripId, inviteMethod, role) => {
    analyticsService.trackMemberInvited(tripId, inviteMethod, role);
  }, []);

  const trackInvitationAccepted = useCallback((tripId, tripName, inviteMethod, newMemberCount) => {
    analyticsService.trackInvitationAccepted(tripId, tripName, inviteMethod, newMemberCount);
  }, []);

  const trackInvitationRejected = useCallback((tripId, tripName) => {
    analyticsService.trackInvitationRejected(tripId, tripName);
  }, []);

  const trackMemberRemoved = useCallback((tripId, isOwnerAction, newMemberCount) => {
    analyticsService.trackMemberRemoved(tripId, isOwnerAction, newMemberCount);
  }, []);

  const trackInviteLinkGenerated = useCallback((tripId) => {
    analyticsService.trackInviteLinkGenerated(tripId);
  }, []);

  const trackExpenseAdded = useCallback((tripId, categoryId, amount, hasSplit, participantsCount) => {
    analyticsService.trackExpenseAdded(tripId, categoryId, amount, hasSplit, participantsCount);
  }, []);

  const trackCostBreakdownOpened = useCallback((tripId, categoryId, isOtherExpense) => {
    analyticsService.trackCostBreakdownOpened(tripId, categoryId, isOtherExpense);
  }, []);

  const trackBudgetSet = useCallback((tripId, budgetAmount, memberCount) => {
    analyticsService.trackBudgetSet(tripId, budgetAmount, memberCount);
  }, []);

  const trackCostSummaryViewed = useCallback((tripId, totalCost, memberCount, origin) => {
    analyticsService.trackCostSummaryViewed(tripId, totalCost, memberCount, origin);
  }, []);

  const trackCalendarViewOpened = useCallback((tripId, daysCount) => {
    analyticsService.trackCalendarViewOpened(tripId, daysCount);
  }, []);

  const trackDayDetailViewed = useCallback((tripId, dayNumber, isDesktop) => {
    analyticsService.trackDayDetailViewed(tripId, dayNumber, isDesktop);
  }, []);

  const trackProfileViewed = useCallback((viewedUserId, isOwnProfile) => {
    analyticsService.trackProfileViewed(viewedUserId, isOwnProfile);
  }, []);

  const trackProfileUpdated = useCallback((changedFields) => {
    analyticsService.trackProfileUpdated(changedFields);
  }, []);

  const trackDayAdded = useCallback((tripId, totalDays) => {
    analyticsService.trackDayAdded(tripId, totalDays);
  }, []);

  const trackDayRemoved = useCallback((tripId, totalDays) => {
    analyticsService.trackDayRemoved(tripId, totalDays);
  }, []);

  const trackMediaAdded = useCallback((tripId, mediaType, categoryId) => {
    analyticsService.trackMediaAdded(tripId, mediaType, categoryId);
  }, []);

  return {
    trackTripCreated,
    trackTripOpened,
    trackTripDeleted,
    trackTripExported,
    trackTripImported,
    trackTripMetadataUpdated,
    trackDestinationAdded,
    trackDestinationRemoved,
    trackMemberInvited,
    trackInvitationAccepted,
    trackInvitationRejected,
    trackMemberRemoved,
    trackInviteLinkGenerated,
    trackExpenseAdded,
    trackCostBreakdownOpened,
    trackBudgetSet,
    trackCostSummaryViewed,
    trackCalendarViewOpened,
    trackDayDetailViewed,
    trackProfileViewed,
    trackProfileUpdated,
    trackDayAdded,
    trackDayRemoved,
    trackMediaAdded
  };
};

export default useAnalytics;