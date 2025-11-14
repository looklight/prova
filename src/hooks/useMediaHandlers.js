/**
 * 🎬 useMediaHandlers
 * 
 * @description Hook per gestione media (link, immagini, video, note)
 * @usage Usato da: DayDetailView
 * 
 * Funzionalità:
 * - Gestione dialog per aggiunta media
 * - Upload immagini su Firebase Storage
 * - Validazione URL video (YouTube, Instagram, TikTok) con note
 * - Edit/remove media con eliminazione da Storage
 * - Gestione note testuali
 */

import { useState } from 'react';
import { extractVideoId } from '../components/MediaCards';

export const useMediaHandlers = (categoryData, updateCategory) => {
  const [mediaDialogOpen, setMediaDialogOpen] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [videoNote, setVideoNote] = useState(''); // 🆕 Stato per nota video
  const [noteInput, setNoteInput] = useState('');
  const [editingNote, setEditingNote] = useState(null);

  const addLink = (categoryId) => {
    if (!linkInput.trim()) return;

    let url = linkInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    updateCategory(categoryId, 'links', [
      ...categoryData[categoryId].links,
      { url: url, title: linkTitle || linkInput, id: Date.now() }
    ]);

    setLinkInput('');
    setLinkTitle('');
    setMediaDialogOpen(null);
  };

  const addImage = async (categoryId, file) => {
    try {
      const { uploadImage } = await import('../storageService');
      const imageData = await uploadImage(file, categoryData.tripId, categoryId);

      updateCategory(categoryId, 'images', [
        ...categoryData[categoryId].images,
        imageData
      ]);
    } catch (error) {
      console.error('Errore upload immagine:', error);
      alert('Errore nel caricamento dell\'immagine');
    }
  };

  const addVideo = (categoryId) => {
    if (!videoInput.trim()) return;

    const videoData = extractVideoId(videoInput);
    if (videoData) {
      updateCategory(categoryId, 'videos', [
        ...categoryData[categoryId].videos,
        { 
          ...videoData, 
          url: videoInput, 
          note: videoNote.trim() || null, // 🆕 Salva nota se presente
          id: Date.now() 
        }
      ]);
      setVideoInput('');
      setVideoNote(''); // 🆕 Reset nota
      setMediaDialogOpen(null);
    } else {
      alert('URL non valido. Supportati: Instagram, TikTok, YouTube');
    }
  };

  const addNote = (categoryId) => {
    if (!noteInput.trim()) return;

    if (editingNote) {
      updateCategory(categoryId, 'mediaNotes', 
        categoryData[categoryId].mediaNotes.map(note =>
          note.id === editingNote.id ? { ...note, text: noteInput } : note
        )
      );
      setEditingNote(null);
    } else {
      updateCategory(categoryId, 'mediaNotes', [
        ...categoryData[categoryId].mediaNotes,
        { text: noteInput, id: Date.now() }
      ]);
    }

    setNoteInput('');
    setMediaDialogOpen(null);
  };

  const removeMedia = async (categoryId, mediaType, itemId) => {
    const mediaArray = categoryData[categoryId][mediaType];
    const mediaItem = mediaArray.find(item => item.id === itemId);

    if (mediaType === 'images' && mediaItem?.path) {
      try {
        const { deleteImage } = await import('../storageService');
        await deleteImage(mediaItem.path);
      } catch (error) {
        console.error('Errore eliminazione immagine da Storage:', error);
      }
    }

    updateCategory(
      categoryId,
      mediaType,
      mediaArray.filter(item => item.id !== itemId)
    );
  };

  const handleMediaDialogSubmit = (categoryId) => {
    if (mediaDialogOpen?.type === 'link') {
      addLink(categoryId);
    } else if (mediaDialogOpen?.type === 'video') {
      addVideo(categoryId);
    } else if (mediaDialogOpen?.type === 'note') {
      addNote(categoryId);
    }
  };

  const handleMediaDialogClose = () => {
    setMediaDialogOpen(null);
    setEditingNote(null);
    setNoteInput('');
    setVideoNote(''); // 🆕 Reset nota video quando chiude
  };

  return {
    mediaDialogOpen,
    linkInput,
    linkTitle,
    videoInput,
    videoNote, // 🆕 Esponi stato
    noteInput,
    editingNote,
    setMediaDialogOpen,
    setLinkInput,
    setLinkTitle,
    setVideoInput,
    setVideoNote, // 🆕 Esponi setter
    setNoteInput,
    setEditingNote,
    addLink,
    addImage,
    addVideo,
    addNote,
    removeMedia,
    handleMediaDialogSubmit,
    handleMediaDialogClose
  };
};