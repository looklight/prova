// ============= UTILITY: RIDIMENSIONAMENTO E UPLOAD IMMAGINI =============

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Ridimensiona e carica un'immagine su Firebase Storage
 * @param {File} file - File immagine caricato
 * @param {string} path - Percorso Storage (es: 'avatars/USER_ID')
 * @param {number} maxWidth - Larghezza massima (default: 400px)
 * @param {number} maxHeight - Altezza massima (default: 400px)
 * @param {number} quality - Qualità JPEG (0-1, default: 0.8)
 * @returns {Promise<string>} - URL pubblico immagine su Storage
 */
export const resizeAndUploadImage = async (file, path, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
  try {
    // 1. Ridimensiona immagine
    const resizedBlob = await resizeImageToBlob(file, maxWidth, maxHeight, quality);
    
    // 2. Upload su Firebase Storage
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${filename}`);
    
    await uploadBytes(storageRef, resizedBlob, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000' // Cache 1 anno
    });
    
    // 3. Ottieni URL pubblico
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Immagine caricata su Storage:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Errore upload immagine:', error);
    throw error;
  }
};

/**
 * Ridimensiona immagine e restituisce Blob (per upload Storage)
 * @private
 */
const resizeImageToBlob = (file, maxWidth, maxHeight, quality) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcola nuove dimensioni mantenendo proporzioni
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Crea canvas per ridimensionare
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converti in Blob JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Errore conversione immagine'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Errore caricamento immagine'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsDataURL(file);
  });
};