import { useEffect, useRef } from 'react';
import { getSuggestedBudget } from '../utils/costsUtils';

/**
 * Hook per sincronizzazione automatica del budget del viaggio
 * 
 * ✅ OTTIMIZZATO: Evita calcoli e salvataggi inutili
 * ✅ Funziona solo quando cambia il numero di giorni/membri
 * ✅ Non rallenta il caricamento iniziale
 * 
 * @param {Object} trip - Oggetto viaggio corrente
 * @param {Function} onUpdateTrip - Callback per aggiornare il viaggio
 */
export const useBudgetSync = (trip, onUpdateTrip) => {
  const prevDaysRef = useRef(null);
  const prevMembersRef = useRef(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // 🚀 OTTIMIZZAZIONE: Calcola solo una volta
    const currentDays = trip.days?.length || 0;
    const currentMembers = Object.values(trip.sharing?.members || {})
      .filter(m => m.status === 'active').length || 1;

    // 1️⃣ PRIMO MOUNT: Salva valori iniziali, NON ricalcolare
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevDaysRef.current = currentDays;
      prevMembersRef.current = currentMembers;

      // 🚀 OTTIMIZZAZIONE: Crea budget SOLO se completamente assente
      // Non sovrascrivere budget esistente al caricamento!
      if (!trip.budget || Object.keys(trip.budget).length === 0) {
        console.log('💰 [useBudgetSync] Inizializzazione budget (prima volta)');
        const suggested = getSuggestedBudget(trip);
        
        // Salva in modo asincrono (non blocca rendering)
        setTimeout(() => {
          onUpdateTrip({
            ...trip,
            budget: suggested.categories
          });
        }, 0);
        
        console.log('✅ [useBudgetSync] Budget inizializzato:', suggested.total, '€');
      } else {
        console.log('✓ [useBudgetSync] Budget già presente, skip inizializzazione');
      }
      
      return; // ← Esci subito, non fare altro
    }

    // 2️⃣ AGGIORNAMENTI SUCCESSIVI: Solo se cambiano giorni/membri
    const daysChanged = currentDays !== prevDaysRef.current;
    const membersChanged = currentMembers !== prevMembersRef.current;

    // 🚀 OTTIMIZZAZIONE: Esci subito se nulla è cambiato
    if (!daysChanged && !membersChanged) {
      return;
    }

    console.log('🔄 [useBudgetSync] Ricalcolo automatico budget');
    console.log('   Giorni:', prevDaysRef.current, '→', currentDays);
    console.log('   Membri:', prevMembersRef.current, '→', currentMembers);

    const suggested = getSuggestedBudget(trip);
    
    // Salva in modo asincrono
    setTimeout(() => {
      onUpdateTrip({
        ...trip,
        budget: suggested.categories
      });
    }, 0);

    // Aggiorna riferimenti
    prevDaysRef.current = currentDays;
    prevMembersRef.current = currentMembers;

    console.log('✅ [useBudgetSync] Budget aggiornato:', suggested.total, '€');
  }, [
    trip.days?.length,
    Object.values(trip.sharing?.members || {}).filter(m => m.status === 'active').length
  ]);
};