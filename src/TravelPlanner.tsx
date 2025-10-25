import React, { useState, useEffect, useMemo } from 'react';
import HomeView from './HomeView';
import TripView from './TripView';
import ProfileView from './ProfileView';
import { CATEGORIES } from './constants';
import { subscribeToUserTrips, saveTrip, updateTrip, deleteTrip, loadUserProfile } from './firestoreService';

const TravelPlannerApp = ({ user }) => {
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userProfile, setUserProfile] = useState(null); // ⭐ NUOVO: Profilo Firestore

  // ⭐ AGGIUNTO: Monitora connessione
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 Connessione ripristinata');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Connessione persa - le modifiche saranno sincronizzate quando torni online');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ⭐ NUOVO: Carica profilo utente da Firestore
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        console.log('📝 Caricamento profilo Firestore...');
        const profile = await loadUserProfile(user.uid, user.email);
        setUserProfile(profile);
        console.log('✅ Profilo caricato:', profile.displayName, profile.username);
      } catch (error) {
        console.error('❌ Errore caricamento profilo:', error);
        // In caso di errore, usa i dati base di Firebase Auth
        setUserProfile({
          displayName: user.displayName || 'Utente',
          username: null,
          avatar: user.photoURL,
          email: user.email
        });
      }
    };

    loadProfile();
  }, [user]);

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

  // ⭐ AGGIUNTO: Usa useMemo per garantire che currentTrip venga ricalcolato quando trips cambia
  const currentTrip = useMemo(() => {
    const trip = trips.find(t => t.id === currentTripId);
    if (trip) {
      console.log('🔄 currentTrip aggiornato:', trip.name, 'updatedAt:', trip.updatedAt);
    }
    return trip;
  }, [trips, currentTripId]);
  
  const updateCurrentTrip = async (updates) => {
    try {
      console.log('💾 Salvataggio modifiche...', updates);
      
      // ⭐ Aggiornamento ottimistico LOCALE per UI immediata
      // Usa setTrips con callback per avere sempre lo stato più fresco
      setTrips(prevTrips => 
        prevTrips.map(t => 
          t.id === currentTripId ? { ...t, ...updates } : t
        )
      );
      
      // Salva su Firestore in background
      await updateTrip(user.uid, currentTripId, updates);
      
      console.log('✅ Modifiche salvate su Firestore');
      
      // Il listener riceverà la conferma e aggiornerà con i dati ufficiali
      
    } catch (error) {
      console.error('❌ Errore aggiornamento viaggio:', error);
      alert('Errore nel salvataggio delle modifiche');
      
      // In caso di errore, il listener ripristinerà i dati corretti
    }
  };

  const createNewTrip = async (metadata) => {
    try {
      // 🆕 Usa i metadata dal modal (o valori di default se non forniti)
      const finalName = metadata?.name || 'Nuovo Viaggio';
      
      const newTrip = {
        id: Date.now(),
        name: finalName, // Retrocompatibilità
        image: metadata?.image || null, // Retrocompatibilità
        // 🆕 Nuova struttura metadata
        metadata: {
          name: finalName,
          image: metadata?.image || null,
          destinations: metadata?.destinations || [],
          description: metadata?.description || ''
        },
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        days: [{ id: Date.now(), date: new Date(), number: 1 }],
        data: {}
      };
      
      console.log('💾 Creazione nuovo viaggio su Firestore...', newTrip.metadata);
      
      // Salva su Firestore (saveTrip ora gestisce metadata e sharing automaticamente)
      await saveTrip(user.uid, newTrip);
      
      console.log('✅ Viaggio creato, listener aggiornerà lo stato');
      
      // Il listener aggiungerà automaticamente il viaggio allo stato
      // Imposta subito la vista per evitare lag percepibile
      setCurrentTripId(newTrip.id);
      setCurrentView('trip');
      
    } catch (error) {
      console.error('❌ Errore creazione viaggio:', error);
      alert('Errore nella creazione del viaggio');
    }
  };

  const deleteTripHandler = async (tripId) => {
    try {
      console.log('🗑️ Eliminazione viaggio da Firestore...');
      
      // Elimina da Firestore
      await deleteTrip(user.uid, tripId);
      
      console.log('✅ Viaggio eliminato, listener aggiornerà lo stato');
      
      // Il listener aggiornerà automaticamente lo stato rimuovendo il viaggio
      
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
        
        console.log('✅ Viaggio importato, listener aggiornerà lo stato');
        
        // Il listener aggiungerà automaticamente il viaggio
        alert(`✅ Viaggio "${tripName}" importato con successo!`);
      } catch (error) {
        console.error('❌ Errore durante import:', error);
        alert('❌ Errore durante l\'importazione!\n\nIl file potrebbe essere corrotto o in un formato non supportato.');
      }
    };
    reader.readAsText(file);
  };

  if (loading || !userProfile) {
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
      currentUser={{
        uid: user.uid,
        displayName: userProfile.displayName || user.displayName || 'Utente',
        photoURL: userProfile.avatar || user.photoURL, // ⭐ USA 'avatar' da Firestore!
        username: userProfile.username,
        email: userProfile.email
      }}
    />;
  }

  if (currentView === 'profile') {
    return <ProfileView onBack={() => setCurrentView('home')} user={user} trips={trips} />;
  }

  if (!currentTrip) return null;

  if (currentView === 'trip') {
    return (
      <TripView
        key={currentTripId}
        trip={currentTrip}
        onUpdateTrip={updateCurrentTrip}
        onBackToHome={() => setCurrentView('home')}
        currentUser={{
          uid: user.uid,
          displayName: userProfile.displayName || user.displayName || 'Utente',
          photoURL: userProfile.avatar || user.photoURL, // ⭐ USA 'avatar' da Firestore!
          username: userProfile.username,
          email: userProfile.email
        }}
      />
    );
  }
};

export default TravelPlannerApp;