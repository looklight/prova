/**
 * 💡 useSuggestions
 * 
 * @description Hook per suggerimenti intelligenti basati su giorno precedente
 * @usage Usato da: DayDetailView
 * 
 * Funzionalità:
 * - Suggerimenti "Base": destinazioni dal metadata + località giorno precedente
 * - Suggerimenti "Pernottamento": ripete hotel se stessa città del giorno prima
 * - Solo per giorni dopo il primo (no suggerimenti per giorno 1)
 */

export const useSuggestions = (trip, dayIndex, categoryData) => {
  const getSuggestion = (categoryId) => {
    if (categoryId === 'base') {
      return getBaseSuggestions();
    }

    if (dayIndex === 0) return null;

    const prevDay = trip.days[dayIndex - 1];
    const prevData = trip.data[`${prevDay.id}-${categoryId}`];

    if (categoryId === 'pernottamento') {
      const currentBase = categoryData.base.title;
      const prevBase = trip.data[`${prevDay.id}-base`]?.title;

      if (currentBase && prevBase && currentBase === prevBase) {
        return prevData?.title || null;
      }
    }

    return null;
  };

  const getBaseSuggestions = () => {
    const suggestions = [];

    if (dayIndex > 0) {
      const prevDay = trip.days[dayIndex - 1];
      const prevData = trip.data[`${prevDay.id}-base`];

      if (prevData?.title?.trim()) {
        suggestions.push({
          value: prevData.title,
          icon: '📍',
          type: 'previous',
          label: 'ieri'
        });
      }
    }

    const destinations = trip.metadata?.destinations || [];
    destinations.forEach(dest => {
      // Gestisci sia oggetti {name, coordinates} che stringhe legacy
      const destName = typeof dest === 'string' ? dest : dest.name;

      if (destName && !suggestions.some(s => s.value === destName)) {
        suggestions.push({
          value: destName,
          icon: '🗺️',
          type: 'destination',
          label: 'destinazione'
        });
      }
    });

    return suggestions.length > 0 ? suggestions : null;
  };

  return { getSuggestion };
};