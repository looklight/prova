import React, { useState, useEffect } from 'react';
import HomeView from './HomeView';
import TripView from './TripView';
import ProfileView from './ProfileView';
import { CATEGORIES } from './constants';
import { subscribeToUserTrips, saveTrip, updateTrip, deleteTrip } from './firestoreService';

const TravelPlannerApp = ({ user }) => {
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ⭐ MODIFICATO: Usa listener real-time invece di caricamento singolo
  useEffect(() => {
    if (!user) return;
    
    console.log('🔄 Inizializzazione listener real-time...');
    setLoading(true);
    
    // Sottoscrivi ai viaggi con listener real-time
    const unsubscribe = subscribeToUserTrips(
      user.uid,
      (updatedTrips) => {
        // ⭐ Callback chiamata ogni volta che i dati cambiano su Firestore
        console.log('📥 Viaggi aggiornati da Firestore:', updatedTrips.length);
        setTrips(updatedTrips);
        setLoading(false);
      },
      (error) => {
        // Gestione errori del listener
        console.error('❌ Errore listener viaggi:', error);
        alert('Errore nella sincronizzazione dei viaggi');
        setLoading(false);
      }
    );
    
    // ⭐ IMPORTANTE: Cleanup quando il componente si smonta o user cambia
    return () => {
      console.log('🔌 Disconnessione listener real-time');
      unsubscribe();
    };
  }, [user]);

  const getCurrentTrip = () => trips.find(t => t.id === currentTripId);
  
  const updateCurrentTrip = async (updates) => {
    try {
      // ⭐ MODIFICATO: Aggiorna SOLO su Firestore
      // Il listener real-time aggiornerà automaticamente lo stato locale
      await updateTrip(user.uid, currentTripId, updates);
      
      // ⭐ OPZIONALE: Aggiornamento ottimistico locale per UI immediata
      // (il listener sovrascriverà con i dati reali da Firestore)
      setTrips(trips.map(t => t.id === currentTripId ? { ...t, ...updates } : t));
      
    } catch (error) {
      console.error('❌ Errore aggiornamento viaggio:', error);
      alert('Errore nel salvataggio delle modifiche');
      
      // ⭐ In caso di errore, il listener manterrà i dati corretti da Firestore
    }
  };

  const createNewTrip = async () => {
    try {
      const newTrip = {
        id: Date.now(),
        name: 'Nuovo Viaggio',
        image: null,
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        days: [{ id: Date.now(), date: new Date(), number: 1 }],
        data: {}
      };
      
      // Salva su Firestore
      await saveTrip(user.uid, newTrip);
      
      // ⭐ Il listener aggiungerà automaticamente il viaggio allo stato
      // Ma per UI immediata, lo aggiungiamo anche localmente
      setTrips([newTrip, ...trips]);
      setCurrentTripId(newTrip.id);
      setCurrentView('trip');
    } catch (error) {
      console.error('❌ Errore creazione viaggio:', error);
      alert('Errore nella creazione del viaggio');
    }
  };

  const deleteTripHandler = async (tripId) => {
    try {
      // Elimina da Firestore
      await deleteTrip(user.uid, tripId);
      
      // ⭐ Il listener aggiornerà automaticamente lo stato
      // Ma per UI immediata, rimuoviamo anche localmente
      setTrips(prevTrips => prevTrips.filter(t => t.id !== tripId));
    } catch (error) {
      console.error('❌ Errore eliminazione viaggio:', error);
      alert('Errore nell\'eliminazione del viaggio');
    }
  };

  const openTrip = (tripId) => {
    setCurrentTripId(tripId);
    setCurrentView('trip');
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

  const importTrip = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
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
          createdAt: new Date(),
          updatedAt: new Date(),
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
                bookingStatus: categoryData.bookingStatus || 'na',
                transportMode: categoryData.transportMode || 'none',
                links: categoryData.links || [],
                images: categoryData.images || [],
                videos: categoryData.videos || [],
                mediaNotes: categoryData.mediaNotes || []
              };
            });
          }
        });

        // Salva su Firestore
        await saveTrip(user.uid, newTrip);
        
        // ⭐ Il listener aggiungerà automaticamente il viaggio
        // Ma per UI immediata, lo aggiungiamo anche localmente
        setTrips([newTrip, ...trips]);
        alert(`✅ Viaggio "${tripName}" importato con successo!`);
      } catch (error) {
        console.error('❌ Errore durante import:', error);
        alert('❌ Errore durante l\'importazione!\n\nIl file potrebbe essere corrotto o in un formato non supportato.');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Caricamento viaggi...</div>
      </div>
    );
  }

  if (currentView === 'home') {
    return <HomeView 
      trips={trips} 
      onCreateNew={createNewTrip} 
      onOpenTrip={openTrip} 
      onDeleteTrip={deleteTripHandler}
      onExportTrip={exportTrip}
      onImportTrip={importTrip}
      onOpenProfile={() => setCurrentView('profile')}
    />;
  }

  if (currentView === 'profile') {
    return <ProfileView onBack={() => setCurrentView('home')} user={user} />;
  }

  const currentTrip = getCurrentTrip();
  if (!currentTrip) return null;

  if (currentView === 'trip') {
    return (
      <TripView
        trip={currentTrip}
        onUpdateTrip={updateCurrentTrip}
        onBackToHome={() => setCurrentView('home')}
      />
    );
  }
};

export default TravelPlannerApp;