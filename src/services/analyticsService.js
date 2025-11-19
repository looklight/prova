// src/services/analyticsService.js
import { analytics } from '../firebase';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import {
  isSeriousTrip,
  getExpenseUsageLevel,
  getActiveMemberCount,
  hasAnyExpense,
  hasAnyMedia
} from '../utils/analyticsHelpers';

/**
 * 📊 ANALYTICS SERVICE
 * Servizio centralizzato per Firebase Analytics
 */

// ============= INIZIALIZZAZIONE UTENTE =============

/**
 * Imposta User ID per analytics
 */
export const setAnalyticsUserId = (userId) => {
  if (!analytics) return;

  try {
    setUserId(analytics, userId);
    console.log('📊 Analytics User ID impostato:', userId);
  } catch (error) {
    console.error('❌ Errore impostazione user ID:', error);
  }
};

/**
 * Imposta proprietà utente persistenti
 */
export const setAnalyticsUserProperties = (properties) => {
  if (!analytics) return;

  try {
    setUserProperties(analytics, properties);
    console.log('📊 User properties impostate:', properties);
  } catch (error) {
    console.error('❌ Errore impostazione properties:', error);
  }
};

/**
 * Aggiorna statistiche utente globali
 */
export const updateUserAnalyticsProperties = (userData) => {
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

    console.log('📊 User properties aggiornate');
  } catch (error) {
    console.error('❌ Errore update properties:', error);
  }
};

// ============= EVENTI VIAGGI =============

/**
 * 🆕 Viaggio creato
 */
export const trackTripCreated = (tripData) => {
  if (!analytics) return;

  try {
    const memberCount = getActiveMemberCount(tripData);

    logEvent(analytics, 'trip_created', {
      trip_id: String(tripData.id),
      trip_name: tripData.name || 'Nuovo Viaggio',

      // Destinazioni
      destinations_count: tripData.metadata?.destinations?.length || 0,
      destinations: (tripData.metadata?.destinations || []).join(','),

      // Durata
      days_count: tripData.days?.length || 1,

      // Qualità viaggio (FILTRO STRINGENTE)
      is_serious_trip: isSeriousTrip(tripData),
      has_destinations: (tripData.metadata?.destinations?.length || 0) > 0,
      has_description: !!(tripData.metadata?.description?.trim()),
      has_image: !!tripData.image,

      // Spese
      expense_usage_level: getExpenseUsageLevel(tripData),
      has_expenses: hasAnyExpense(tripData),

      // Media
      has_media: hasAnyMedia(tripData),

      // Collaborazione
      member_count: memberCount,
      participants_count: memberCount,
      is_shared: memberCount > 1
    });

    // 🎯 Evento separato per ogni destinazione
    (tripData.metadata?.destinations || []).forEach((destination) => {
      trackDestinationAdded(destination, tripData.id, 'creation');
    });

    console.log('📊 Trip created tracked:', tripData.name);
  } catch (error) {
    console.error('❌ Errore track trip_created:', error);
  }
};

/**
 * 📂 Viaggio aperto
 */
export const trackTripOpened = (tripId, tripName, daysCount, memberCount) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_opened', {
      trip_id: String(tripId),
      trip_name: tripName,
      days_count: daysCount,
      member_count: memberCount,
      participants_count: memberCount,
      is_shared: memberCount > 1
    });

    console.log('📊 Trip opened tracked:', tripName);
  } catch (error) {
    console.error('❌ Errore track trip_opened:', error);
  }
};

/**
 * 🗑️ Viaggio eliminato/abbandonato
 */
export const trackTripDeleted = (tripId, tripName, action, memberCount, wasSerious = false) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_deleted', {
      trip_id: String(tripId),
      trip_name: tripName,
      action: action, // 'deleted' o 'left'
      member_count: memberCount,
      was_serious_trip: wasSerious
    });

    console.log(`📊 Trip ${action} tracked:`, tripName);
  } catch (error) {
    console.error('❌ Errore track trip_deleted:', error);
  }
};

/**
 * 📤 Viaggio esportato
 */
export const trackTripExported = (tripId, tripName, daysCount, totalCost) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_exported', {
      trip_id: String(tripId),
      trip_name: tripName,
      days_count: daysCount,
      total_cost: Math.round(totalCost || 0)
    });

    console.log('📊 Trip exported tracked:', tripName);
  } catch (error) {
    console.error('❌ Errore track trip_exported:', error);
  }
};

