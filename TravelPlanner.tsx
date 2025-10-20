// ...existing code...
import React, { useState } from 'react';
import HomeView from './HomeView';
import CalendarView from './CalendarView';
import DayDetailView from './DayDetailView';
import ProfileView from './ProfileView';
import { CATEGORIES } from './constants';

const TravelPlannerApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [scrollToDayId, setScrollToDayId] = useState(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState(null);
  const [enteredFromDayIndex, setEnteredFromDayIndex] = useState(null);

  const getCurrentTrip = () => trips.find(t => t.id === currentTripId);
  
  const updateCurrentTrip = (updates) => {
    setTrips(trips.map(t => t.id === currentTripId ? { ...t, ...updates } : t));
  };

  const createNewTrip = () => {
    const newTrip = {
      id: Date.now(),
      name: 'Nuovo Viaggio',
      image: null,
      startDate: new Date(),
      days: [{ id: Date.now(), date: new Date(), number: 1 }],
      data: {}
    };
    setTrips([...trips, newTrip]);
    setCurrentTripId(newTrip.id);
    setCurrentView('calendar');
  };

  const deleteTrip = (tripId) => {
    setTrips(prevTrips => prevTrips.filter(t => t.id !== tripId));
  };

  const openTrip = (tripId) => {
    setCurrentTripId(tripId);
    setCurrentView('calendar');
  };

  const exportTrip = (tripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    const exportData = {
      version: "1.0",
      trip: {
        name: trip.name,
        image: trip.image,
        startDate: trip.startDate.toISOString(),
        days: trip.days.map(day => ({
          number: day.number,
          date: day.date.toISOString(),
          categories: {}
        }))
      }
    };

    const categoryIds = ['base', 'pernottamento', 'attivita1', 'attivita2', 'attivita3', 
                         'spostamenti1', 'spostamenti2', 'ristori1', 'ristori2', 'note'];
    
    trip.days.forEach((day, dayIndex) => {
      categoryIds.forEach(catId => {
        const data = trip.data[`${day.id}-${catId}`];
        if (data && (data.title || data.cost || data.notes)) {
          exportData.trip.days[dayIndex].categories[catId] = data;
        }
      });
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTrip = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        if (!importData.trip || !importData.trip.days) {
          alert('❌ File non valido!\n\nAssicurati di importare un file esportato da questa app.');
          return;
        }

        let tripName = importData.trip.name;
        let counter = 2;
        while (trips.some(t => t.name === tripName)) {
          tripName = `${importData.trip.name} (${counter})`;
          counter++;
        }

        const newTrip = {
          id: Date.now(),
          name: tripName,
          image: importData.trip.image || null,
          startDate: new Date(importData.trip.startDate),
          days: importData.trip.days.map(day => ({
            id: Date.now() + Math.random(),
            date: new Date(day.date),
            number: day.number
          })),
          data: {}
        };

        importData.trip.days.forEach((day, dayIndex) => {
          const newDayId = newTrip.days[dayIndex].id;
          
          if (day.categories) {
            Object.keys(day.categories).forEach(catId => {
              const categoryData = day.categories[catId];
              newTrip.data[`${newDayId}-${catId}`] = {
                title: categoryData.title || '',
                cost: categoryData.cost || '',
                notes: categoryData.notes || '',
                bookingStatus: categoryData.bookingStatus || 'na'
              };
            });
          }
        });

        setTrips([...trips, newTrip]);
        alert(`✅ Viaggio "${tripName}" importato con successo!`);
      } catch (error) {
        console.error('Errore durante import:', error);
        alert('❌ Errore durante l\\'importazione!\n\nIl file potrebbe essere corrotto o in un formato non supportato.');
      }
    };
    reader.readAsText(file);
  };

  if (currentView === 'home') {
    return <HomeView 
      trips={trips} 
      onCreateNew={createNewTrip} 
      onOpenTrip={openTrip} 
      onDeleteTrip={deleteTrip}
      onExportTrip={exportTrip}
      onImportTrip={importTrip}
      onOpenProfile={() => setCurrentView('profile')}
    />;
  }

  if (currentView === 'profile') {
    return <ProfileView onBack={() => setCurrentView('home')} />;
  }

  const currentTrip = getCurrentTrip();
  if (!currentTrip) return null;

  if (currentView === 'calendar') {
    return (
      <CalendarView
        trip={currentTrip}
        onUpdateTrip={updateCurrentTrip}
        onBack={() => setCurrentView('home')}
        onOpenDay={(dayIndex, scrollPosition) => {
          setSelectedDayIndex(dayIndex);
          setEnteredFromDayIndex(dayIndex);
          setSavedScrollPosition(scrollPosition);
          setCurrentView('dayDetail');
        }}
        scrollToDayId={scrollToDayId}
        savedScrollPosition={savedScrollPosition}
        onScrollComplete={() => {
          setScrollToDayId(null);
          setSavedScrollPosition(null);
        }}
      />
    );
  }

  if (currentView === 'dayDetail') {
    return (
      <DayDetailView
        trip={currentTrip}
        dayIndex={selectedDayIndex}
        onUpdateTrip={updateCurrentTrip}
        onBack={() => {
          const isSameDay = selectedDayIndex === enteredFromDayIndex;
          
          if (isSameDay && savedScrollPosition !== null) {
            setScrollToDayId(null);
          } else {
            setScrollToDayId(currentTrip.days[selectedDayIndex].id);
            setSavedScrollPosition(null);
          }
          
          setCurrentView('calendar');
        }}
        onChangeDayIndex={setSelectedDayIndex}
      />
    );
  }
};

export default TravelPlannerApp;