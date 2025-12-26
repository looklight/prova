import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { IMAGE_COMPRESSION } from '../config/imageConfig';
import { registerPendingMedia } from './pendingMediaService';

// ============================================
// ALTROVE - Storage Service
// Gestione upload/delete immagini su Firebase Storage
// ============================================

export interface ImageData {
  url: string;
  name: string;
  path: string;
  id: number;
}

/**
 * Comprimi e ridimensiona un'immagine
 */
export const compressImage = (
  file: File,
  maxWidth: number = IMAGE_COMPRESSION.cellImage.maxWidth,
  maxHeight: number = IMAGE_COMPRESSION.cellImage.maxHeight,
  quality: number = IMAGE_COMPRESSION.cellImage.quality
): Promise<Blob> => {
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Converti in Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Carica un'immagine su Firebase Storage
 * Registra automaticamente come pending per cleanup orfani
 */
export const uploadImage = async (
  file: File,
  tripId: string,
  categoryId: string
): Promise<ImageData> => {
  try {
    // 1. Comprimi l'immagine
    const compressedBlob = await compressImage(file);

    // 2. Genera nome file unico
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const path = `trips/${tripId}/${categoryId}/${fileName}`;

    // 3. Crea riferimento Storage
    const storageRef = ref(storage, path);

    // 4. Upload
    await uploadBytes(storageRef, compressedBlob);

    // 5. Registra come pending (per cleanup orfani)
    const userId = auth.currentUser?.uid;
    if (userId) {
      await registerPendingMedia(path, userId, 'trip', tripId);
    }

    // 6. Ottieni URL pubblico
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      name: file.name,
      path,
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
export const deleteImage = async (imagePath: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Errore eliminazione immagine:', error);
    throw error;
  }
};
