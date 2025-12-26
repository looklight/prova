import { useState, useCallback } from 'react';
import { deleteImage } from '../../../services/storageService';

// ============================================
// useMedia Hook - Generico per media
// Funziona con Activity, Accommodation, ecc.
// ============================================

export type MediaDialogType = 'link' | 'video' | 'note' | null;

// Interfaccia generica per oggetti con media
interface WithMedia {
  links?: Array<{ id: number; url: string; title?: string }>;
  images?: Array<{ id: number; url: string; path?: string }>;
  videos?: Array<{ id: number; url: string; note?: string }>;
  mediaNotes?: Array<{ id: number; text: string }>;
}

interface UseMediaProps<T extends WithMedia> {
  data: T;
  onUpdate: (field: string, value: any) => void;
}

interface UseMediaReturn {
  // Dialog state
  mediaDialogType: MediaDialogType;

  // Input states
  linkInput: string;
  linkTitle: string;
  videoInput: string;
  videoNote: string;
  noteInput: string;
  editingNote: { id: number; text: string } | null;
  isNoteEditing: boolean;

  // Image viewer state
  viewerImageUrl: string | null;

  // Setters
  setLinkInput: (value: string) => void;
  setLinkTitle: (value: string) => void;
  setVideoInput: (value: string) => void;
  setVideoNote: (value: string) => void;
  setNoteInput: (value: string) => void;
  setViewerImageUrl: (url: string | null) => void;
  setIsNoteEditing: (value: boolean) => void;

  // Handlers
  openMediaDialog: (type: 'link' | 'video' | 'note') => void;
  closeMediaDialog: () => void;
  handleNoteClick: (note: { id: number; text: string }) => void;
  handleMediaSubmit: () => void;
  handleRemoveMedia: (type: 'links' | 'images' | 'videos' | 'mediaNotes', id: number) => Promise<void>;
}

export const useMedia = <T extends WithMedia>({
  data,
  onUpdate
}: UseMediaProps<T>): UseMediaReturn => {
  // Dialog state
  const [mediaDialogType, setMediaDialogType] = useState<MediaDialogType>(null);

  // Input states
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [videoNote, setVideoNote] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: number; text: string } | null>(null);
  const [isNoteEditing, setIsNoteEditing] = useState(false);

  // Image viewer state
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const openMediaDialog = useCallback((type: 'link' | 'video' | 'note') => {
    setLinkInput('');
    setLinkTitle('');
    setVideoInput('');
    setVideoNote('');
    setNoteInput('');
    setEditingNote(null);
    setIsNoteEditing(false);
    setMediaDialogType(type);
  }, []);

  const closeMediaDialog = useCallback(() => {
    setMediaDialogType(null);
    setEditingNote(null);
    setIsNoteEditing(false);
  }, []);

  const handleNoteClick = useCallback((note: { id: number; text: string }) => {
    setEditingNote(note);
    setNoteInput(note.text);
    setIsNoteEditing(false);
    setMediaDialogType('note');
  }, []);

  const handleMediaSubmit = useCallback(() => {
    if (mediaDialogType === 'link' && linkInput.trim()) {
      let url = linkInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const currentLinks = data.links || [];
      const newLink: { id: number; url: string; title?: string } = { id: Date.now(), url };
      if (linkTitle.trim()) newLink.title = linkTitle.trim();
      onUpdate('links', [...currentLinks, newLink]);
    } else if (mediaDialogType === 'video' && videoInput.trim()) {
      const currentVideos = data.videos || [];
      const newVideo: { id: number; url: string; note?: string } = { id: Date.now(), url: videoInput.trim() };
      if (videoNote.trim()) newVideo.note = videoNote.trim();
      onUpdate('videos', [...currentVideos, newVideo]);
    } else if (mediaDialogType === 'note' && noteInput.trim()) {
      const currentNotes = data.mediaNotes || [];
      if (editingNote) {
        onUpdate('mediaNotes',
          currentNotes.map(n => n.id === editingNote.id ? { ...n, text: noteInput.trim() } : n)
        );
      } else {
        onUpdate('mediaNotes', [
          ...currentNotes,
          { id: Date.now(), text: noteInput.trim() }
        ]);
      }
    }
    closeMediaDialog();
  }, [mediaDialogType, linkInput, linkTitle, videoInput, videoNote, noteInput, editingNote, data, onUpdate, closeMediaDialog]);

  const handleRemoveMedia = useCallback(async (
    type: 'links' | 'images' | 'videos' | 'mediaNotes',
    id: number
  ) => {
    const current = data[type] || [];

    // Se è un'immagine, elimina anche da Storage
    if (type === 'images') {
      const image = current.find((item: any) => item.id === id);
      if (image?.path) {
        try {
          await deleteImage(image.path);
        } catch (error) {
          console.error('Errore eliminazione immagine:', error);
        }
      }
    }

    onUpdate(type, current.filter((item: any) => item.id !== id));
  }, [data, onUpdate]);

  return {
    mediaDialogType,
    linkInput,
    linkTitle,
    videoInput,
    videoNote,
    noteInput,
    editingNote,
    isNoteEditing,
    viewerImageUrl,
    setLinkInput,
    setLinkTitle,
    setVideoInput,
    setVideoNote,
    setNoteInput,
    setViewerImageUrl,
    setIsNoteEditing,
    openMediaDialog,
    closeMediaDialog,
    handleNoteClick,
    handleMediaSubmit,
    handleRemoveMedia
  };
};

export default useMedia;
