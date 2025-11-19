import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Comprimi e ridimensiona un'immagine
 */
const compressImage = (
  file,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

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

        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 🖼️ Ridimensiona e carica immagine su Storage
 * @returns {Promise<{url: string, path: string}>} URL pubblico e path per eliminazione
 */
export const resizeAndUploadImage = async (file, storagePath, maxWidth, maxHeight, quality) => {
  try {
    // 1. Comprimi e ridimensiona
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

    // 5. Ottieni URL pubblico
    const downloadURL = await getDownloadURL(storageRef);

    console.log('✅ Immagine caricata:', fullPath);

    // ⭐ IMPORTANTE: Ritorna sia URL che path
    return {
      url: downloadURL,
      path: fullPath  // ← Necessario per eliminazione successiva
    };
  } catch (error) {
    console.error('❌ Errore upload immagine:', error);
    throw error;
  }
};

/**
 * 🗑️ Elimina immagine da Storage dato il path
 */
export const deleteImageFromStorage = async (imagePath) => {
  if (!imagePath) {
    console.warn('⚠️ Path immagine vuoto, skip eliminazione');
    return;
  }

  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    console.log('✅ Immagine eliminata:', imagePath);
  } catch (error) {
    // Se file non esiste, non è un errore critico
    if (error.code === 'storage/object-not-found') {
      console.warn('⚠️ Immagine già eliminata:', imagePath);
      return;
    }
    console.error('❌ Errore eliminazione immagine:', error);
    throw error;
  }
};