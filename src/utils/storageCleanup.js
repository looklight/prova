// utils/storageCleanup.js

import { deleteImage } from '../services/storageService';

/**
 * 🔧 Estrae il path Storage da un URL Firebase Storage
 * @param {string} storageUrl - URL completo Firebase Storage
 * @returns {string|null} Path del file o null se parsing fallisce
 */
const extractPathFromStorageUrl = (storageUrl) => {
  try {
    // URL format: https://firebasestorage.googleapis.com/v0/b/PROJECT.appspot.com/o/PATH?alt=media&token=...
    
    const match = storageUrl.match(/\/o\/(.+?)(\?|$)/);
    
    if (!match || !match[1]) {
      console.warn('⚠️ Formato URL Storage non riconosciuto:', storageUrl);
      return null;
    }
    
    const encodedPath = match[1];
    const decodedPath = decodeURIComponent(encodedPath);
    
    console.log('✅ Path estratto da URL:', decodedPath);
    return decodedPath;
    
  } catch (error) {
    console.error('❌ Errore parsing URL Storage:', error);
    return null;
  }
};

/**
 * 🗑️ Helper per eliminare un'immagine con gestione errori
 */
const safeDeleteImage = async (imagePath, errors) => {
  if (!imagePath) return false;

  try {
    await deleteImage(imagePath);
    console.log(`🗑️ Immagine eliminata: ${imagePath}`);
    return true;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`⚠️ Immagine già eliminata: ${imagePath}`);
    } else {
      console.error(`❌ Errore eliminazione ${imagePath}:`, error);
      errors.push({ path: imagePath, error });
    }
    return false;
  }
};

/**
 * 🗑️ Elimina tutte le immagini di specifici giorni
 * Gestisce sia la vecchia struttura (categorie) che la nuova (activities array)
 */
export const cleanupDaysImages = async (tripData, dayIds) => {
  if (!tripData || !dayIds || dayIds.length === 0) {
    console.log('⚠️ Nessun giorno da pulire');
    return { deletedCount: 0, errors: [] };
  }

  // Categorie legacy (per retrocompatibilità)
  const legacyCategoryIds = [
    'base', 'pernottamento',
    'attivita1', 'attivita2', 'attivita3',
    'spostamenti1', 'spostamenti2',
    'ristori1', 'ristori2'
  ];

  let deletedCount = 0;
  const errors = [];

  for (const dayId of dayIds) {
    // 1. Cleanup categorie legacy
    for (const categoryId of legacyCategoryIds) {
      const key = `${dayId}-${categoryId}`;
      const categoryData = tripData[key];

      if (categoryData?.images && Array.isArray(categoryData.images)) {
        for (const image of categoryData.images) {
          if (await safeDeleteImage(image.path, errors)) {
            deletedCount++;
          }
        }
      }
    }

    // 2. Cleanup nuova struttura attività (activities array)
    const activitiesKey = `${dayId}-attivita`;
    const activitiesData = tripData[activitiesKey];

    if (activitiesData?.activities && Array.isArray(activitiesData.activities)) {
      for (const activity of activitiesData.activities) {
        // Elimina immagini dell'attività
        if (activity.images && Array.isArray(activity.images)) {
          for (const image of activity.images) {
            if (await safeDeleteImage(image.path, errors)) {
              deletedCount++;
            }
          }
        }
        // Elimina documenti/PDF dell'attività
        if (activity.documents && Array.isArray(activity.documents)) {
          for (const doc of activity.documents) {
            if (await safeDeleteImage(doc.path, errors)) {
              deletedCount++;
            }
          }
        }
      }
    }

    // 3. Cleanup pernottamento (accommodation)
    const accommodationKey = `${dayId}-pernottamento`;
    const accommodationData = tripData[accommodationKey];

    if (accommodationData?.images && Array.isArray(accommodationData.images)) {
      for (const image of accommodationData.images) {
        if (await safeDeleteImage(image.path, errors)) {
          deletedCount++;
        }
      }
    }
    // Elimina documenti/PDF del pernottamento
    if (accommodationData?.documents && Array.isArray(accommodationData.documents)) {
      for (const doc of accommodationData.documents) {
        if (await safeDeleteImage(doc.path, errors)) {
          deletedCount++;
        }
      }
    }
  }

  console.log(`✅ Cleanup giorni completato: ${deletedCount} immagini eliminate`);

  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} immagini non eliminate`);
  }

  return { deletedCount, errors };
};

/**
 * 🗑️ Elimina tutte le immagini di un viaggio intero
 */
export const cleanupTripImages = async (trip) => {
  if (!trip?.days || !trip?.data) {
    console.log('⚠️ Viaggio senza dati da pulire');
    return { deletedCount: 0, errors: [] };
  }

  const dayIds = trip.days.map(day => day.id);
  
  console.log(`🧹 Cleanup ${dayIds.length} giorni del viaggio...`);
  
  const result = await cleanupDaysImages(trip.data, dayIds);
  
  console.log(`✅ Cleanup viaggio completato: ${result.deletedCount} immagini eliminate`);
  
  return result;
};

/**
 * 🗑️ Elimina cover del viaggio se esiste
 * @param {string} imagePathOrUrl - Path Storage o URL completo Firebase
 */
export const cleanupTripCover = async (imagePathOrUrl) => {
  if (!imagePathOrUrl) {
    console.log('⚠️ Nessuna cover da eliminare');
    return;
  }

  try {
    let pathToDelete = imagePathOrUrl;
    
    // ⭐ Se è un URL Firebase, estrai il path
    if (imagePathOrUrl.startsWith('http')) {
      console.log('🔧 Rilevato URL Firebase, estrazione path...');
      pathToDelete = extractPathFromStorageUrl(imagePathOrUrl);
      
      if (!pathToDelete) {
        console.error('❌ Impossibile estrarre path da URL:', imagePathOrUrl);
        return;
      }
    }
    
    await deleteImage(pathToDelete);
    console.log(`🗑️ Cover eliminata: ${pathToDelete}`);
    
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`⚠️ Cover già eliminata: ${imagePathOrUrl}`);
    } else {
      console.error(`❌ Errore eliminazione cover:`, error);
      throw error;
    }
  }
};