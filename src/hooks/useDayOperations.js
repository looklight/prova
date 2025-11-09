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
 */

import { useState } from 'react';

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

  const removeSelectedDays = () => {
    if (selectedDays.length === 0) return;
    
    // Se si rimuovono tutti i giorni, crea un nuovo giorno
    if (selectedDays.length === trip.days.length) {
      const newDay = { id: Date.now(), date: new Date(), number: 1 };
      onUpdateTrip({ days: [newDay], data: {} });
      setSelectedDays([]);
      return;
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
    
    onUpdateTrip({ days: updatedDays });
    setSelectedDays([]);
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
    
    // Calcola indice di inserimento corretto
    let insertIndex = moveAfterIndex + 1;
    for (let i = 0; i < selectedDays.length; i++) {
      if (selectedDays[i] < moveAfterIndex) insertIndex--;
    }
    
    // Inserisce i giorni selezionati nella nuova posizione
    remainingDays.splice(insertIndex, 0, ...selectedDayObjects);
    remainingDays.forEach((day, index) => { day.number = index + 1; });
    
    // Ricalcola tutte le date in sequenza
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
    
    // Propaga il cambiamento ai giorni successivi
    for (let i = dayIndex + 1; i < updatedDays.length; i++) {
      const prevDate = new Date(updatedDays[i - 1].date);
      prevDate.setDate(prevDate.getDate() + 1);
      updatedDays[i].date = prevDate;
    }
    
    onUpdateTrip({ days: updatedDays });
  };

  return {
    selectedDays,
    moveAfterIndex,
    setMoveAfterIndex,
    addDay,
    removeSelectedDays,
    toggleDaySelection,
    moveDaysAfter,
    updateDayDate
  };
};