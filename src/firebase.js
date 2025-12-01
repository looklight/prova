import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, persistentLocalCache, initializeFirestore } from 'firebase/firestore';  // ← API moderna
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

// 🔄 Firestore con persistenza offline moderna
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(/* settings */ {})
});

export const storage = getStorage(app);

console.log('✅ Persistenza offline abilitata (API moderna)');

// 📊 Analytics - Inizializzato automaticamente se supportato
let analyticsInstance = null;

const initAnalytics = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
      console.log('✅ Firebase Analytics inizializzato');
    } else {
      console.log('📊 Analytics non supportato in questo ambiente');
    }
  } catch (error) {
    console.error('❌ Errore inizializzazione Analytics:', error);
  }
};

// Inizializza subito
initAnalytics();

// Export per retrocompatibilità
export const analytics = analyticsInstance;

export default app;