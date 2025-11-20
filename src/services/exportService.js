/**
 * 🎯 Export/Import Service
 * 
 * Gestisce esportazione e importazione viaggi in formato JSON.
 * Export include: struttura, titoli, note, link, video, immagini (URL)
 * Export esclude: costi, membri, breakdown (dati sensibili)
 */

/**
 * Sanitizza dati viaggio per export (rimuove info sensibili)
 * @param {Object} trip - Viaggio da sanitizzare
 * @param {Boolean} includeMedia - Se true include immagini/video/link, altrimenti no
 */
const sanitizeTripData = (trip, includeMedia = true) => {
  const sanitized = {
    name: trip.metadata?.name || trip.name || 'Viaggio',
    metadata: {
      name: trip.metadata?.name || trip.name || 'Viaggio',
      destinations: trip.metadata?.destinations || [],
      description: trip.metadata?.description || '',
      image: includeMedia ? (trip.metadata?.image || trip.image || null) : null
    },
    startDate: trip.startDate,
    days: trip.days.map(day => {
      const dayData = {
        number: day.number,
        date: day.date,
        categories: {}
      };

      // Copia dati categorie (senza costi e breakdown)
      Object.keys(trip.data || {}).forEach(key => {
        if (key.startsWith(`${day.id}-`)) {
          const categoryId = key.split('-')[1];
          const cellData = trip.data[key];

          if (!cellData) return;

          // ✅ Includi solo: titoli, note, (opzionalmente media)
          if (categoryId === 'otherExpenses') {
            // Altre spese: solo titoli e media
            if (Array.isArray(cellData)) {
              dayData.categories[categoryId] = cellData.map(expense => ({
                title: expense.title || '',
                notes: expense.notes || '',
                links: includeMedia ? (expense.links || []) : [],
                images: includeMedia ? (expense.images || []) : [],
                videos: includeMedia ? (expense.videos || []) : [],
                mediaNotes: includeMedia ? (expense.mediaNotes || []) : [],
                bookingStatus: expense.bookingStatus || 'na'
              }));
            }
          } else if (categoryId !== 'base') {
            // Categorie standard
            dayData.categories[categoryId] = {
              title: cellData.title || '',
              notes: cellData.notes || '',
              links: includeMedia ? (cellData.links || []) : [],
              images: includeMedia ? (cellData.images || []) : [],
              videos: includeMedia ? (cellData.videos || []) : [],
              mediaNotes: includeMedia ? (cellData.mediaNotes || []) : [],
              bookingStatus: cellData.bookingStatus || 'na',
              transportMode: cellData.transportMode || 'none'
            };
          }
        }
      });

      return dayData;
    })
  };

  return sanitized;
};

/**
 * 📄 Esporta viaggio come JSON
 * @param {Object} trip - Viaggio da esportare
 * @param {Boolean} includeMedia - Se true include immagini/video/link
 */
export const exportTripAsJSON = (trip, includeMedia = true) => {
  try {
    const sanitizedTrip = sanitizeTripData(trip, includeMedia);

    const exportData = {
      version: '2.0',
      exportType: includeMedia ? 'full-template' : 'basic-template',
      exportedAt: new Date().toISOString(),
      trip: sanitizedTrip
    };

    // Crea blob e download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Nome file diverso in base al tipo
    const suffix = includeMedia ? 'completo' : 'base';
    a.download = `${sanitizedTrip.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${suffix}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`✅ Viaggio esportato (${includeMedia ? 'con media' : 'senza media'}):`, sanitizedTrip.name);
    return true;
  } catch (error) {
    console.error('❌ Errore export viaggio:', error);
    throw error;
  }
};

/**
 * 📥 Importa viaggio da file JSON
 */
export const importTrip = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // Verifica versione
        if (!importData.version) {
          throw new Error('File non valido: versione mancante');
        }

        // Supporta sia v1.0 (vecchio) che v2.0 (nuovo)
        let tripData;
        
        if (importData.version === '1.0') {
          // Backward compatibility con vecchio formato
          tripData = importData.trip;
        } else if (importData.version === '2.0') {
          // Nuovo formato
          tripData = importData.trip;
        } else {
          throw new Error(`Versione non supportata: ${importData.version}`);
        }

        if (!tripData || !tripData.days) {
          throw new Error('File non valido: dati viaggio mancanti');
        }

        // Crea struttura viaggio per createTrip
        const newTrip = {
          id: Date.now(),
          name: tripData.name || tripData.metadata?.name || 'Viaggio Importato',
          metadata: {
            name: tripData.name || tripData.metadata?.name || 'Viaggio Importato',
            image: tripData.metadata?.image || null,
            destinations: tripData.metadata?.destinations || [],
            description: tripData.metadata?.description || ''
          },
          image: tripData.metadata?.image || null,
          startDate: new Date(tripData.startDate),
          createdAt: new Date(),
          updatedAt: new Date(),
          days: tripData.days.map(day => ({
            id: Date.now() + Math.random(),
            date: new Date(day.date),
            number: day.number
          })),
          data: {}
        };

        // Ricostruisci data structure
        tripData.days.forEach((day, dayIndex) => {
          const newDayId = newTrip.days[dayIndex].id;

          if (day.categories) {
            Object.keys(day.categories).forEach(categoryId => {
              const categoryData = day.categories[categoryId];
              const key = `${newDayId}-${categoryId}`;

              if (categoryId === 'otherExpenses' && Array.isArray(categoryData)) {
                // Altre spese
                newTrip.data[key] = categoryData.map((expense, idx) => ({
                  id: expense.id || Date.now() + idx,
                  title: expense.title || '',
                  cost: '', // ← Non importa costi
                  notes: expense.notes || '',
                  links: expense.links || [],
                  images: expense.images || [],
                  videos: expense.videos || [],
                  mediaNotes: expense.mediaNotes || [],
                  bookingStatus: expense.bookingStatus || 'na',
                  costBreakdown: null,
                  hasSplitCost: false,
                  participants: null
                }));
              } else if (categoryId !== 'base') {
                // Categorie standard
                newTrip.data[key] = {
                  title: categoryData.title || '',
                  cost: '', // ← Non importa costi
                  notes: categoryData.notes || '',
                  links: categoryData.links || [],
                  images: categoryData.images || [],
                  videos: categoryData.videos || [],
                  mediaNotes: categoryData.mediaNotes || [],
                  bookingStatus: categoryData.bookingStatus || 'na',
                  transportMode: categoryData.transportMode || 'none',
                  costBreakdown: null,
                  hasSplitCost: false,
                  participants: null
                };
              }
            });
          }
        });

        console.log('✅ Viaggio importato:', newTrip.name);
        resolve(newTrip);
      } catch (error) {
        console.error('❌ Errore parsing file:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Errore lettura file'));
    };

    reader.readAsText(file);
  });
};