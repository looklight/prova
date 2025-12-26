import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { searchPlaces, GeocodingResult } from '../../services/geocodingService';

export interface Destination {
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface DestinationAutocompleteProps {
  onSelect: (destination: Destination) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Tipi OSM da includere (città, paesi, regioni)
const PLACE_TYPES = ['city', 'town', 'village', 'state', 'country', 'locality', 'district', 'region'];

const DestinationAutocomplete: React.FC<DestinationAutocompleteProps> = ({
  onSelect,
  placeholder = 'es. Tokyo',
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const searchDestinations = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    try {
      const results = await searchPlaces(query, { limit: 6 });

      // Filtra solo luoghi/città (no hotel, ristoranti, ecc.)
      const filtered = results.filter(result => {
        const osmKey = result.raw?.osm_key?.toLowerCase() || '';
        const osmValue = result.raw?.osm_value?.toLowerCase() || '';
        const type = result.raw?.type?.toLowerCase() || '';

        // Includi se è un place type riconosciuto
        if (PLACE_TYPES.includes(osmValue) || PLACE_TYPES.includes(type)) {
          return true;
        }

        // Includi anche "place" generico
        if (osmKey === 'place') {
          return true;
        }

        // Includi boundary/administrative (regioni, stati)
        if (osmKey === 'boundary' || osmValue === 'administrative') {
          return true;
        }

        return false;
      });

      setSuggestions(filtered.slice(0, 5));
      setShowDropdown(filtered.length > 0);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Errore ricerca destinazioni:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Gestione input change con debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(() => {
      searchDestinations(value);
    }, 300);
  };

  // Selezione da dropdown
  const handleSelectSuggestion = (suggestion: GeocodingResult) => {
    const destination: Destination = {
      name: suggestion.name,
      coordinates: suggestion.coordinates
    };

    onSelect(destination);
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Inserimento manuale (Invio senza selezionare)
  const handleManualSubmit = () => {
    if (!inputValue.trim()) return;

    const destination: Destination = {
      name: inputValue.trim()
    };

    onSelect(destination);
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else {
        handleManualSubmit();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  // Click outside chiude dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex-1">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowDropdown(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-sm"
          />

          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleManualSubmit}
          disabled={disabled || !inputValue.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm whitespace-nowrap"
        >
          + Inserisci
        </button>
      </div>

      {/* Dropdown suggerimenti */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === highlightedIndex
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-lg flex-shrink-0">{suggestion.type}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {suggestion.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.address}
                </p>
              </div>
              <MapPin size={14} className="text-green-500 flex-shrink-0" />
            </button>
          ))}

          {/* Hint per inserimento manuale */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Premi <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Invio</kbd> per inserire senza geolocalizzazione
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationAutocomplete;