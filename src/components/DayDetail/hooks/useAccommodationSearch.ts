import { useState, useRef, useEffect, useCallback } from 'react';
import { searchPlaces, GeocodingResult } from '../../../services/geocodingService';

// ============================================
// useAccommodationSearch Hook
// Gestisce autocomplete per ricerca alloggi
// ============================================

// Tipi OSM per alloggi
const ACCOMMODATION_TYPES = ['hotel', 'hostel', 'guest_house', 'motel', 'apartment', 'camp_site', 'chalet', 'alpine_hut'];

interface UseAccommodationSearchProps {
  initialValue?: string;
  onSelect: (name: string, location: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  }) => void;
  onInputChange?: (value: string) => void;
}

interface UseAccommodationSearchReturn {
  inputValue: string;
  setInputValue: (value: string) => void;
  suggestions: GeocodingResult[];
  isLoading: boolean;
  showDropdown: boolean;
  setShowDropdown: (value: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectSuggestion: (suggestion: GeocodingResult) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const useAccommodationSearch = ({
  initialValue = '',
  onSelect,
  onInputChange
}: UseAccommodationSearchProps): UseAccommodationSearchReturn => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const onInputChangeRef = useRef(onInputChange);
  onInputChangeRef.current = onInputChange;
  const pendingValueRef = useRef<string | null>(null);

  // Sync con valore iniziale (anche quando diventa vuoto)
  useEffect(() => {
    setInputValue(initialValue || '');
  }, [initialValue]);

  // Ricerca con debounce
  const searchAccommodations = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    try {
      const results = await searchPlaces(query, { limit: 6 });

      // Prioritizza alloggi
      const sorted = results.sort((a, b) => {
        const aIsAccommodation = ACCOMMODATION_TYPES.some(t =>
          a.raw?.osm_value?.toLowerCase().includes(t) ||
          a.raw?.osm_key?.toLowerCase() === 'tourism'
        );
        const bIsAccommodation = ACCOMMODATION_TYPES.some(t =>
          b.raw?.osm_value?.toLowerCase().includes(t) ||
          b.raw?.osm_key?.toLowerCase() === 'tourism'
        );
        if (aIsAccommodation && !bIsAccommodation) return -1;
        if (!aIsAccommodation && bIsAccommodation) return 1;
        return 0;
      });

      setSuggestions(sorted.slice(0, 5));
      setShowDropdown(sorted.length > 0);
    } catch (error) {
      console.error('Errore ricerca alloggi:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    pendingValueRef.current = value;

    // Debounce per salvataggio (500ms)
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    saveDebounceRef.current = setTimeout(() => {
      onInputChangeRef.current?.(value);
      pendingValueRef.current = null;
    }, 500);

    // Debounce per ricerca suggerimenti (300ms)
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      searchAccommodations(value);
    }, 300);
  }, [searchAccommodations]);

  const handleSelectSuggestion = useCallback((suggestion: GeocodingResult) => {
    setInputValue(suggestion.name);
    onSelect(suggestion.name, {
      name: suggestion.name,
      address: suggestion.address,
      coordinates: suggestion.coordinates
    });
    setSuggestions([]);
    setShowDropdown(false);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }, []);

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
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        // Salva il valore pendente prima di smontare
        if (pendingValueRef.current !== null) {
          onInputChangeRef.current?.(pendingValueRef.current);
        }
      }
    };
  }, []);

  return {
    inputValue,
    setInputValue,
    suggestions,
    isLoading,
    showDropdown,
    setShowDropdown,
    inputRef,
    dropdownRef,
    handleInputChange,
    handleSelectSuggestion,
    handleKeyDown
  };
};

export default useAccommodationSearch;
