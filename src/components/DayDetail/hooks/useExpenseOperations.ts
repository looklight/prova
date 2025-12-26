// ============================================
// ALTROVE - useExpenseOperations
// Hook per gestione operazioni sulle spese
// Usato da ExpensesTab e riutilizzabile per export
// ============================================

import { useCallback, useMemo } from 'react';
import { Activity } from '../sections/ActivitiesSection';
import { ActivityType } from '../../../utils/activityTypes';

// ============================================
// TYPES
// ============================================

export interface ExpenseItem {
  type: 'accommodation' | 'activity';
  dayId: string;
  id: string;
  title: string;
  cost?: string;
  costBreakdown?: Array<{ userId: string; amount: number }> | null;
  participants?: string[] | null;
  participantsUpdatedAt?: any;
  hasSplitCost?: boolean;
  activityType?: ActivityType;
}

export interface TripMember {
  uid: string;
  displayName: string;
  avatar?: string;
}

export interface PayerInfo {
  type: 'none' | 'me' | 'other' | 'shared';
  label: string;
  avatar?: string;
  payerId?: string;
  payers?: Array<{ uid: string; displayName?: string; avatar?: string }>;
}

interface UseExpenseOperationsParams {
  trip: any;
  currentUserId: string;
  activeMembers: TripMember[];
  onUpdateTrip: (updates: any) => void;
}

// ============================================
// HELPER FUNCTIONS (esportate per riuso)
// ============================================

/**
 * Verifica se un item ha un costo effettivo
 * Se viene passato activeMembers, filtra solo i costi dei membri attivi
 */
export const hasCost = (
  cost?: string,
  costBreakdown?: Array<{ userId: string; amount: number }> | null,
  activeMembers?: TripMember[]
): boolean => {
  // Se c'è un breakdown, controlla se ci sono costi di membri attivi
  if (costBreakdown && costBreakdown.length > 0) {
    if (activeMembers && activeMembers.length > 0) {
      // Filtra solo i costi dei membri attivi
      const activeCosts = costBreakdown.filter(e =>
        activeMembers.some(m => m.uid === e.userId) && e.amount > 0
      );
      return activeCosts.length > 0;
    }
    // Nessun filtro membri, controlla se c'è almeno un costo > 0
    return costBreakdown.some(e => e.amount > 0);
  }
  // Fallback al costo semplice (solo se non c'è breakdown)
  if (cost && parseFloat(cost) > 0) return true;
  return false;
};

/**
 * Formatta data per separatore giorno
 */
export const formatDayHeader = (day: any): string => {
  return day.date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });
};

/**
 * Verifica se un giorno è oggi
 */
