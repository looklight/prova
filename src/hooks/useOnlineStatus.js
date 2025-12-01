/**
 * useOnlineStatus Hook
 * 
 * Hook personalizzato per rilevare lo stato di connessione online/offline
 * 
 * @returns {boolean} isOnline - true se online, false se offline
 */

import { useState, useEffect } from 'react';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Connessione ripristinata');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.warn('⚠️ Connessione persa');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};