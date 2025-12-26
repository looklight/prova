import React, { useState, useEffect, useMemo } from 'react';
import { HomeView } from './Home';
import { TripView } from './Trip';
import { ProfileView } from './Profile';
import { LoadingScreen } from './ui';
import { CATEGORIES } from '../utils/constants';
import {
  subscribeToUserTrips,
  createTrip,
  updateTrip,
  deleteTripForUser,
  loadUserProfile,
  archiveTrip,
  unarchiveTrip
} from "../services";
import { createMemberLeftNotification } from "../services/notifications/memberNotifications";
import { setAnalyticsUserId, updateUserAnalyticsProperties } from "../services/analyticsService";
import { useAnalytics } from "../hooks/useAnalytics";
import { isSeriousTrip, getUserEngagementLevel } from "../utils/analyticsHelpers";
import { calculateTripCost } from "../utils/costsUtils";
import { exportTripAsJSON, exportTripAsCSV, importTrip } from '../services/exportService';
import { useParams, useNavigate } from 'react-router-dom';

interface TripOpenOptions {
  dayIndex?: number;
  defaultTab?: 'planning' | 'notes' | 'expenses';
}

const TravelPlannerApp = ({ user }) => {
  const { tripId: urlTripId } = useParams();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('home');
  const [trips, setTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [tripOpenOptions, setTripOpenOptions] = useState<TripOpenOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userProfile, setUserProfile] = useState(null);
  const analytics = useAnalytics();

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

    console.time('🔑 Load Profile');

    const loadProfile = async () => {
      try {
        const profile = await loadUserProfile(user.uid, user.email);
        setUserProfile(profile);
        setAnalyticsUserId(user.uid);

        console.timeEnd('🔑 Load Profile');
        console.log('✅ Profilo caricato:', profile.displayName);
      } catch (error) {
        console.error('❌ Errore caricamento profilo:', error);
        setUserProfile({
          displayName: user.displayName || 'Utente',
          username: null,
          avatar: user.photoURL,
          email: user.email,
          archivedTripIds: [] // 📦 Fallback array vuoto
        });
        console.timeEnd('🔑 Load Profile');
      }
    };

    loadProfile();
  }, [user]);

  // 🚀 OTTIMIZZAZIONE 2: Listener viaggi con early UI update
  useEffect(() => {
    if (!user?.uid) return;

    console.time('📦 Load Trips');
    console.log('🔄 Inizializzazione listener real-time...');

    const unsubscribe = subscribeToUserTrips(
      user.uid,
      (updatedTrips) => {
        console.timeEnd('📦 Load Trips');
        console.log('📥 Viaggi aggiornati:', updatedTrips.length);

        setTrips(updatedTrips);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Errore listener viaggi:', error);
        setLoading(false);
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

  // 📊 Aggiorna statistiche utente per analytics
  useEffect(() => {
    if (!user?.uid || !userProfile || trips.length === 0) return;

    const seriousTrips = trips.filter(isSeriousTrip);
    const tripsAsOwner = trips.filter(t =>
      t.sharing?.members?.[user.uid]?.role === 'owner'
    ).length;

    const accountAgeDays = userProfile.createdAt
      ? Math.floor((Date.now() - (userProfile.createdAt.toDate?.() || userProfile.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    updateUserAnalyticsProperties({
      totalTrips: trips.length,
      activeTrips: trips.length,
      seriousTrips: seriousTrips.length,
      tripsAsOwner: tripsAsOwner,
      tripsAsMember: trips.length - tripsAsOwner,
      username: userProfile.username,
      avatar: userProfile.avatar,
      accountAgeDays: accountAgeDays,
      engagementLevel: getUserEngagementLevel(trips)
    });
  }, [trips.length, user?.uid, userProfile]);

  // 🆕 Apri viaggio da URL se presente
  useEffect(() => {
    if (urlTripId && trips.length > 0 && !loading) {
      const tripToOpen = trips.find(t => String(t.id) === urlTripId);
      if (tripToOpen) {
        setCurrentTripId(tripToOpen.id);
        setCurrentView('trip');
      }
    }
  }, [urlTripId, trips, loading]);

  // 🚀 OTTIMIZZAZIONE 3: Memoize currentTrip per evitare ricalcoli
  const currentTrip = useMemo(() => {
    return trips.find(t => t.id === currentTripId);
  }, [trips, currentTripId]);

  const updateCurrentTrip = async (updates) => {
    try {
      console.log('💾 Salvataggio modifiche...');
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

      // 📅 Usa date dal metadata se presenti, altrimenti default 3 giorni da oggi
      const startDate = metadata?.startDate || new Date();
      const endDate = metadata?.endDate || null;

      // Calcola numero giorni
      let dayCount = 3; // default
      if (metadata?.startDate && metadata?.endDate) {
        const diffTime = metadata.endDate.getTime() - metadata.startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        // Cap tra 1 e 90 giorni per sicurezza
        dayCount = Math.min(Math.max(diffDays, 1), 90);
      }

      const days = Array.from({ length: dayCount }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return {
          id: Date.now() + i,
          date,
          number: i + 1
        };
      });

      const newTrip = {
        id: Date.now(),
        name: finalName,
        image: metadata?.image || null,
        currency: metadata?.currency || null,
        metadata: {
          name: finalName,
          image: metadata?.image || null,
          imagePath: metadata?.imagePath || null,
          destinations: metadata?.destinations || [],
          description: metadata?.description || '',
          currency: metadata?.currency || null
        },
        startDate: startDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        days: days,
        data: {}
      };

      console.log('💾 Creazione nuovo viaggio...');

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
      analytics.trackTripCreated(newTrip);
      console.log('✅ Viaggio creato');

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
      const trip = trips.find(t => t.id === tripId);

      if (trip) {
        const memberCount = Object.keys(trip.sharing?.members || {}).length;
        const action = memberCount > 1 ? 'left' : 'deleted';
        analytics.trackTripDeleted(tripId, trip.name, action, memberCount, isSeriousTrip(trip));

        // 🆕 Se sta uscendo (non eliminando), prepara dati per notifica owner
        const isLeaving = action === 'left';
        let ownerId = null;

        if (isLeaving) {
          // Trova l'owner del viaggio
          ownerId = Object.entries(trip.sharing.members)
            .find(([_, m]) => m.role === 'owner')?.[0];
        }

        // Esegui operazione DB
        await deleteTripForUser(user.uid, tripId);
        console.log('✅ Viaggio eliminato/lasciato');

        // 🆕 Invia notifica all'owner DOPO successo operazione
        if (isLeaving && ownerId && ownerId !== user.uid) {
          const effectiveProfile = userProfile || {
            displayName: user.displayName || 'Utente',
            avatar: user.photoURL
          };

          await createMemberLeftNotification(
            ownerId,
            tripId,
            trip.name,
            {
              uid: user.uid,
              displayName: effectiveProfile.displayName,
              avatar: effectiveProfile.avatar
            }
          );
        }
      } else {
        await deleteTripForUser(user.uid, tripId);
        console.log('✅ Viaggio eliminato');
      }
    } catch (error) {
      console.error('❌ Errore eliminazione viaggio:', error);
      alert('Errore nell\'eliminazione del viaggio');
    }
  };

  // 📦 Handler archiviazione
  const archiveTripHandler = async (tripId) => {
    try {
      console.log('📦 Archiviazione viaggio...');
      await archiveTrip(user.uid, tripId);

      // Aggiorna stato locale profilo
      setUserProfile(prev => ({
        ...prev,
        archivedTripIds: [...(prev.archivedTripIds || []), String(tripId)]
      }));

      console.log('✅ Viaggio archiviato');
    } catch (error) {
      console.error('❌ Errore archiviazione viaggio:', error);
      alert('Errore nell\'archiviazione del viaggio');
    }
  };

  // ↩️ Handler disarchiviazione
  const unarchiveTripHandler = async (tripId) => {
    try {
      console.log('↩️ Disarchiviazione viaggio...');
      await unarchiveTrip(user.uid, tripId);

      // Aggiorna stato locale profilo
      setUserProfile(prev => ({
        ...prev,
        archivedTripIds: (prev.archivedTripIds || []).filter(id => id !== String(tripId))
      }));

      console.log('✅ Viaggio disarchiviato');
    } catch (error) {
      console.error('❌ Errore disarchiviazione viaggio:', error);
      alert('Errore nella disarchiviazione del viaggio');
    }
  };

  const openTrip = (tripId: string | number, options?: TripOpenOptions) => {
    setCurrentTripId(tripId);
    setTripOpenOptions(options || null);
    setCurrentView('trip');
  };

  // 🆕 Export base (senza media)
  const exportTripBase = (tripId) => {
    try {
      const trip = trips.find(t => t.id === tripId);
      if (!trip) {
        throw new Error('Viaggio non trovato');
      }

      exportTripAsJSON(trip, false); // ← Senza media

      const totalCost = calculateTripCost(trip);
      analytics.trackTripExported(tripId, trip.name, trip.days.length, totalCost);
    } catch (error) {
      console.error('❌ Errore export:', error);
      alert('Errore nell\'esportazione del viaggio');
    }
  };

  // 🆕 Export con media
  const exportTripWithMedia = (tripId) => {
    try {
      const trip = trips.find(t => t.id === tripId);
      if (!trip) {
        throw new Error('Viaggio non trovato');
      }

      exportTripAsJSON(trip, true); // ← Con media

      const totalCost = calculateTripCost(trip);
      analytics.trackTripExported(tripId, trip.name, trip.days.length, totalCost);
    } catch (error) {
      console.error('❌ Errore export:', error);
      alert('Errore nell\'esportazione del viaggio');
    }
  };

  // 📋 Export CSV itinerario
  const exportTripCSV = (tripId) => {
    try {
      const trip = trips.find(t => t.id === tripId);
      if (!trip) {
        throw new Error('Viaggio non trovato');
      }

      exportTripAsCSV(trip);

      const totalCost = calculateTripCost(trip);
      analytics.trackTripExported(tripId, trip.name, trip.days.length, totalCost);
      console.log('✅ CSV esportato');
    } catch (error) {
      console.error('❌ Errore export CSV:', error);
      alert('Errore nell\'esportazione CSV del viaggio');
    }
  };

  // Import
  const importTripHandler = async (file) => {
    try {
      const newTrip = await importTrip(file);

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

      const categoriesWithData = Object.keys(newTrip.data || {}).length;
      analytics.trackTripImported(newTrip.name, newTrip.days.length, categoriesWithData);

      console.log('✅ Viaggio importato:', newTrip.name);
      alert(`✅ Viaggio "${newTrip.name}" importato con successo!`);
    } catch (error) {
      console.error('❌ Errore import:', error);
      alert('❌ Errore durante l\'importazione. Verifica che il file sia valido.');
    }
  };

  // ✅ Mostra LoadingScreen semplice (solo timeline)
  if (loading && trips.length === 0) {
    return <LoadingScreen message="Caricamento" />;
  }

  // 🚀 OTTIMIZZAZIONE 5: Usa profilo base se non ancora caricato
  const effectiveUserProfile = userProfile || {
    displayName: user.displayName || 'Utente',
    username: null,
    avatar: user.photoURL,
    email: user.email,
    archivedTripIds: [] // 📦 Fallback array vuoto
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
      onArchiveTrip={archiveTripHandler}
      onUnarchiveTrip={unarchiveTripHandler}
      onExportTripBase={exportTripBase}
      onExportTripWithMedia={exportTripWithMedia}
      onExportTripCSV={exportTripCSV}
      onImportTrip={importTripHandler}
      onOpenProfile={() => setCurrentView('profile')}
      currentUser={userProps}
      archivedTripIds={effectiveUserProfile.archivedTripIds || []}
    />;
  }

  if (currentView === 'profile') {
    return (
      <ProfileView
        onBack={async () => {
          try {
            const profile = await loadUserProfile(user.uid, user.email);
            setUserProfile(profile);
          } catch (error) {
            console.error('Errore ricaricamento profilo:', error);
          }
          setCurrentView('home');
        }}
        user={user}
        trips={trips}
      />
    );
  }

  if (!currentTrip) return null;

  if (currentView === 'trip') {
    return (
      <TripView
        key={currentTripId}
        trip={currentTrip}
        onUpdateTrip={updateCurrentTrip}
        onBackToHome={() => {
          setCurrentView('home');
          setTripOpenOptions(null);
        }}
        currentUser={userProps}
        initialDayIndex={tripOpenOptions?.dayIndex}
        initialTab={tripOpenOptions?.defaultTab}
      />
    );
  }
};

export default TravelPlannerApp;