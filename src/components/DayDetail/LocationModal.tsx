import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Search, ExternalLink, X, ChevronLeft, Link, Navigation, Home } from 'lucide-react';
import {
  searchPlaces,
  getGoogleMapsUrl,
  isValidCoordinates,
  formatCoordinates,
  GeocodingResult,
  LocationData
} from '../../services/geocodingService';

interface LocationModalProps {
  isOpen: boolean;
  isDesktop: boolean;
  categoryTitle: string;
  baseLocation: string | null;
  existingLocation: LocationData | null;
  onClose: () => void;
  onConfirm: (location: LocationData, useAsTitle: boolean) => void;
  onRemove: () => void;
}

type ViewMode = 'search' | 'manual';
type InputType = 'unknown' | 'coordinates' | 'google_maps_url' | 'address';

// Helper per riconoscere se l'input è coordinate
const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
  const trimmed = input.trim();
  const regex = /^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/;
  const match = trimmed.match(regex);

  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isValidCoordinates(lat, lng)) {
      return { lat, lng };
    }
  }
  return null;
};

// Helper per parsing link Google Maps (supporta vari formati)
const parseGoogleMapsUrl = (input: string): { lat: number; lng: number } | null => {
  const trimmed = input.trim();
  
  // Verifica che sia un URL Google Maps
  if (!trimmed.includes('google') || !trimmed.includes('maps')) {
    return null;
  }

  // PRIORITÀ 1: !8m2!3d(lat)!4d(lng) - coordinate esatte del place (precedono !3d!4d generico)
  // Questo formato appare nei link "place" e contiene le coordinate reali del posto
  const place8mMatch = trimmed.match(/!8m2!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (place8mMatch) {
    const lat = parseFloat(place8mMatch[1]);
    const lng = parseFloat(place8mMatch[2]);
    if (isValidCoordinates(lat, lng)) return { lat, lng };
  }

  // PRIORITÀ 2: !3d(lat)!4d(lng) generico (ma dopo !8m2)
  const embedMatch = trimmed.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
  if (embedMatch) {
    const lat = parseFloat(embedMatch[1]);
    const lng = parseFloat(embedMatch[2]);
    if (isValidCoordinates(lat, lng)) return { lat, lng };
  }

  // PRIORITÀ 3: ?q=lat,lng
  const qMatch = trimmed.match(/[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoordinates(lat, lng)) return { lat, lng };
  }

  // PRIORITÀ 4: ?ll=lat,lng
  const llMatch = trimmed.match(/[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (isValidCoordinates(lat, lng)) return { lat, lng };
  }

  // PRIORITÀ 5: /search/lat,lng
  const searchMatch = trimmed.match(/\/search\/(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (searchMatch) {
    const lat = parseFloat(searchMatch[1]);
    const lng = parseFloat(searchMatch[2]);
    if (isValidCoordinates(lat, lng)) return { lat, lng };
  }

  // PRIORITÀ 6 (ultima): /@lat,lng,zoom - questo è solo il viewport, non il place
  const atMatch = trimmed.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoordinates(lat, lng)) return { lat, lng };
  }

  return null;
};

// Determina il tipo di input
const detectInputType = (input: string): InputType => {
  const trimmed = input.trim();
  if (!trimmed) return 'unknown';
  
  if (parseCoordinates(trimmed)) return 'coordinates';
  if (parseGoogleMapsUrl(trimmed)) return 'google_maps_url';
  if (trimmed.length > 3) return 'address';
  
  return 'unknown';
};

const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  isDesktop,
  categoryTitle,
  baseLocation,
  existingLocation,
  onClose,
  onConfirm,
  onRemove
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeocodingResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [useAsTitle, setUseAsTitle] = useState(false);
  const [showSearchInfo, setShowSearchInfo] = useState(false);

  const [manualInput, setManualInput] = useState('');
  const [manualVerified, setManualVerified] = useState<{
    address: string;
    coordinates: { lat: number; lng: number };
    inputType: InputType;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);

  const detectedInputType = useMemo(() => detectInputType(manualInput), [manualInput]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsAnimating(true));

      if (existingLocation) {
        setSearchQuery(existingLocation.name);
        setSelectedResult({
          id: 'existing',
          name: existingLocation.name,
          address: existingLocation.address,
          type: '📍',
          coordinates: existingLocation.coordinates
        });
        setManualInput(existingLocation.address);
        setManualVerified({
          address: existingLocation.address,
          coordinates: existingLocation.coordinates,
          inputType: 'address'
        });
      } else if (categoryTitle) {
        const query = baseLocation ? `${categoryTitle}, ${baseLocation}` : categoryTitle;
        setSearchQuery(query);
        setSelectedResult(null);
        setManualInput('');
        setManualVerified(null);
      } else {
        setSearchQuery('');
        setSelectedResult(null);
        setManualInput('');
        setManualVerified(null);
      }

      setResults([]);
      setSearchError(null);
      setVerifyError(null);
      setViewMode('search');
      setUseAsTitle(!categoryTitle);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, categoryTitle, baseLocation, existingLocation]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSelectedResult(null);

    try {
      const searchResults = await searchPlaces(searchQuery, { limit: 5 });
      setResults(searchResults);

      if (searchResults.length === 0) {
        setSearchError('Nessun risultato trovato. Prova con un indirizzo più specifico.');
      }
    } catch (error) {
      console.error('Errore ricerca:', error);
      setSearchError('Errore durante la ricerca. Riprova.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectResult = (result: GeocodingResult) => {
    setSelectedResult(result);
  };

  // Verifica input manuale - PRIMA controlla tipo, POI decide se chiamare API
  const handleVerifyManual = async () => {
    if (!manualInput.trim()) return;

    setIsVerifying(true);
    setVerifyError(null);
    setManualVerified(null);

    // 1. Prova coordinate dirette
    const coords = parseCoordinates(manualInput);
    if (coords) {
      setManualVerified({
        address: `${coords.lat}, ${coords.lng}`,
        coordinates: coords,
        inputType: 'coordinates'
      });
      setIsVerifying(false);
      return;
    }

    // 2. Prova link Google Maps
    const mapsCoords = parseGoogleMapsUrl(manualInput);
    if (mapsCoords) {
      setManualVerified({
        address: `${mapsCoords.lat}, ${mapsCoords.lng}`,
        coordinates: mapsCoords,
        inputType: 'google_maps_url'
      });
      setIsVerifying(false);
      return;
    }

    // 3. Solo se è un indirizzo testuale, chiama Photon
    try {
      const searchResults = await searchPlaces(manualInput, { limit: 1 });

      if (searchResults.length > 0) {
        const result = searchResults[0];
        setManualVerified({
          address: result.address,
          coordinates: result.coordinates,
          inputType: 'address'
        });
      } else {
        setVerifyError('Indirizzo non trovato. Verifica e riprova.');
      }
    } catch (error) {
      console.error('Errore verifica:', error);
      setVerifyError('Errore durante la verifica. Riprova.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenGoogleMaps = () => {
    let lat: number, lng: number, name: string | undefined;

    if (selectedResult) {
      lat = selectedResult.coordinates.lat;
      lng = selectedResult.coordinates.lng;
      name = selectedResult.name;
    } else if (manualVerified) {
      lat = manualVerified.coordinates.lat;
      lng = manualVerified.coordinates.lng;
      name = manualVerified.address;
    } else return;

    const url = getGoogleMapsUrl(lat, lng, name);
    window.open(url, '_blank');
  };

  const handleConfirm = () => {
    let locationData: LocationData;

    if (viewMode === 'search' && selectedResult) {
      locationData = {
        name: selectedResult.name,
        address: selectedResult.address,
        coordinates: selectedResult.coordinates
      };
    } else if (viewMode === 'manual' && manualVerified) {
      const name = manualVerified.inputType === 'address' 
        ? manualInput 
        : `📍 ${formatCoordinates(manualVerified.coordinates.lat, manualVerified.coordinates.lng)}`;
      
      locationData = {
        name: name,
        address: manualVerified.address,
        coordinates: manualVerified.coordinates
      };
    } else {
      return;
    }

    onConfirm(locationData, useAsTitle);
  };

  const canSave = () => {
    if (viewMode === 'search') {
      return selectedResult !== null;
    } else {
      return manualVerified !== null;
    }
  };

  useEffect(() => {
    setManualVerified(null);
    setVerifyError(null);
  }, [manualInput]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-colors duration-300 ${isAnimating ? 'bg-black/50' : 'bg-transparent'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${isDesktop ? 'max-w-lg rounded-2xl mx-4 max-h-[90vh]' : 'max-w-[430px] rounded-t-3xl max-h-[95vh]'} 
          flex flex-col transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {viewMode === 'manual' && (
              <button
                onClick={() => setViewMode('search')}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <MapPin size={20} className="text-blue-500" />
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {viewMode === 'search' ? 'Posizione' : 'Inserimento manuale'}
              </h3>
              {viewMode === 'search' && (
                <button
                  type="button"
                  onClick={() => setShowSearchInfo(!showSearchInfo)}
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-semibold text-gray-500 border border-gray-300 rounded-full hover:bg-gray-100"
                >
                  ?
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showSearchInfo && viewMode === 'search' && (
            <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg mb-2 leading-relaxed">
              💡 Inserisci il luogo o l'indirizzo, i risultati appariranno sotto e saranno collegati a Google Maps.
            </p>
          )}

          {viewMode === 'search' && (
            <>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Cerca luogo o indirizzo..."
                    className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm"
                    autoFocus={isDesktop}
                  />
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                    text-white rounded-xl font-medium transition-colors flex-shrink-0"
                >
                  {isSearching ? '...' : 'Cerca'}
                </button>
              </div>

              {/* Divisore "Oppure" */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <button
                  onClick={() => setViewMode('manual')}
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Oppure <span className="text-blue-600 font-medium">inserisci manualmente</span>
                </button>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {searchError && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">{searchError}</p>
                </div>
              )}

              {selectedResult && results.length === 0 && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{selectedResult.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{selectedResult.name}</p>
                      <p className="text-xs text-gray-500 truncate">{selectedResult.address}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        📍 {formatCoordinates(selectedResult.coordinates.lat, selectedResult.coordinates.lng)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGoogleMaps();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 
                          border border-gray-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <ExternalLink size={14} />
                        Maps
                      </button>
                      <span className="text-green-500 text-lg">✓</span>
                    </div>
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 mb-2">Risultati:</p>
                  {results.map((result) => {
                    const isSelected = selectedResult?.id === result.id;
                    return (
                      <div
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{result.type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{result.name}</p>
                            <p className="text-xs text-gray-500 truncate">{result.address}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              📍 {formatCoordinates(result.coordinates.lat, result.coordinates.lng)}
                            </p>
                          </div>

                          {isSelected ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenGoogleMaps();
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 
                                  border border-gray-200 rounded-lg text-xs font-medium transition-colors"
                              >
                                <ExternalLink size={14} />
                                Maps
                              </button>
                              <span className="text-green-500 text-lg">✓</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-sm">○</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {viewMode === 'manual' && (
            <div className="space-y-4">
              {/* Spiegazione minimal */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Home size={12} /> Indirizzo</span>
                <span className="flex items-center gap-1"><Navigation size={12} /> Coordinate</span>
              </div>

              {/* Input */}
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyManual()}
                placeholder="Inserisci indirizzo completo o coordinate..."
                className="w-full px-4 py-3 border rounded-xl text-sm"
                autoFocus={isDesktop}
              />

              {/* Pulsante verifica */}
              <button
                onClick={handleVerifyManual}
                disabled={isVerifying || !manualInput.trim()}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 
                  disabled:text-gray-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Search size={18} />
                {isVerifying ? 'Verifica...' : 'Verifica'}
              </button>

              {/* Errore */}
              {verifyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{verifyError}</p>
                </div>
              )}

              {/* Risultato */}
              {manualVerified && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-green-700 font-medium">✅ Posizione trovata</p>
                    <button
                      onClick={handleOpenGoogleMaps}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 
                        border border-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ExternalLink size={14} />
                      Maps
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    📍 {formatCoordinates(manualVerified.coordinates.lat, manualVerified.coordinates.lng)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 space-y-3">
          {canSave() && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAsTitle}
                onChange={(e) => setUseAsTitle(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                Usa come nome della categoria
              </span>
            </label>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Annulla
            </button>

            {existingLocation && (
              <button
                onClick={onRemove}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
              >
                Rimuovi
              </button>
            )}

            <button
              onClick={handleConfirm}
              disabled={!canSave()}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                text-white rounded-xl font-medium transition-colors"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;