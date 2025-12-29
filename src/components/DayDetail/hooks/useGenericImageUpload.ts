import { useState, useRef, useCallback } from 'react';
import { uploadImage, uploadDocument } from '../../../services/storageService';

// ============================================
// useGenericImageUpload Hook
// Upload immagini e documenti generico per qualsiasi sezione
// ============================================

interface UseGenericImageUploadProps {
  tripId: string;
  entityId: string; // es. 'accommodation-1', 'activity-abc'
  uploaderId: string; // userId di chi carica il file
  onImageUploaded: (imageData: { id: number; url: string; path: string; uploaderId: string; size: number }) => void;
  onDocumentUploaded?: (docData: { id: number; url: string; path: string; name: string; uploaderId: string; size: number }) => void;
}

interface UseGenericImageUploadReturn {
  isUploadingImage: boolean;
  isUploadingDocument: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  documentInputRef: React.RefObject<HTMLInputElement>;
  handleImageClick: () => void;
  handleDocumentClick: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const useGenericImageUpload = ({
  tripId,
  entityId,
  uploaderId,
  onImageUploaded,
  onDocumentUploaded
}: UseGenericImageUploadProps): UseGenericImageUploadReturn => {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDocumentClick = useCallback(() => {
    documentInputRef.current?.click();
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
        path: result.path,
        uploaderId,
        size: result.size || 0
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
  }, [tripId, entityId, uploaderId, onImageUploaded]);

  const handleDocumentUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione PDF
    if (file.type !== 'application/pdf') {
      alert('Seleziona un file PDF valido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Il documento è troppo grande (max 10MB)');
      return;
    }

    if (!onDocumentUploaded) {
      console.warn('onDocumentUploaded non definito');
      return;
    }

    setIsUploadingDocument(true);
    try {
      const result = await uploadDocument(file, tripId, entityId);
      onDocumentUploaded({
        id: Date.now(),
        url: result.url,
        path: result.path,
        name: result.name,
        uploaderId,
        size: result.size || file.size
      });
    } catch (error) {
      console.error('Errore upload documento:', error);
      alert('Errore durante l\'upload del documento');
    } finally {
      setIsUploadingDocument(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  }, [tripId, entityId, uploaderId, onDocumentUploaded]);

  return {
    isUploadingImage,
    isUploadingDocument,
    fileInputRef,
    documentInputRef,
    handleImageClick,
    handleDocumentClick,
    handleImageUpload,
    handleDocumentUpload
  };
};

export default useGenericImageUpload;
