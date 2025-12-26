import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { persistentLocalCache, initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Leggi da variabili d'ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza servizi essenziali
export const auth = getAuth(app);

// Firestore con persistenza offline moderna
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({})
});

export const storage = getStorage(app);

console.log('✅ Persistenza offline abilitata');

// ============================================
// ANALYTICS - Lazy initialization
// ============================================

let analyticsInstance = null;
let analyticsReady = false;

// Promise che si risolve quando analytics è pronto
export const analyticsReadyPromise = (async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
      analyticsReady = true;
      console.log('✅ Firebase Analytics inizializzato');
      return analyticsInstance;
    } else {
      console.log('📊 Analytics non supportato in questo ambiente');
      return null;
    }
  } catch (error) {
    console.error('❌ Errore inizializzazione Analytics:', error);
    return null;
  }
})();

// Getter per analytics (restituisce l'istanza quando pronta)
export const getAnalyticsInstance = () => analyticsInstance;

// Export diretto per retrocompatibilità (sarà null inizialmente, poi popolato)
export { analyticsInstance as analytics };

export default app;
