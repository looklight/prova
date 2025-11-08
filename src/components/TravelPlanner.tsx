import React, { useState, useEffect, useMemo } from 'react';
import HomeView from './HomeView';
import TripView from './TripView';
import ProfileView from './ProfileView';
import { CATEGORIES } from './constants';
import { subscribeToUserTrips, createTrip, updateTrip, deleteTripForUser, loadUserProfile } from "../services";

const TravelPlannerApp = ({ user }) => {
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userProfile, setUserProfile] = useState(null);

  // 🚀 OTTIMIZZAZIONE: Monitora connessione (già ottimale)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 Connessione ripristinata');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Connessione persa');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 🚀 OTTIMIZZAZIONE 1: Carica profilo in parallelo con viaggi
  useEffect(() => {
    if (!user) return;

    console.time('📝 Load Profile'); // ← Misura tempo
    
    const loadProfile = async () => {
      try {
        const profile = await loadUserProfile(user.uid, user.email);
        setUserProfile(profile);
        console.timeEnd('📝 Load Profile');
        console.log('✅ Profilo caricato:', profile.displayName);
      } catch (error) {
        console.error('❌ Errore caricamento profilo:', error);
        // Fallback ai dati Auth
        setUserProfile({
          displayName: user.displayName || 'Utente',
          username: null,
          avatar: user.photoURL,
          email: user.email
        });
        console.timeEnd('📝 Load Profile');
      }
    };

    loadProfile();
  }, [user]);

  // 🚀 OTTIMIZZAZIONE 2: Listener viaggi con early UI update
  useEffect(() => {
    if (!user?.uid) return;
    
    console.time('📦 Load Trips'); // ← Misura tempo
    console.log('🔄 Inizializzazione listener real-time...');
    
    const unsubscribe = subscribeToUserTrips(
      user.uid,
      (updatedTrips) => {
        console.timeEnd('📦 Load Trips');
        console.log('🔥 Viaggi aggiornati:', updatedTrips.length);
        
        setTrips(updatedTrips);
        setLoading(false); // ← Mostra UI appena arrivano i viaggi
      },
      (error) => {
        console.error('❌ Errore listener viaggi:', error);
        setLoading(false); // ← Mostra UI anche in caso di errore
        alert('Errore nella sincronizzazione dei viaggi');
      }
    );
    
    return () => {
      console.log('🔌 Disconnessione listener');
      unsubscribe();
      setTrips([]);
      setCurrentTripId(null);
      setLoading(true);
    };
  }, [user?.uid]);

  // 🚀 OTTIMIZZAZIONE 3: Memoize currentTrip per evitare ricalcoli
  const currentTrip = useMemo(() => {
    return trips.find(t => t.id === currentTripId);
  }, [trips, currentTripId]);
  
  const updateCurrentTrip = async (updates) => {
    try {
      console.log('💾 Salvataggio modifiche...');
      
      // Salva su Firestore in background
      await updateTrip(user.uid, currentTripId, updates);
      
      console.log('✅ Modifiche salvate su Firestore');
      
    } catch (error) {
      console.error('❌ Errore aggiornamento viaggio:', error);
      alert('Errore nel salvataggio delle modifiche');
    }
  };

  const createNewTrip = async (metadata) => {
    try {
      const finalName = metadata?.name || 'Nuovo Viaggio';
      
      const newTrip = {
        id: Date.now(),
        name: finalName,
        image: metadata?.image || null,
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
      
      console.log('💾 Creazione nuovo viaggio...');
      
      // 🚀 OTTIMIZZAZIONE: Usa profilo se disponibile, altrimenti Auth
      const ownerProfile = userProfile ? {
        uid: user.uid,
        displayName: userProfile.displayName,
        username: userProfile.username,
        avatar: userProfile.avatar
      } : {
        uid: user.uid,
        displayName: user.displayName || 'Utente',
        username: null,
        avatar: user.photoURL
      };
      
      await createTrip(newTrip, ownerProfile);
      
      console.log('✅ Viaggio creato');
      
      // 🚀 OTTIMIZZAZIONE: Apri subito il viaggio (UI ottimistica)
      setCurrentTripId(newTrip.id);
      setCurrentView('trip');
      
    } catch (error) {
      console.error('❌ Errore creazione viaggio:', error);
      alert('Errore nella creazione del viaggio');
    }
  };

  const deleteTripHandler = async (tripId) => {
    try {
      console.log('🗑️ Eliminazione viaggio...');
      await deleteTripForUser(user.uid, tripId);
      console.log('✅ Viaggio eliminato');
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
          alert('❌ File non valido!');
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

        const ownerProfile = userProfile ? {
          uid: user.uid,
          displayName: userProfile.displayName,
          username: userProfile.username,
          avatar: userProfile.avatar
        } : {
          uid: user.uid,
          displayName: user.displayName || 'Utente',
          username: null,
          avatar: user.photoURL
        };
        
        await createTrip(newTrip, ownerProfile);
        
        console.log('✅ Viaggio importato');
        alert(`✅ Viaggio "${tripName}" importato con successo!`);
      } catch (error) {
        console.error('❌ Errore import:', error);
        alert('❌ Errore durante l\'importazione!');
      }
    };
    reader.readAsText(file);
  };

  // 🚀 OTTIMIZZAZIONE 4: Progressive loading - mostra UI appena possibile
  // Mostra loading SOLO se non abbiamo né viaggi né profilo
  if (loading && trips.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-2">Caricamento...</div>
          <div className="text-sm text-gray-400">
            {!userProfile && '📝 Caricamento profilo...'}
            {!trips.length && '📦 Caricamento viaggi...'}
          </div>
        </div>
      </div>
    );
  }

  // 🚀 OTTIMIZZAZIONE 5: Usa profilo base se non ancora caricato
  const effectiveUserProfile = userProfile || {
    displayName: user.displayName || 'Utente',
    username: null,
    avatar: user.photoURL,
    email: user.email
  };

  const userProps = {
    uid: user.uid,
    displayName: effectiveUserProfile.displayName,
    photoURL: effectiveUserProfile.avatar,
    username: effectiveUserProfile.username,
    email: effectiveUserProfile.email
  };

  if (currentView === 'home') {
    return <HomeView 
      trips={trips}
      loading={loading}
      onCreateNew={createNewTrip} 
      onOpenTrip={openTrip}
      onDeleteTrip={deleteTripHandler}
      onExportTrip={exportTrip}
      onImportTrip={importTrip}
      onOpenProfile={() => setCurrentView('profile')}
      currentUser={userProps}
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
        currentUser={userProps}
      />
    );
  }
};

export default TravelPlannerApp;