// src/config/imageConfig.js

/**
 * Configurazione centralizzata per compressione immagini
 */
export const IMAGE_COMPRESSION = {
  // Avatar profilo utente
  avatar: {
    maxWidth: 150,
    maxHeight: 150,
    quality: 0.75
  },
  
  // Copertina viaggio (metadata)
  tripCover: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.75
  },
  
  // Immagini nelle celle calendario
  cellImage: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.75
  }
};

/**
 * Helper per ottenere config specifica
 */
export const getImageConfig = (type) => {
  return IMAGE_COMPRESSION[type] || IMAGE_COMPRESSION.cellImage;
};