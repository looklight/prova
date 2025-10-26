import React, { useState, useEffect } from 'react';
import TravelPlannerApp from "./components/TravelPlanner";
import AuthPage from "./components/AuthPage";
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ascolta i cambiamenti dello stato di autenticazione
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('👤 Utente corrente:', currentUser);
      setUser(currentUser);
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

  // Se non è loggato, mostra la pagina di login
  if (!user) {
    return <AuthPage onAuthSuccess={() => console.log('Login effettuato!')} />;
  }

  // Se è loggato, mostra l'app
  return <TravelPlannerApp user={user} />;
}

export default App;