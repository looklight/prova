import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TravelPlannerApp from "./components/TravelPlanner";
import AuthPage from "./components/AuthPage";
import JoinTripPage from "./components/JoinTripPage";
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadUserProfile } from './services';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ascolta i cambiamenti dello stato di autenticazione
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('👤 Utente corrente:', currentUser);
      setUser(currentUser);
      
      // Carica profilo utente se loggato
      if (currentUser) {
        try {
          const profile = await loadUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('❌ Errore caricamento profilo:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    // Cleanup: rimuovi listener quando il componente si smonta
    return () => unsubscribe();
  }, []);

  // Mostra loading mentre verifica l'auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Route principale */}
        <Route 
          path="/" 
          element={
            user ? (
              <TravelPlannerApp user={user} />
            ) : (
              <AuthPage onAuthSuccess={() => console.log('Login effettuato!')} />
            )
          } 
        />

        {/* ⭐ Route per join via link */}
        <Route 
          path="/join/:tripId/:linkId" 
          element={
            user ? (
              <JoinTripPage 
                currentUser={user} 
                userProfile={userProfile}
              />
            ) : (
              <JoinTripLoginPrompt />
            )
          } 
        />

        {/* Route 404 - catch all */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-6">Pagina non trovata</p>
                <a 
                  href="/" 
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-block"
                >
                  Torna alla Home
                </a>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

// Componente per login quando utente non autenticato clicca link
const JoinTripLoginPrompt = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✈️</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Sei stato invitato!
        </h2>
        <p className="text-gray-600 mb-6">
          Effettua l accesso per unirti al viaggio
        </p>
        <a href="/" className="block w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
          Accedi per continuare
        </a>
        <p className="text-xs text-gray-500 mt-4">
          Il link rimarra valido dopo il login
        </p>
      </div>
    </div>
  );
};

export default App;