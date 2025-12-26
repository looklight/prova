/**
 * 📅 useDayOperations - ALTROVE VERSION
 * 
 * @description Hook per operazioni CRUD sui giorni del viaggio
 * @usage Usato da: CalendarView
 * 
 * Funzionalità:
 * - Aggiunta/rimozione giorni
 * - Selezione multipla giorni (edit mode)
 * - Spostamento giorni con ricalcolo date consecutive
 * - Modifica data con propagazione ai giorni successivi
 * - Cleanup automatico immagini su eliminazione
 */

import { useState } from 'react';
import { cleanupDaysImages } from '../utils/storageCleanup';

// Categorie Altrove da pulire quando si eliminano giorni
const ALTROVE_CATEGORY_IDS = [
  'destinazione',
  'attivita',
  'pernottamento',
  'note'
];

export const useDayOperations = ({ trip, onUpdateTrip }) => {
  const [selectedDays, setSelectedDays] = useState([]);
  const [moveAfterIndex, setMoveAfterIndex] = useState(null);

  const addDay = () => {
    const lastDay = trip.days[trip.days.length - 1];
    const nextDate = new Date(lastDay.date);
    nextDate.setDate(nextDate.getDate() + 1);

    onUpdateTrip({
      days: [...trip.days, {
        id: Date.now(),
        date: nextDate,
        number: trip.days.length + 1
      }]
    });
  };

  const removeSelectedDays = async () => {
    if (selectedDays.length === 0) return;

    // Se si rimuovono tutti i giorni, crea un nuovo giorno
    if (selectedDays.length === trip.days.length) {
      const newDay = { id: Date.now(), date: new Date(), number: 1 };

      // Cleanup: Elimina tutte le immagini prima di resettare
      const allDayIds = trip.days.map(d => d.id);
      console.log('🧹 Cleanup totale viaggio (reset giorni)...');

      try {
        await cleanupDaysImages(trip.data, allDayIds);
      } catch (error) {
        console.error('⚠️ Errore cleanup, continuo comunque:', error);
      }

      onUpdateTrip({ days: [newDay], data: {} });
      setSelectedDays([]);
      return;
    }

    // Ottieni ID dei giorni da eliminare
    const daysToRemove = selectedDays.map(index => trip.days[index].id);
    console.log(`🧹 Cleanup ${daysToRemove.length} giorni...`);

    // Elimina immagini dai giorni selezionati (non blocca se fallisce)
    try {
      await cleanupDaysImages(trip.data, daysToRemove);
    } catch (error) {
      console.error('⚠️ Errore cleanup, continuo comunque:', error);
    }

    // Filtra i giorni rimanenti e crea nuovi oggetti (immutabilità)
    const filteredDays = trip.days.filter((_, index) => !selectedDays.includes(index));
    const startDate = new Date(filteredDays[0].date);

    // Ricalcola numeri E date in sequenza con nuovi oggetti
    const updatedDays = filteredDays.map((day, index) => {
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + index);
      return {
        ...day,
        number: index + 1,
        date: newDate
      };
    });

    // Pulisci anche i dati (trip.data) dei giorni rimossi
    const updatedData = { ...trip.data };

    daysToRemove.forEach(dayId => {
      // Rimuovi categorie Altrove
      ALTROVE_CATEGORY_IDS.forEach(catId => {
        delete updatedData[`${dayId}-${catId}`];
      });
      
      // Rimuovi altre spese
      delete updatedData[`${dayId}-otherExpenses`];
    });

    onUpdateTrip({
      days: updatedDays,
      data: updatedData
    });

    setSelectedDays([]);
    console.log('✅ Giorni eliminati con cleanup immagini');
  };

  const toggleDaySelection = (index) => {
    setSelectedDays(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const moveDaysAfter = (targetIndex = moveAfterIndex) => {
    if (selectedDays.length === 0 || targetIndex === null) return;

    const selectedDayObjects = selectedDays.map(i => trip.days[i]);
    const remainingDays = trip.days.filter((_, i) => !selectedDays.includes(i));

    let insertIndex = targetIndex + 1;
    for (let i = 0; i < selectedDays.length; i++) {
      if (selectedDays[i] < targetIndex) insertIndex--;
    }

    // Inserisci giorni selezionati nella nuova posizione
    remainingDays.splice(insertIndex, 0, ...selectedDayObjects);

    // Crea nuovi oggetti con numeri e date aggiornate (immutabilità)
    const startDate = new Date(remainingDays[0].date);
    const updatedDays = remainingDays.map((day, index) => {
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + index);
      return {
        ...day,
        number: index + 1,
        date: newDate
      };
    });

    onUpdateTrip({ days: updatedDays });
    setSelectedDays([]);
    setMoveAfterIndex(null);
  };

  const updateDayDate = (dayIndex, newDate) => {
    const updatedDays = [...trip.days];
    const changedDate = new Date(newDate);

    // Aggiorna il giorno modificato
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      date: changedDate
    };

    // Aggiorna giorni PRECEDENTI (all'indietro)
    for (let i = dayIndex - 1; i >= 0; i--) {
      const nextDate = new Date(updatedDays[i + 1].date);
      nextDate.setDate(nextDate.getDate() - 1);
      updatedDays[i] = {
        ...updatedDays[i],
        date: nextDate
      };
    }

    // Aggiorna giorni SUCCESSIVI (in avanti)
    for (let i = dayIndex + 1; i < updatedDays.length; i++) {
      const prevDate = new Date(updatedDays[i - 1].date);
      prevDate.setDate(prevDate.getDate() + 1);
      updatedDays[i] = {
        ...updatedDays[i],
        date: prevDate
      };
    }

    // Aggiorna anche startDate per mantenere sincronizzazione
    const newStartDate = new Date(updatedDays[0].date);
    onUpdateTrip({ days: updatedDays, startDate: newStartDate });
  };

  const resetEditMode = () => {
    setSelectedDays([]);
    setMoveAfterIndex(null);
  };

  return {
    selectedDays,
    moveAfterIndex,
    setMoveAfterIndex,
    addDay,
    removeSelectedDays,
    toggleDaySelection,
    moveDaysAfter,
    updateDayDate,
    resetEditMode
  };
};