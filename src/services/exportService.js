/**
 * 🎯 Export/Import Service
 * 
 * Gestisce esportazione e importazione viaggi in formato JSON e CSV.
 * Export include: struttura, titoli, note, link, video, immagini (URL)
 * Export esclude: costi, membri, breakdown (dati sensibili)
 */

import {
  escapeCSV,
  formatDateIT,
  CSV_BOM
} from '../utils/csvHelpers';

import { CATEGORIES } from '../utils/constants';

/**
 * Sanitizza dati viaggio per export (rimuove info sensibili)
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
    // 🆕 Salva ordine personalizzato categorie (se presente)
    categoryOrder: trip.categoryOrder || null,
    days: trip.days.map(day => {
      const dayData = {
        number: day.number,
        date: day.date,
        categories: {}
      };

      Object.keys(trip.data || {}).forEach(key => {
        if (key.startsWith(`${day.id}-`)) {
          const categoryId = key.split('-')[1];
          const cellData = trip.data[key];

          if (!cellData) return;

          if (categoryId === 'otherExpenses') {
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

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
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
 * 📋 Esporta viaggio come CSV (struttura a matrice: giorni in colonna, categorie in riga)
 */
export const exportTripAsCSV = (trip) => {
  try {
    const tripName = trip.metadata?.name || trip.name || 'Viaggio';
    const rows = [];

    // Riga 1: intestazione giorni
    const headerGiorni = [''].concat(trip.days.map(day => `Giorno ${day.number}`));
    rows.push(headerGiorni.join(';'));

    // Riga 2: date
    const headerDate = [''].concat(trip.days.map(day => formatDateIT(day.date)));
    rows.push(headerDate.join(';'));

    // Riga Luogo (base)
    const luogoRow = ['Luogo'].concat(trip.days.map(day => {
      const baseKey = `${day.id}-base`;
      return escapeCSV(trip.data[baseKey]?.title || '');
    }));
    rows.push(luogoRow.join(';'));

    // 🆕 Usa trip.categoryOrder se presente, altrimenti ordine di default
    const defaultOrder = CATEGORIES
      .filter(c => !['base', 'otherExpenses', 'note'].includes(c.id))
      .map(c => c.id);
    
    const categoryOrder = trip.categoryOrder || defaultOrder;

    // Genera riga per ogni categoria nell'ordine corretto
    categoryOrder.forEach(catId => {
      const category = CATEGORIES.find(c => c.id === catId);
      if (!category) return;
      
      const row = [category.label].concat(trip.days.map(day => {
        const key = `${day.id}-${catId}`;
        const cellData = trip.data[key];
        return escapeCSV(cellData?.title || '');
      }));
      rows.push(row.join(';'));
    });

    // Righe per "Altre Spese" (possono essere multiple per giorno)
    const maxOtherExpenses = Math.max(
      ...trip.days.map(day => {
        const key = `${day.id}-otherExpenses`;
        const data = trip.data[key];
        return Array.isArray(data) ? data.length : 0;
      }),
      0
    );

    for (let i = 0; i < maxOtherExpenses; i++) {
      const row = [`Altre Spese ${i + 1}`].concat(trip.days.map(day => {
        const key = `${day.id}-otherExpenses`;
        const data = trip.data[key];
        if (Array.isArray(data) && data[i]) {
          return escapeCSV(data[i].title || '');
        }
        return '';
      }));
      rows.push(row.join(';'));
    }

    const csvContent = rows.join('\n');

    const blob = new Blob([CSV_BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-itinerario.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ CSV itinerario esportato:', tripName);
    return true;
  } catch (error) {
    console.error('❌ Errore export CSV:', error);
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

        if (!importData.version) {
          throw new Error('File non valido: versione mancante');
        }

        let tripData;
        
        if (importData.version === '1.0' || importData.version === '2.0') {
          tripData = importData.trip;
        } else {
          throw new Error(`Versione non supportata: ${importData.version}`);
        }

        if (!tripData || !tripData.days) {
          throw new Error('File non valido: dati viaggio mancanti');
        }

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
          // 🆕 Ripristina ordine personalizzato categorie (se presente)
          categoryOrder: tripData.categoryOrder || null,
          days: tripData.days.map(day => ({
            id: Date.now() + Math.random(),
            date: new Date(day.date),
            number: day.number
          })),
          data: {}
        };

        tripData.days.forEach((day, dayIndex) => {
          const newDayId = newTrip.days[dayIndex].id;

          if (day.categories) {
            Object.keys(day.categories).forEach(categoryId => {
              const categoryData = day.categories[categoryId];
              const key = `${newDayId}-${categoryId}`;

              if (categoryId === 'otherExpenses' && Array.isArray(categoryData)) {
                newTrip.data[key] = categoryData.map((expense, idx) => ({
                  id: expense.id || Date.now() + idx,
                  title: expense.title || '',
                  cost: '',
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
                newTrip.data[key] = {
                  title: categoryData.title || '',
                  cost: '',
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