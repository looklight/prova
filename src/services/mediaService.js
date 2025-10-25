// ============= UTILITY: RIDIMENSIONAMENTO IMMAGINI =============

/**
 * Ridimensiona un'immagine mantenendo le proporzioni
 * @param {File} file - File immagine caricato
 * @param {number} maxWidth - Larghezza massima (default: 400px)
 * @param {number} maxHeight - Altezza massima (default: 400px)
 * @param {number} quality - Qualità JPEG (0-1, default: 0.8)
 * @returns {Promise<string>} - Data URL immagine ridimensionata
 */
export const resizeImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcola nuove dimensioni mantenendo proporzioni
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Crea canvas per ridimensionare
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converti in data URL (JPEG compresso)
        const resizedDataURL = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedDataURL);
      };
      
      img.onerror = () => reject(new Error('Errore nel caricamento dell\'immagine'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsDataURL(file);
  });
};