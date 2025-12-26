import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { compressImage } from './storageService';
import { registerPendingMedia } from './pendingMediaService';

// ============================================
// ALTROVE - Media Service
// Gestione media per profili e trip metadata
// Riusa compressImage da storageService
// ============================================

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Ridimensiona e carica immagine su Storage
 * Registra automaticamente come pending per cleanup orfani
 * @returns URL pubblico e path per eliminazione
 */
export const resizeAndUploadImage = async (
  file: File,
  storagePath: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8,
  context: 'avatar' | 'tripCover' | 'trip' = 'trip',
  contextId?: string
): Promise<UploadResult> => {
  try {
    // 1. Comprimi e ridimensiona (riusa da storageService)
    const compressedBlob = await compressImage(file, maxWidth, maxHeight, quality);

    // 2. Genera nome file unico con timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}.${extension}`;

    // 3. Path completo (es: "avatars/userId/1234567890.jpg")
    const fullPath = `${storagePath}/${fileName}`;
    const storageRef = ref(storage, fullPath);

    // 4. Upload
    await uploadBytes(storageRef, compressedBlob);

    // 5. Registra come pending (per cleanup orfani)
    const userId = auth.currentUser?.uid;
    if (userId) {
      await registerPendingMedia(fullPath, userId, context, contextId);
    }

    // 6. Ottieni URL pubblico
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      path: fullPath
    };
  } catch (error) {
    console.error('Errore upload immagine:', error);
    throw error;
  }
};

/**
 * Elimina immagine da Storage dato il path
 */
export const deleteImageFromStorage = async (imagePath: string): Promise<void> => {
  if (!imagePath) {
    console.warn('Path immagine vuoto, skip eliminazione');
    return;
  }

  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error: any) {
    // Se file non esiste, non è un errore critico
    if (error.code === 'storage/object-not-found') {
      console.warn('Immagine già eliminata:', imagePath);
      return;
    }
    console.error('Errore eliminazione immagine:', error);
    throw error;
  }
};
