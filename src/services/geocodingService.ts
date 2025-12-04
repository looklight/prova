/**
 * Servizio di Geocoding con Photon (Komoot)
 * https://photon.komoot.io/
 * 
 * Gratuito, basato su OpenStreetMap
 */

export interface GeocodingResult {
  id: string;
  name: string;
  address: string;
  type: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  raw?: any; // Dati originali Photon per debug
}

export interface LocationData {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

// Mappa tipi OSM → emoji
const TYPE_EMOJI: Record<string, string> = {
  'hotel': '🏨',
  'hostel': '🏨',
  'guest_house': '🏨',
  'motel': '🏨',
  'apartment': '🏠',
  'house': '🏠',
  'restaurant': '🍽️',
  'cafe': '☕',
  'bar': '🍺',
  'fast_food': '🍔',
  'museum': '🏛️',
  'attraction': '🎯',
  'monument': '🏛️',
  'castle': '🏰',
  'church': '⛪',
  'theatre': '🎭',
  'cinema': '🎬',
  'beach': '🏖️',
  'park': '🌳',
  'station': '🚉',
  'airport': '✈️',
  'bus_stop': '🚌',
  'parking': '🅿️',
  'hospital': '🏥',
  'pharmacy': '💊',
  'shop': '🛍️',
  'supermarket': '🛒',
  'city': '🏙️',
  'town': '🏘️',
  'village': '🏘️',
  'locality': '📍',
  'street': '🛤️',
  'default': '📍'
};

/**
 * Determina l'emoji in base al tipo di luogo
 */
const getTypeEmoji = (properties: any): string => {
  const osmValue = properties.osm_value?.toLowerCase() || '';
  const osmKey = properties.osm_key?.toLowerCase() || '';
  const type = properties.type?.toLowerCase() || '';
  
  // Cerca match in ordine di specificità
  if (TYPE_EMOJI[osmValue]) return TYPE_EMOJI[osmValue];
  if (TYPE_EMOJI[osmKey]) return TYPE_EMOJI[osmKey];
  if (TYPE_EMOJI[type]) return TYPE_EMOJI[type];
  
  // Fallback per categorie generiche
  if (osmKey === 'tourism') return '🎯';
  if (osmKey === 'amenity') return '📍';
  if (osmKey === 'building') return '🏢';
  
  return TYPE_EMOJI['default'];
};

/**
 * Costruisce l'indirizzo leggibile dai dati Photon
 */
const buildAddress = (properties: any): string => {
  const parts: string[] = [];
  
  // Via e numero
  if (properties.street) {
    let street = properties.street;
    if (properties.housenumber) {
      street += ` ${properties.housenumber}`;
    }
    parts.push(street);
  }
  
  // CAP e Città
  if (properties.postcode || properties.city) {
    const cityPart = [properties.postcode, properties.city].filter(Boolean).join(' ');
    if (cityPart) parts.push(cityPart);
  }
  
  // Provincia/Stato (solo se diverso dalla città)
  if (properties.state && properties.state !== properties.city) {
    parts.push(properties.state);
  }
  
  // Paese (solo se non è Italia, per brevità)
  if (properties.country && properties.country !== 'Italy' && properties.country !== 'Italia') {
    parts.push(properties.country);
  }
  
  return parts.join(', ') || properties.name || 'Indirizzo sconosciuto';
};

/**
 * Cerca luoghi con Photon
 * 
 * @param query - Testo da cercare (es. "Colosseo Roma")
 * @param options - Opzioni di ricerca
 * @returns Array di risultati
 */
export const searchPlaces = async (
  query: string,
  options: {
    limit?: number;
    lang?: string;
    bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  } = {}
): Promise<GeocodingResult[]> => {
  const { limit = 5, lang = 'default' } = options;
  
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: limit.toString()
    });
    
    // Aggiungi lang solo se specificato e diverso da default
    // Photon supporta: de, en, fr (non it)
    if (lang && lang !== 'default' && ['de', 'en', 'fr'].includes(lang)) {
      params.append('lang', lang);
    }
    
    // Se abbiamo un bounding box, aggiungiamolo
    if (options.bbox) {
      const [minLon, minLat, maxLon, maxLat] = options.bbox;
      params.append('bbox', `${minLon},${minLat},${maxLon},${maxLat}`);
    }
    
    const response = await fetch(
      `https://photon.komoot.io/api/?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`Photon API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }
    
    return data.features.map((feature: any, index: number) => {
      const properties = feature.properties || {};
      const coordinates = feature.geometry?.coordinates || [0, 0];
      
      // ID unico: osm_id + index + timestamp + random
      const uniqueId = `${properties.osm_id || 'unknown'}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: uniqueId,
        name: properties.name || buildAddress(properties),
        address: buildAddress(properties),
        type: getTypeEmoji(properties),
        coordinates: {
          lat: coordinates[1], // GeoJSON è [lng, lat]
          lng: coordinates[0]
        },
        raw: properties
      };
    });
    
  } catch (error) {
    console.error('❌ [Geocoding] Errore ricerca:', error);
    throw error;
  }
};

/**
 * Geocoding inverso: da coordinate a indirizzo
 * 
 * @param lat - Latitudine
 * @param lng - Longitudine
 * @returns Risultato o null
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<GeocodingResult | null> => {
  try {
    const response = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=it`
    );
    
    if (!response.ok) {
      throw new Error(`Photon reverse API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return null;
    }
    
    const feature = data.features[0];
    const properties = feature.properties || {};
    const coordinates = feature.geometry?.coordinates || [lng, lat];
    
    return {
      id: `reverse-${Date.now()}`,
      name: properties.name || buildAddress(properties),
      address: buildAddress(properties),
      type: getTypeEmoji(properties),
      coordinates: {
        lat: coordinates[1],
        lng: coordinates[0]
      },
      raw: properties
    };
    
  } catch (error) {
    console.error('❌ [Geocoding] Errore reverse:', error);
    return null;
  }
};

/**
 * Genera URL per aprire Google Maps su coordinate specifiche
 */
export const getGoogleMapsUrl = (lat: number, lng: number, name?: string): string => {
  if (name) {
    // Se abbiamo un nome, usa la ricerca per mostrare info complete
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  }
  // Altrimenti punta direttamente alle coordinate
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};

/**
 * Valida coordinate
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/**
 * Formatta coordinate per visualizzazione
 */
export const formatCoordinates = (lat: number, lng: number, precision: number = 4): string => {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
};