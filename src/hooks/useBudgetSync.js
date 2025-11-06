import { useEffect, useRef } from 'react';
import { getSuggestedBudget } from '../costsUtils';

/**
 * Hook per sincronizzazione automatica del budget del viaggio
 * 
 * Questo hook monitora cambiamenti nel numero di giorni e membri del viaggio
 * e ricalcola automaticamente il budget suggerito quando necessario.
 * 
 * ✅ Funziona anche quando BudgetView è chiuso/smontato
 * ✅ Gestisce inizializzazione e aggiornamenti automatici
 * ✅ Mantiene separazione tra logica budget e UI
 * 
 * @param {Object} trip - Oggetto viaggio corrente
 * @param {Function} onUpdateTrip - Callback per aggiornare il viaggio
 * 
 * @example
 * // In TripView.tsx
 * useBudgetSync(trip, onUpdateTrip);
 */
export const useBudgetSync = (trip, onUpdateTrip) => {
  // Traccia valori precedenti per detectare cambiamenti
  const prevDaysRef = useRef(0);
  const prevMembersRef = useRef(0);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Calcola valori correnti
    const currentDays = trip.days?.length || 0;
    const currentMembers = Object.values(trip.sharing?.members || {})
      .filter(m => m.status === 'active').length || 1;

    // 1️⃣ INIZIALIZZAZIONE (prima volta)
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevDaysRef.current = currentDays;
      prevMembersRef.current = currentMembers;

      // Crea budget iniziale se non esiste
      if (!trip.budget || Object.keys(trip.budget).length === 0) {
        console.log('💰 [useBudgetSync] Inizializzazione budget');
        const suggested = getSuggestedBudget(trip);
        
        onUpdateTrip({
          ...trip,
          budget: suggested.categories
        });
        
        console.log('✅ [useBudgetSync] Budget inizializzato:', suggested.total, '€');
      }
      return;
    }

    // 2️⃣ RICALCOLO AUTOMATICO (quando cambiano giorni o membri)
    const daysChanged = currentDays !== prevDaysRef.current;
    const membersChanged = currentMembers !== prevMembersRef.current;

    if (daysChanged || membersChanged) {
      console.log('🔄 [useBudgetSync] Ricalcolo automatico budget');
      console.log('   Giorni:', prevDaysRef.current, '→', currentDays);
      console.log('   Membri:', prevMembersRef.current, '→', currentMembers);

      const suggested = getSuggestedBudget(trip);
      
      onUpdateTrip({
        ...trip,
        budget: suggested.categories
      });

      // Aggiorna riferimenti
      prevDaysRef.current = currentDays;
      prevMembersRef.current = currentMembers;

      console.log('✅ [useBudgetSync] Budget aggiornato:', suggested.total, '€');
    }
  }, [
    trip.days?.length,
    Object.values(trip.sharing?.members || {}).filter(m => m.status === 'active').length
  ]);
};