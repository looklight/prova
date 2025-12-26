// ============================================
// ALTROVE - Pending Media Service
// Traccia upload per identificare media orfani
// ============================================

import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// ============================================
// TYPES
// ============================================

interface PendingMedia {
  path: string;           // Path nello Storage
  userId: string;         // Chi ha caricato
  context: string;        // es: "trip", "avatar", "tripCover"
  contextId?: string;     // es: tripId
  createdAt: Timestamp;
}

// ============================================
// CONSTANTS
// ============================================

const COLLECTION_NAME = 'pendingMedia';

// ============================================
// FUNCTIONS
// ============================================

/**
 * Registra un media come "pending" (appena caricato, non ancora salvato)
 * Da chiamare subito dopo l'upload su Storage
 */
export const registerPendingMedia = async (
  path: string,
  userId: string,
  context: 'trip' | 'avatar' | 'tripCover',
  contextId?: string
): Promise<void> => {
  try {
    // Usa il path come ID documento (sostituendo / con _)
    const docId = path.replace(/\//g, '_');

    await setDoc(doc(db, COLLECTION_NAME, docId), {
      path,
      userId,
      context,
      contextId: contextId || null,
      createdAt: serverTimestamp()
    });

    console.log(`📝 Media registrato come pending: ${path}`);
  } catch (error) {
    // Non bloccare l'upload se il tracking fallisce
    console.error('⚠️ Errore registrazione pending media:', error);
  }
};

/**
 * Conferma che un media è stato salvato correttamente
 * Da chiamare dopo che il riferimento è stato salvato in Firestore
 */
export const confirmMedia = async (path: string): Promise<void> => {
  try {
    const docId = path.replace(/\//g, '_');
    await deleteDoc(doc(db, COLLECTION_NAME, docId));
    console.log(`✅ Media confermato: ${path}`);
  } catch (error) {
    // Non critico se fallisce
    console.warn('⚠️ Errore conferma media:', error);
  }
};

/**
 * Conferma multipli media in batch
 */
export const confirmMultipleMedia = async (paths: string[]): Promise<void> => {
  if (!paths || paths.length === 0) return;

  await Promise.all(paths.map(path => confirmMedia(path)));
};

/**
 * Ottiene tutti i media pending di un utente (per debug)
 */
export const getUserPendingMedia = async (userId: string): Promise<PendingMedia[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as PendingMedia);
  } catch (error) {
    console.error('Errore lettura pending media:', error);
    return [];
  }
};

/**
 * Rimuove tutti i pending media di un contesto (es: quando si elimina un viaggio)
 */
export const clearPendingMediaByContext = async (
  context: string,
  contextId: string
): Promise<void> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('context', '==', context),
      where('contextId', '==', contextId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
    console.log(`🧹 Rimossi ${snapshot.size} pending media per ${context}/${contextId}`);
  } catch (error) {
    console.error('Errore pulizia pending media:', error);
  }
};

/**
 * Estrae tutti i path delle immagini da un oggetto dati (ricorsivo)
 */
const extractImagePaths = (data: unknown): string[] => {
  const paths: string[] = [];

  if (!data || typeof data !== 'object') return paths;

  const processValue = (value: unknown) => {
    if (!value) return;

    if (typeof value === 'object') {
      // Check if it's an image object with path
      if ('path' in (value as Record<string, unknown>) &&
          typeof (value as Record<string, unknown>).path === 'string') {
        const path = (value as Record<string, unknown>).path as string;
        if (path.startsWith('trips/') || path.startsWith('avatars/') || path.startsWith('tripCovers/')) {
          paths.push(path);
        }
      }

      // Recurse into arrays and objects
      if (Array.isArray(value)) {
        value.forEach(item => processValue(item));
      } else {
        Object.values(value as Record<string, unknown>).forEach(v => processValue(v));
      }
    }
  };

  processValue(data);
  return paths;
};

/**
 * Conferma automaticamente tutte le immagini trovate in un oggetto dati
 * Da chiamare dopo il salvataggio su Firestore
 */
export const confirmMediaInData = async (data: unknown): Promise<void> => {
  try {
    const paths = extractImagePaths(data);
    if (paths.length > 0) {
      await confirmMultipleMedia(paths);
    }
  } catch (error) {
    console.warn('⚠️ Errore conferma media in data:', error);
  }
};
