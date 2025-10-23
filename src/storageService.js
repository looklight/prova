import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Comprimi e ridimensiona un'immagine
 */
export const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Mantieni proporzioni
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converti in Blob
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = reject;
      img.src = e.target.result;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Carica un'immagine su Firebase Storage
 */
export const uploadImage = async (file, tripId, categoryId) => {
  try {
    // 1. Comprimi l'immagine
    const compressedBlob = await compressImage(file);
    
    // 2. Genera nome file unico
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    
    // 3. Crea riferimento Storage
    const storageRef = ref(storage, `trips/${tripId}/${categoryId}/${fileName}`);
    
    // 4. Upload
    await uploadBytes(storageRef, compressedBlob);
    
    // 5. Ottieni URL pubblico
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      url: downloadURL,
      name: file.name,
      path: `trips/${tripId}/${categoryId}/${fileName}`,
      id: timestamp
    };
  } catch (error) {
    console.error('Errore upload immagine:', error);
    throw error;
  }
};

/**
 * Elimina un'immagine da Firebase Storage
 */
export const deleteImage = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Errore eliminazione immagine:', error);
    throw error;
  }
};