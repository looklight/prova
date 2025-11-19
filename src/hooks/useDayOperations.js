/**
 * 📅 useDayOperations
 * 
 * @description Hook per operazioni CRUD sui giorni del viaggio
 * @usage Usato da: CalendarView
 * 
 * Funzionalità:
 * - Aggiunta/rimozione giorni
 * - Selezione multipla giorni (edit mode)
 * - Spostamento giorni con ricalcolo date consecutive
 * - Modifica data con propagazione ai giorni successivi
 * - 🆕 Cleanup automatico immagini su eliminazione
 */

import { useState } from 'react';
import { cleanupDaysImages } from '../utils/storageCleanup';

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
      
      // 🆕 CLEANUP: Elimina tutte le immagini prima di resettare
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

    // 🆕 CLEANUP: Ottieni ID dei giorni da eliminare
    const daysToRemove = selectedDays.map(index => trip.days[index].id);
    console.log(`🧹 Cleanup ${daysToRemove.length} giorni...`);
    
    // 🆕 Elimina immagini dai giorni selezionati (non blocca se fallisce)
    try {
      await cleanupDaysImages(trip.data, daysToRemove);
    } catch (error) {
      console.error('⚠️ Errore cleanup, continuo comunque:', error);
    }

    // Filtra i giorni rimanenti
    const updatedDays = trip.days.filter((_, index) => !selectedDays.includes(index));

    // Ricalcola numeri E date in sequenza
    const startDate = new Date(updatedDays[0].date);
    updatedDays.forEach((day, index) => {
      day.number = index + 1;
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + index);
      day.date = newDate;
    });

    // 🆕 Pulisci anche i dati (trip.data) dei giorni rimossi
    const updatedData = { ...trip.data };
    const categoryIds = [
      'base', 'pernottamento',
      'attivita1', 'attivita2', 'attivita3',
      'spostamenti1', 'spostamenti2',
      'ristori1', 'ristori2',
      'note'
    ];

    daysToRemove.forEach(dayId => {
      categoryIds.forEach(catId => {
        delete updatedData[`${dayId}-${catId}`];
      });
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

  const moveDaysAfter = () => {
    if (selectedDays.length === 0 || moveAfterIndex === null) return;

    const updatedDays = [...trip.days];
    const selectedDayObjects = selectedDays.map(i => updatedDays[i]);
    const remainingDays = updatedDays.filter((_, i) => !selectedDays.includes(i));

    let insertIndex = moveAfterIndex + 1;
    for (let i = 0; i < selectedDays.length; i++) {
      if (selectedDays[i] < moveAfterIndex) insertIndex--;
    }

    remainingDays.splice(insertIndex, 0, ...selectedDayObjects);
    remainingDays.forEach((day, index) => { day.number = index + 1; });

    const startDate = new Date(remainingDays[0].date);
    remainingDays.forEach((day, index) => {
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + index);
      day.date = newDate;
    });

    onUpdateTrip({ days: remainingDays });
    setSelectedDays([]);
    setMoveAfterIndex(null);
  };

  const updateDayDate = (dayIndex, newDate) => {
    const updatedDays = [...trip.days];
    updatedDays[dayIndex].date = new Date(newDate);

    for (let i = dayIndex + 1; i < updatedDays.length; i++) {
      const prevDate = new Date(updatedDays[i - 1].date);
      prevDate.setDate(prevDate.getDate() + 1);
      updatedDays[i].date = prevDate;
    }

    onUpdateTrip({ days: updatedDays });
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