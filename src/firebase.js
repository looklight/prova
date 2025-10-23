import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC7NVKsKrqgzkYgVC4BS0eBlxD11Smwea0",
  authDomain: "travel-planner-9b49d.firebaseapp.com",
  projectId: "travel-planner-9b49d",
  storageBucket: "travel-planner-9b49d.firebasestorage.app",
  messagingSenderId: "710452109285",
  appId: "1:710452109285:web:58101a1b60c164359f590c",
  measurementId: "G-MEFXQHJ13J"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza servizi
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

export default app;