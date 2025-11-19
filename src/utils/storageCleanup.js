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
 * 🗑️ Elimina tutte le immagini di specifici giorni
 */
export const cleanupDaysImages = async (tripData, dayIds) => {
  if (!tripData || !dayIds || dayIds.length === 0) {
    console.log('⚠️ Nessun giorno da pulire');
    return { deletedCount: 0, errors: [] };
  }

  const categoryIds = [
    'base', 'pernottamento',
    'attivita1', 'attivita2', 'attivita3',
    'spostamenti1', 'spostamenti2',
    'ristori1', 'ristori2'
  ];

  let deletedCount = 0;
  const errors = [];

  for (const dayId of dayIds) {
    for (const categoryId of categoryIds) {
      const key = `${dayId}-${categoryId}`;
      const categoryData = tripData[key];

      if (categoryData?.images && Array.isArray(categoryData.images)) {
        for (const image of categoryData.images) {
          if (image.path) {
            try {
              await deleteImage(image.path);
              deletedCount++;
              console.log(`🗑️ Immagine eliminata: ${image.path}`);
            } catch (error) {
              if (error.code === 'storage/object-not-found') {
                console.warn(`⚠️ Immagine già eliminata: ${image.path}`);
              } else {
                console.error(`❌ Errore eliminazione ${image.path}:`, error);
                errors.push({ path: image.path, error });
              }
            }
          }
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