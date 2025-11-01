import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import TravelPlannerApp from "./components/TravelPlanner";
import AuthPage from "./components/AuthPage";
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadUserProfile } from './services';

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();
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
          
          // ⭐ Controlla se c'è un redirect da fare dopo login
          const redirectPath = sessionStorage.getItem('redirectAfterLogin');
          if (redirectPath && redirectPath !== '/') {
            console.log('🔗 Redirect dopo login a:', redirectPath);
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Aspetta un attimo per assicurarsi che il profilo sia caricato
            setTimeout(() => {
              navigate(redirectPath);
            }, 100);
          }
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
  }, [navigate]);

  // Mostra loading mentre verifica l'auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    );
  }

  return (
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
  );
}

export default App;