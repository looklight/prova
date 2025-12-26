import { useState, useCallback } from 'react';
import { Activity } from '../sections/ActivitiesSection';
import { deleteImage } from '../../../services/storageService';
import { extractVideoId } from '../../../utils/mediaUtils';

// ============================================
// ALTROVE - useActivityMedia Hook
// Gestisce lo state e gli handlers per media
// ============================================

export type MediaDialogType = 'link' | 'video' | 'note' | null;

interface UseActivityMediaProps {
  activity: Activity;
  onUpdate: (updates: Partial<Activity>) => void;
}

interface UseActivityMediaReturn {
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

export const useActivityMedia = ({
  activity,
  onUpdate
}: UseActivityMediaProps): UseActivityMediaReturn => {
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
    // Reset inputs
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
      // Normalizza URL: aggiungi https:// se manca
      let url = linkInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const newLink: { id: number; url: string; title?: string } = { id: Date.now(), url };
      if (linkTitle.trim()) newLink.title = linkTitle.trim();
      onUpdate({
        links: [...(activity.links || []), newLink]
      });
    } else if (mediaDialogType === 'video' && videoInput.trim()) {
      const videoData = extractVideoId(videoInput);
      if (videoData) {
        const newVideo: { id: number; url: string; note?: string; platform?: string; videoId?: string } = {
          id: Date.now(),
          ...videoData,
          url: videoInput.trim()
        };
        if (videoNote.trim()) newVideo.note = videoNote.trim();
        onUpdate({
          videos: [...(activity.videos || []), newVideo]
        });
      } else {
        alert('URL non valido. Supportati: Instagram, TikTok, YouTube');
        return; // Non chiudere il dialog
      }
    } else if (mediaDialogType === 'note' && noteInput.trim()) {
      if (editingNote) {
        // Modifica nota esistente
        onUpdate({
          mediaNotes: (activity.mediaNotes || []).map(n =>
            n.id === editingNote.id ? { ...n, text: noteInput.trim() } : n
          )
        });
      } else {
        // Nuova nota
        const newNote = {
          id: Date.now(),
          text: noteInput.trim()
        };
        onUpdate({
          mediaNotes: [...(activity.mediaNotes || []), newNote]
        });
      }
    }
    closeMediaDialog();
  }, [mediaDialogType, linkInput, linkTitle, videoInput, videoNote, noteInput, editingNote, activity, onUpdate, closeMediaDialog]);

  const handleRemoveMedia = useCallback(async (
    type: 'links' | 'images' | 'videos' | 'mediaNotes',
    id: number
  ) => {
    // Conferma eliminazione
    if (!window.confirm('Eliminare?')) return;

    // Se è un'immagine, elimina anche da Storage
    if (type === 'images') {
      const image = activity.images?.find(img => img.id === id);
      if (image?.path) {
        try {
          await deleteImage(image.path);
        } catch (error) {
          console.error('Errore eliminazione immagine:', error);
        }
      }
    }

    const current = (activity[type] as any[]) || [];
    onUpdate({ [type]: current.filter((item: any) => item.id !== id) });
  }, [activity, onUpdate]);

  return {
    // Dialog state
    mediaDialogType,

    // Input states
    linkInput,
    linkTitle,
    videoInput,
    videoNote,
    noteInput,
    editingNote,
    isNoteEditing,

    // Image viewer state
    viewerImageUrl,

    // Setters
    setLinkInput,
    setLinkTitle,
    setVideoInput,
    setVideoNote,
    setNoteInput,
    setViewerImageUrl,
    setIsNoteEditing,

    // Handlers
    openMediaDialog,
    closeMediaDialog,
    handleNoteClick,
    handleMediaSubmit,
    handleRemoveMedia
  };
};

export default useActivityMedia;
