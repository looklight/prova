/**
 * OnlineContext
 * 
 * Context provider per condividere lo stato online/offline a tutta l'app
 * Evita prop drilling e centralizza la logica di rilevamento connessione
 */

import React, { createContext, useContext } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OnlineContext = createContext(true);

export const OnlineProvider = ({ children }) => {
  const isOnline = useOnlineStatus();

  return (
    <OnlineContext.Provider value={isOnline}>
      {children}
    </OnlineContext.Provider>
  );
};

// Hook per usare il context nei componenti
export const useOnline = () => {
  const context = useContext(OnlineContext);
  if (context === undefined) {
    throw new Error('useOnline must be used within OnlineProvider');
  }
  return context;
};