/**
 * 📥 Viaggio importato
 */
export const trackTripImported = (tripName, daysCount, categoriesCount) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_imported', {
      trip_name: tripName,
      days_count: daysCount,
      categories_count: categoriesCount
    });

    console.log('📊 Trip imported tracked:', tripName);
  } catch (error) {
    console.error('❌ Errore track trip_imported:', error);
  }
};

/**
 * ✏️ Metadata viaggio aggiornato
 */
export const trackTripMetadataUpdated = (tripId, changes) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'trip_metadata_updated', {
      trip_id: String(tripId),
      changed_name: !!changes.name,
      changed_image: !!changes.image,
      changed_destinations: !!changes.destinations,
      changed_description: !!changes.description,
      destinations_count: changes.destinations?.length || 0
    });

    console.log('📊 Trip metadata updated tracked');
  } catch (error) {
    console.error('❌ Errore track metadata:', error);
  }
};

// ============= EVENTI DESTINAZIONI =============

/**
 * 🌍 Destinazione aggiunta
 */
export const trackDestinationAdded = (destination, tripId, context = 'edit') => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'destination_added', {
      destination: destination,
      trip_id: String(tripId),
      context: context // 'creation' | 'edit'
    });

    console.log('📊 Destination added:', destination);
  } catch (error) {
    console.error('❌ Errore track destination:', error);
  }
};

/**
 * 🗑️ Destinazione rimossa
 */
export const trackDestinationRemoved = (destination, tripId) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'destination_removed', {
      destination: destination,
      trip_id: String(tripId)
    });

    console.log('📊 Destination removed:', destination);
  } catch (error) {
    console.error('❌ Errore track destination removed:', error);
  }
};

// ============= EVENTI COLLABORAZIONE =============

/**
 * 👥 Membro invitato
 */
export const trackMemberInvited = (tripId, inviteMethod, role) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'member_invited', {
      trip_id: String(tripId),
      invite_method: inviteMethod, // 'link' | 'username'
      role: role
    });

    console.log('📊 Member invited via:', inviteMethod);
  } catch (error) {
    console.error('❌ Errore track invite:', error);
  }
};

/**
 * ✅ Invito accettato
 */
export const trackInvitationAccepted = (tripId, tripName, inviteMethod, newMemberCount) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'invitation_accepted', {
      trip_id: String(tripId),
      trip_name: tripName,
      invite_method: inviteMethod,
      new_member_count: newMemberCount
    });

    console.log('📊 Invitation accepted via:', inviteMethod);
  } catch (error) {
    console.error('❌ Errore track accept:', error);
  }
};

/**
 * ❌ Invito rifiutato
 */
export const trackInvitationRejected = (tripId, tripName) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'invitation_rejected', {
      trip_id: String(tripId),
      trip_name: tripName
    });

    console.log('📊 Invitation rejected');
  } catch (error) {
    console.error('❌ Errore track reject:', error);
  }
};

/**
 * 🗑️ Membro rimosso
 */
export const trackMemberRemoved = (tripId, isOwnerAction, newMemberCount) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'member_removed', {
      trip_id: String(tripId),
      removed_by_owner: isOwnerAction,
      new_member_count: newMemberCount
    });

    console.log('📊 Member removed');
  } catch (error) {
    console.error('❌ Errore track remove:', error);
  }
};

/**
 * 🔗 Link invito generato
 */
export const trackInviteLinkGenerated = (tripId) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'invite_link_generated', {
      trip_id: String(tripId)
    });

    console.log('📊 Invite link generated');
  } catch (error) {
    console.error('❌ Errore track link generation:', error);
  }
};

// ============= EVENTI SPESE =============

/**
 * 💰 Spesa aggiunta
 */
export const trackExpenseAdded = (tripId, categoryId, amount, hasSplit, participantsCount) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'expense_added', {
      trip_id: String(tripId),
      category: categoryId,
      amount: Math.round(amount || 0),
      has_split: hasSplit,
      participants_count: participantsCount || 1,
      is_other_expense: categoryId === 'other'
    });

    console.log('📊 Expense added:', categoryId);
  } catch (error) {
    console.error('❌ Errore track expense:', error);
  }
};

/**
 * 💵 Breakdown costi aperto
 */