export const isToday = (day: any): boolean => {
  if (!day.date) return false;
  const today = new Date();
  const dayDate = new Date(day.date);
  return (
    dayDate.getDate() === today.getDate() &&
    dayDate.getMonth() === today.getMonth() &&
    dayDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Stile cella basato sul colore della categoria
 */
export const getItemStyle = (categoryColor: string): React.CSSProperties => ({
  backgroundColor: `${categoryColor}20`
});

// ============================================
// HOOK
// ============================================

export const useExpenseOperations = ({
  trip,
  currentUserId,
  activeMembers,
  onUpdateTrip
}: UseExpenseOperationsParams) => {

  // ----------------------------------------
  // Operazioni di update base
  // ----------------------------------------

  const updateDayData = useCallback((
    dayId: string,
    categoryId: string,
    updates: Record<string, any>
  ) => {
    const key = `${dayId}-${categoryId}`;
    const currentData = trip.data[key] || {};

    const updatedData = {
      ...trip.data,
      [key]: {
        ...currentData,
        ...updates
      }
    };

    onUpdateTrip({ data: updatedData });
  }, [trip.data, onUpdateTrip]);

  const updateDayActivities = useCallback((dayId: string, activities: Activity[]) => {
    const key = `${dayId}-attivita`;
    const currentData = trip.data[key] || {};

    const updatedData = {
      ...trip.data,
      [key]: {
        ...currentData,
        activities
      }
    };

    onUpdateTrip({ data: updatedData });
  }, [trip.data, onUpdateTrip]);

  // ----------------------------------------
  // Lettura dati spese
  // ----------------------------------------

  /**
   * Conta suggerimenti per un giorno (item con titolo ma senza costo attivo)
   */
  const getSuggestionsCount = useCallback((dayId: string): number => {
    let count = 0;

    // Pernottamento senza costo (di membri attivi)
    const accKey = `${dayId}-pernottamento`;
    const accommodation = trip.data[accKey];
    if (accommodation?.title?.trim() && !hasCost(accommodation.cost, accommodation.costBreakdown, activeMembers)) {
      count++;
    }

    // Attività senza costo (di membri attivi)
    const actKey = `${dayId}-attivita`;
    const actData = trip.data[actKey];
    if (actData?.activities && Array.isArray(actData.activities)) {
      count += actData.activities.filter(
        (a: Activity) => a.title?.trim() && !hasCost(a.cost, a.costBreakdown, activeMembers)
      ).length;
    }

    return count;
  }, [trip.data, activeMembers]);

  /**
   * Estrae spese per un giorno specifico (solo quelle con costo di membri attivi)
   */
  const getDayExpenses = useCallback((day: any): ExpenseItem[] => {
    const items: ExpenseItem[] = [];

    // Pernottamento (solo se ha costo di membri attivi)
    const accKey = `${day.id}-pernottamento`;
    const accommodation = trip.data[accKey];
    if (accommodation?.title?.trim() && hasCost(accommodation.cost, accommodation.costBreakdown, activeMembers)) {
      items.push({
        type: 'accommodation',
        dayId: day.id,
        id: `${day.id}-pernottamento`,
        title: accommodation.title,
        cost: accommodation.cost,
        costBreakdown: accommodation.costBreakdown,
        participants: accommodation.participants,
        participantsUpdatedAt: accommodation.participantsUpdatedAt,
        hasSplitCost: accommodation.hasSplitCost,
        activityType: 'accommodation'
      });
    }

    // Attività (solo quelle con costo di membri attivi)
    const actKey = `${day.id}-attivita`;
    const actData = trip.data[actKey];
    if (actData?.activities && Array.isArray(actData.activities)) {
      actData.activities
        .filter((a: Activity) => a.title?.trim() && hasCost(a.cost, a.costBreakdown, activeMembers))
        .forEach((activity: Activity) => {
          items.push({
            type: 'activity',
            dayId: day.id,
            id: activity.id,
            title: activity.title,
            cost: activity.cost,
            costBreakdown: activity.costBreakdown,
            participants: activity.participants,
            participantsUpdatedAt: (activity as any).participantsUpdatedAt,
            hasSplitCost: activity.hasSplitCost,
            activityType: activity.type || 'generic'
          });
        });
    }

    return items;
  }, [trip.data, activeMembers]);

  /**
   * Estrae TUTTE le spese del viaggio (per export/report)
   */
  const getAllExpenses = useMemo((): ExpenseItem[] => {
    if (!trip.days) return [];
    return trip.days.flatMap((day: any) => getDayExpenses(day));
  }, [trip.days, getDayExpenses]);

  /**
   * Determina chi ha pagato per un item
   */
  const getPayerInfo = useCallback((item: ExpenseItem): PayerInfo => {
    if (!item.costBreakdown || item.costBreakdown.length === 0) {
      return { type: 'none', label: 'Nessun costo' };
    }

    // Filtra per membri attivi
    const activeBreakdown = item.costBreakdown.filter(entry =>
      activeMembers.some(m => m.uid === entry.userId)
    );

    if (activeBreakdown.length === 0) {
      return { type: 'none', label: 'Nessun costo' };
    }

    // Conta utenti unici che hanno pagato
    const uniquePayers = new Set(activeBreakdown.map(e => e.userId));
    const payerCount = uniquePayers.size;

    if (payerCount === 1) {
      const payerId = activeBreakdown[0].userId;
      const payer = activeMembers.find(m => m.uid === payerId);
      const isMe = payerId === currentUserId;

      return {
        type: isMe ? 'me' : 'other',
        label: payer?.displayName || 'Utente',
        avatar: payer?.avatar,
        payerId
      };
    }

    // Spesa condivisa
    return {
      type: 'shared',
      label: `${payerCount} persone`,
      payers: activeBreakdown.map(e => {
        const member = activeMembers.find(m => m.uid === e.userId);
        return { uid: e.userId, displayName: member?.displayName, avatar: member?.avatar };
      })
    };
  }, [activeMembers, currentUserId]);

  // ----------------------------------------
  // Operazioni di modifica spese
  // ----------------------------------------

  /**
   * Crea una nuova spesa (attività)
   */
  const createExpense = useCallback((
    dayId: string,
    title: string,
    expenseType: ActivityType,
    breakdown: Array<{ userId: string; amount: number }>,
    participants: string[] | null
  ) => {
    const total = breakdown.reduce((sum, e) => sum + e.amount, 0);
    const costBreakdownData = breakdown.length > 0 ? breakdown : undefined;

    const newActivity: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      title,
      type: expenseType || 'generic',
      bookingStatus: 'na',
      cost: total > 0 ? total.toString() : '',
      costBreakdown: costBreakdownData,
      participants: participants || undefined,
      participantsUpdatedAt: participants ? new Date() : undefined,
      hasSplitCost: breakdown.length > 1
    };

    const actKey = `${dayId}-attivita`;
    const actData = trip.data[actKey] || {};
    const existingActivities = actData.activities || [];

    updateDayActivities(dayId, [...existingActivities, newActivity]);
  }, [trip.data, updateDayActivities]);

  /**
   * Aggiorna un suggerimento esistente (item senza costo) con i dati di costo
   */
  const updateSuggestion = useCallback((
    dayId: string,
    suggestion: { id: string; sourceType: 'accommodation' | 'activity' },
    title: string,
    expenseType: ActivityType | undefined,
    breakdown: Array<{ userId: string; amount: number }>,
    participants: string[] | null
  ) => {
    const total = breakdown.reduce((sum, e) => sum + e.amount, 0);
    const costBreakdownData = breakdown.length > 0 ? breakdown : null;

    if (suggestion.sourceType === 'accommodation') {
      updateDayData(dayId, 'pernottamento', {
        cost: total > 0 ? total.toString() : '',
        costBreakdown: costBreakdownData,
        participants: participants || undefined,
        participantsUpdatedAt: participants ? new Date() : undefined,
        hasSplitCost: breakdown.length > 1
      });
    } else {
      const actKey = `${dayId}-attivita`;
      const actData = trip.data[actKey] || {};
      const existingActivities = actData.activities || [];

      const updatedActivities = existingActivities.map((a: Activity) =>
        a.id === suggestion.id
          ? {
              ...a,
              title,
              type: expenseType || a.type || 'generic',
              cost: total > 0 ? total.toString() : '',
              costBreakdown: costBreakdownData,
              participants: participants || undefined,
              participantsUpdatedAt: participants ? new Date() : undefined,
              hasSplitCost: breakdown.length > 1
            }
          : a
      );
      updateDayActivities(dayId, updatedActivities);
    }
  }, [trip.data, updateDayData, updateDayActivities]);

  /**
   * Aggiorna una spesa esistente
   */
  const updateExpense = useCallback((
    item: ExpenseItem,
    title: string,
    expenseType: ActivityType | undefined,
    breakdown: Array<{ userId: string; amount: number }>,
    participants: string[] | null,
    targetDayId?: string
  ) => {
    const total = breakdown.reduce((sum, e) => sum + e.amount, 0);
    const dayChanged = targetDayId && targetDayId !== item.dayId;

    if (item.type === 'accommodation') {
      updateDayData(item.dayId, 'pernottamento', {
        title: title || item.title,
        costBreakdown: breakdown.length > 0 ? breakdown : null,
        cost: total > 0 ? total.toString() : '',
        participants: participants || undefined,
        participantsUpdatedAt: participants ? new Date() : undefined,
        hasSplitCost: breakdown.length > 1
      });
    } else if (dayChanged && targetDayId) {
      // Sposta attività in un altro giorno
      const oldActKey = `${item.dayId}-attivita`;
      const oldActData = trip.data[oldActKey];
      const oldActivities = oldActData?.activities || [];
      const filteredOld = oldActivities.filter((a: Activity) => a.id !== item.id);

      const newActKey = `${targetDayId}-attivita`;
      const newActData = trip.data[newActKey] || {};
      const newActivities = newActData.activities || [];

      const movedActivity: Activity = {
        id: item.id,
        title: title || item.title,
        type: expenseType || item.activityType || 'generic',
        bookingStatus: 'na',
        cost: total > 0 ? total.toString() : '',
        costBreakdown: breakdown.length > 0 ? breakdown : undefined,
        participants: participants || undefined,
        participantsUpdatedAt: participants ? new Date() : undefined,
        hasSplitCost: breakdown.length > 1
      };

      const updatedData = {
        ...trip.data,
        [oldActKey]: { ...oldActData, activities: filteredOld },
        [newActKey]: { ...newActData, activities: [...newActivities, movedActivity] }
      };
      onUpdateTrip({ data: updatedData });
    } else {
      // Stesso giorno
      const actKey = `${item.dayId}-attivita`;
      const actData = trip.data[actKey];
      const activities = actData?.activities || [];

      const updatedActivities = activities.map((a: Activity) =>
        a.id === item.id
          ? {
              ...a,
              title: title || a.title,
              type: expenseType || a.type || 'generic',
              costBreakdown: breakdown.length > 0 ? breakdown : null,
              cost: total > 0 ? total.toString() : '',
              participants: participants || a.participants,
              participantsUpdatedAt: participants ? new Date() : (a as any).participantsUpdatedAt,
              hasSplitCost: breakdown.length > 1
            }
          : a
      );
      updateDayActivities(item.dayId, updatedActivities);
    }
  }, [trip.data, updateDayData, updateDayActivities, onUpdateTrip]);

  /**
   * Elimina una spesa (per attività: elimina completamente l'attività)
   */
  const deleteExpense = useCallback((item: ExpenseItem) => {
    if (item.type === 'accommodation') {
      // Pernottamento: resetta solo i costi
      updateDayData(item.dayId, 'pernottamento', {
        costBreakdown: null,
        cost: '',
        participants: null,
        hasSplitCost: false
      });
    } else {
      // Attività: elimina completamente
      const actKey = `${item.dayId}-attivita`;
      const actData = trip.data[actKey];
      const activities = actData?.activities || [];

      const updatedActivities = activities.filter((a: Activity) => a.id !== item.id);
      updateDayActivities(item.dayId, updatedActivities);
    }
  }, [trip.data, updateDayData, updateDayActivities]);

  /**
   * Rimuove solo il costo da una spesa (mantiene l'item)
   * Per accommodation: stesso effetto di deleteExpense
   * Per activity: resetta i costi ma mantiene l'attività in pianificazione
   */
  const clearExpenseCostOnly = useCallback((item: ExpenseItem) => {
    if (item.type === 'accommodation') {
      // Pernottamento: usa deleteExpense (resetta solo i costi)
      deleteExpense(item);
    } else {
      // Attività: resetta solo i costi, mantiene l'attività
      const actKey = `${item.dayId}-attivita`;
      const actData = trip.data[actKey];
      const activities = actData?.activities || [];

      const updatedActivities = activities.map((a: Activity) =>
        a.id === item.id
          ? {
              ...a,
              costBreakdown: null,
              cost: '',
              participants: null,
              participantsUpdatedAt: null,
              hasSplitCost: false
            }
          : a
      );
      updateDayActivities(item.dayId, updatedActivities);
    }
  }, [trip.data, deleteExpense, updateDayActivities]);

  /**
   * Reset completo di una spesa (usato dal modal con RESET_ALL)
   */
  const resetExpense = useCallback((item: ExpenseItem) => {
    if (item.type === 'accommodation') {
      updateDayData(item.dayId, 'pernottamento', {
        costBreakdown: null,
        cost: '',
        title: '',
        hasSplitCost: false
      });
    } else {
      deleteExpense(item);
    }
  }, [updateDayData, deleteExpense]);

  /**
   * Handler unificato per conferma breakdown (compatibile con CostBreakdownModal)
   */
  const handleConfirmBreakdown = useCallback((
    breakdown: Array<{ userId: string; amount: number }> | 'RESET_ALL',
    participants: string[] | null,
    expenseTitle?: string,
    targetDayId?: string,
    expenseType?: ActivityType,
    selectedSuggestion?: { id: string; sourceType: 'accommodation' | 'activity' } | null,
    currentItem?: ExpenseItem | null,
    isNewExpense?: boolean
  ) => {
    // Nuova spesa
    if (isNewExpense && expenseTitle && targetDayId) {
      if (breakdown === 'RESET_ALL') return;

      if (selectedSuggestion) {
        updateSuggestion(targetDayId, selectedSuggestion, expenseTitle, expenseType, breakdown, participants);
      } else {
        createExpense(targetDayId, expenseTitle, expenseType || 'generic', breakdown, participants);
      }
      return;
    }

    // Modifica spesa esistente
    if (!currentItem) return;

    if (breakdown === 'RESET_ALL') {
      resetExpense(currentItem);
    } else {
      updateExpense(currentItem, expenseTitle || currentItem.title, expenseType, breakdown, participants, targetDayId);
    }
  }, [createExpense, updateSuggestion, updateExpense, resetExpense]);

  // ----------------------------------------
  // Return
  // ----------------------------------------

  return {
    // Lettura dati
    getDayExpenses,
    getAllExpenses,
    getSuggestionsCount,
    getPayerInfo,

    // Operazioni CRUD
    createExpense,
    updateExpense,
    deleteExpense,
    clearExpenseCostOnly,
    resetExpense,
    updateSuggestion,

    // Handler compatibile con modal
    handleConfirmBreakdown,

    // Operazioni base (per usi avanzati)
    updateDayData,
    updateDayActivities
  };
};
