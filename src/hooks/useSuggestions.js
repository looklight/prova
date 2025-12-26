/**
 * 💡 useSuggestions - ALTROVE VERSION
 *
 * @description Hook per suggerimenti intelligenti basati su giorno precedente
 * @usage Usato da: DayDetailView, DestinationsSection
 *
 * Funzionalità:
 * - Suggerimenti "Destinazione": destinazioni dal metadata + località giorno precedente
 * - Suggerimenti "Pernottamento": ripete hotel se stessa città del giorno prima
 * - Solo per giorni dopo il primo (no suggerimenti per giorno 1)
 */

export const useSuggestions = (trip, dayIndex, categoryData) => {
  const getSuggestion = (categoryId) => {
    if (categoryId === 'destinazione') {
      return getDestinationSuggestions();
    }

    if (dayIndex === 0) return null;

    const prevDay = trip.days[dayIndex - 1];
    const prevData = trip.data[`${prevDay.id}-${categoryId}`];

    if (categoryId === 'pernottamento') {
      // Se il giorno precedente ha un pernottamento, suggeriscilo
      if (prevData?.title) {
        // Verifica se siamo nella stessa città (per mostrare label appropriata)
        let sameCity = false;

        const currentDay = trip.days[dayIndex];
        let currentCity = null;
        if (currentDay?.destinations?.length > 0) {
          currentCity = currentDay.destinations[0];
        } else {
          const currentTitle = categoryData.destinazione?.title;
          if (currentTitle) {
            const parts = currentTitle.split(' → ');
            currentCity = parts[0]?.trim();
          }
        }

        let prevArrivalCity = null;
        if (prevDay?.destinations?.length > 0) {
          prevArrivalCity = prevDay.destinations[prevDay.destinations.length - 1];
        } else {
          const prevTitle = trip.data[`${prevDay.id}-destinazione`]?.title;
          if (prevTitle) {
            const parts = prevTitle.split(' → ');
            prevArrivalCity = parts[parts.length - 1]?.trim();
          }
        }

        if (currentCity && prevArrivalCity) {
          sameCity = currentCity.toLowerCase() === prevArrivalCity.toLowerCase();
        }

        return {
          title: prevData.title,
          location: prevData.location || null,
          sameCity // utile per UI (es. mostrare "stessa città" o "ieri")
        };
      }
    }

    return null;
  };

  const getDestinationSuggestions = () => {
    const suggestions = [];

    // Suggerisci la città di ARRIVO del giorno precedente (seconda destinazione se c'è trasferimento)
    if (dayIndex > 0) {
      const prevDay = trip.days[dayIndex - 1];

      // Nuovo formato: array destinations in trip.days[]
      if (prevDay.destinations && prevDay.destinations.length > 0) {
        // Se ci sono 2 destinazioni, suggerisci la seconda (arrivo)
        // Se c'è solo 1 destinazione, suggerisci quella
        const arrivalCity = prevDay.destinations.length > 1
          ? prevDay.destinations[1]
          : prevDay.destinations[0];

        if (arrivalCity?.trim()) {
          suggestions.push({
            value: arrivalCity,
            icon: '📍',
            type: 'previous',
            label: prevDay.destinations.length > 1 ? 'arrivo ieri' : 'ieri'
          });
        }
      } else {
        // Fallback: vecchio formato title in trip.data
        const prevData = trip.data[`${prevDay.id}-destinazione`];
        if (prevData?.title?.trim()) {
          // Se il title contiene " → ", prendi la seconda parte
          const parts = prevData.title.split(' → ');
          const arrivalCity = parts.length > 1 ? parts[1] : parts[0];

          suggestions.push({
            value: arrivalCity.trim(),
            icon: '📍',
            type: 'previous',
            label: parts.length > 1 ? 'arrivo ieri' : 'ieri'
          });
        }
      }
    }

    // Suggerisci le destinazioni dal metadata del viaggio
    const destinations = trip.metadata?.destinations || [];
    destinations.forEach(dest => {
      // Gestisci sia oggetti {name, coordinates} che stringhe legacy
      const destName = typeof dest === 'string' ? dest : dest.name;

      if (destName && !suggestions.some(s => s.value === destName)) {
        suggestions.push({
          value: destName,
          icon: '🗺️',
          type: 'destination',
          label: 'meta viaggio'
        });
      }
    });

    return suggestions.length > 0 ? suggestions : null;
  };

  return { getSuggestion, getDestinationSuggestions };
};