export const trackCostBreakdownOpened = (tripId, categoryId, isOtherExpense) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'cost_breakdown_opened', {
      trip_id: String(tripId),
      category: categoryId,
      is_other_expense: isOtherExpense
    });

    console.log('📊 Cost breakdown opened');
  } catch (error) {
    console.error('❌ Errore track breakdown:', error);
  }
};

/**
 * 🎯 Budget impostato
 */
export const trackBudgetSet = (tripId, budgetAmount, memberCount) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'budget_set', {
      trip_id: String(tripId),
      budget_amount: Math.round(budgetAmount),
      budget_per_person: Math.round(budgetAmount / memberCount)
    });

    console.log('📊 Budget set:', budgetAmount);
  } catch (error) {
    console.error('❌ Errore track budget:', error);
  }
};

/**
 * 📊 Riepilogo costi visualizzato
 */
export const trackCostSummaryViewed = (tripId, totalCost, memberCount, origin) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'cost_summary_viewed', {
      trip_id: String(tripId),
      total_cost: Math.round(totalCost || 0),
      member_count: memberCount,
      participants_count: memberCount,
      cost_per_person: memberCount > 0 ? Math.round(totalCost / memberCount) : 0,
      origin: origin // 'home' | 'dayDetail'
    });

    console.log('📊 Cost summary viewed');
  } catch (error) {
    console.error('❌ Errore track summary:', error);
  }
};

// ============= EVENTI ENGAGEMENT =============

/**
 * 📅 Vista calendario aperta
 */
export const trackCalendarViewOpened = (tripId, daysCount) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'calendar_view_opened', {
      trip_id: String(tripId),
      days_count: daysCount
    });

    console.log('📊 Calendar view opened');
  } catch (error) {
    console.error('❌ Errore track calendar:', error);
  }
};

/**
 * 📆 Dettaglio giorno visualizzato
 */
export const trackDayDetailViewed = (tripId, dayNumber, isDesktop) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'day_detail_viewed', {
      trip_id: String(tripId),
      day_number: dayNumber,
      device_type: isDesktop ? 'desktop' : 'mobile'
    });

    console.log('📊 Day detail viewed:', dayNumber);
  } catch (error) {
    console.error('❌ Errore track day detail:', error);
  }
};

/**
 * 👤 Profilo visualizzato
 */
export const trackProfileViewed = (viewedUserId, isOwnProfile) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'profile_viewed', {
      viewed_user_id: viewedUserId,
      is_own_profile: isOwnProfile
    });

    console.log('📊 Profile viewed');
  } catch (error) {
    console.error('❌ Errore track profile:', error);
  }
};

/**
 * ✏️ Profilo modificato
 */
export const trackProfileUpdated = (changedFields) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'profile_updated', {
      changed_display_name: changedFields.includes('displayName'),
      changed_username: changedFields.includes('username'),
      changed_avatar: changedFields.includes('avatar'),
      changed_bio: changedFields.includes('bio')
    });

    console.log('📊 Profile updated:', changedFields.join(', '));
  } catch (error) {
    console.error('❌ Errore track profile update:', error);
  }
};

/**
 * 📝 Giorno aggiunto
 */
export const trackDayAdded = (tripId, totalDays) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'day_added', {
      trip_id: String(tripId),
      total_days: totalDays
    });

    console.log('📊 Day added, total:', totalDays);
  } catch (error) {
    console.error('❌ Errore track day added:', error);
  }
};

/**
 * 🗑️ Giorno rimosso
 */
export const trackDayRemoved = (tripId, totalDays) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'day_removed', {
      trip_id: String(tripId),
      total_days: totalDays
    });

    console.log('📊 Day removed, remaining:', totalDays);
  } catch (error) {
    console.error('❌ Errore track day removed:', error);
  }
};

/**
 * 📷 Media aggiunto
 */
export const trackMediaAdded = (tripId, mediaType, categoryId) => {
  if (!analytics) return;

  try {
    logEvent(analytics, 'media_added', {
      trip_id: String(tripId),
      media_type: mediaType, // 'image' | 'video' | 'link' | 'note'
      category: categoryId
    });

    console.log('📊 Media added:', mediaType);
  } catch (error) {
    console.error('❌ Errore track media:', error);
  }
};

// ============= EXPORT =============

export default {
  setAnalyticsUserId,
  setAnalyticsUserProperties,
  updateUserAnalyticsProperties,
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