import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { searchPlaces, GeocodingResult } from '../../../services/geocodingService';
import { colors } from '../../../styles/theme';

// ============================================
// ALTROVE - LocationAutocomplete (Inline Version)
// Input autocomplete per location senza pulsante inserisci
// ============================================

export interface LocationData {
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: LocationData) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Cerca luogo...',
  disabled = false,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const searchLocations = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    try {
      const results = await searchPlaces(query, { limit: 5 });
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Errore ricerca location:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: GeocodingResult) => {
    const location: LocationData = {
      name: suggestion.name,
      address: suggestion.address,
      coordinates: suggestion.coordinates
    };

    onSelect(location);
    onChange(suggestion.name);
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
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  // Click outside closes dropdown
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
    <div className={`relative flex-1 ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-colors"
          style={{
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.bgCard
          }}
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 size={14} className="animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
          style={{ minWidth: '280px', width: 'max-content', maxWidth: '90vw', left: 0 }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-3 py-2 text-left flex items-start gap-2 transition-colors ${
                index === highlightedIndex
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-sm flex-shrink-0">{suggestion.type}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-gray-900 truncate">
                  {suggestion.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.address}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
