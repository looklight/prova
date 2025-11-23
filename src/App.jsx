import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import TravelPlannerApp from "./components/TravelPlanner.tsx";
import AuthPage from "./components/AuthPage.tsx";
import InviteHandler from "./components/InviteHandler.tsx";
import CookieBanner from "./components/Legal/CookieBanner.tsx";
import LoadingScreen from "./components/LoadingScreen.tsx";
import { PrivacyPage, TermsPage, CookiePage } from "./pages/LegalPages.tsx";
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
      
      // 🆕 Controlla email verification (se abilitata)
      const requireVerification = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true';
      const testEmails = ['test@looktravel.app', 'demo@looktravel.app'];
      const isTestEmail = currentUser?.email && testEmails.includes(currentUser.email.toLowerCase());
      
      if (currentUser && requireVerification && !isTestEmail && !currentUser.emailVerified) {
        console.log('⚠️ Email non verificata, logout automatico');
        await auth.signOut();
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }
      
      setUser(currentUser);

      // Carica profilo utente se loggato
      if (currentUser) {
        try {
          const profile = await loadUserProfile(currentUser.uid, currentUser.email);
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

  // ✅ Mostra LoadingScreen elegante invece del testo generico
  if (loading) {
    return <LoadingScreen message="Inizializzazione..." />;
  }

  return (
    <>
      {/* 🆕 COOKIE BANNER - Mostra su tutte le pagine */}
      <CookieBanner 
        onAccept={() => {
          console.log('🍪 Cookie analitici accettati');
        }}
        onReject={() => {
          console.log('🍪 Cookie analitici rifiutati (Analytics rimane attivo)');
        }}
      />

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

        {/* ⭐ ROUTE: Gestione inviti via link */}
        <Route 
          path="/invite/:token" 
          element={
            <InviteHandler 
              userProfile={userProfile && user ? {
                uid: user.uid,
                displayName: userProfile.displayName,
                username: userProfile.username,
                avatar: userProfile.avatar
              } : undefined}
            />
          } 
        />

        {/* 🆕 ROUTES LEGALI */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiePage />} />

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
    </>
  );
}

export default App;