import { useState, useRef, useCallback } from 'react';
import { uploadImage } from '../../../services/storageService';

// ============================================
// useGenericImageUpload Hook
// Upload immagini generico per qualsiasi sezione
// ============================================

interface UseGenericImageUploadProps {
  tripId: string;
  entityId: string; // es. 'accommodation-1', 'activity-abc'
  onImageUploaded: (imageData: { id: number; url: string; path: string }) => void;
}

interface UseGenericImageUploadReturn {
  isUploadingImage: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageClick: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const useGenericImageUpload = ({
  tripId,
  entityId,
  onImageUploaded
}: UseGenericImageUploadProps): UseGenericImageUploadReturn => {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione
    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('L\'immagine è troppo grande (max 10MB)');
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await uploadImage(file, tripId, entityId);
      onImageUploaded({
        id: Date.now(),
        url: result.url,
        path: result.path
      });
    } catch (error) {
      console.error('Errore upload immagine:', error);
      alert('Errore durante l\'upload dell\'immagine');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [tripId, entityId, onImageUploaded]);

  return {
    isUploadingImage,
    fileInputRef,
    handleImageClick,
    handleImageUpload
  };
};

export default useGenericImageUpload;
