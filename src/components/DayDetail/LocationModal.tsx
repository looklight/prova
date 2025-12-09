import React, { useState, useEffect } from 'react';
import { MapPin, Search, ExternalLink, X, ChevronLeft } from 'lucide-react';
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

// Helper per riconoscere se l'input è coordinate
const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
  const trimmed = input.trim();

  // Formato: "45.4893, 9.2034" o "45.4893,9.2034" o "45.4893 9.2034"
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
  // Stati
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeocodingResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [useAsTitle, setUseAsTitle] = useState(false);

  // Stato per mostrare il box info sopra il textbox
  const [showSearchInfo, setShowSearchInfo] = useState(false);

  // Stato per inserimento manuale (campo unico)
  const [manualInput, setManualInput] = useState('');
  const [manualVerified, setManualVerified] = useState<{
    address: string;
    coordinates: { lat: number; lng: number };
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Animazione
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset e inizializzazione quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsAnimating(true));

      // Pre-compila la ricerca
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
          coordinates: existingLocation.coordinates
        });
      } else if (categoryTitle) {
        const query = baseLocation
          ? `${categoryTitle}, ${baseLocation}`
          : categoryTitle;
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

      // Reset altri stati
      setResults([]);
      setSearchError(null);
      setVerifyError(null);
      setViewMode('search');
      setUseAsTitle(!categoryTitle);

    } else {
      setIsAnimating(false);
    }
  }, [isOpen, categoryTitle, baseLocation, existingLocation]);

  // Blocca scroll body quando modal è aperto
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

  // Handler ricerca
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

  // Ricerca con Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Selezione risultato
  const handleSelectResult = (result: GeocodingResult) => {
    setSelectedResult(result);
  };

  // Verifica input manuale (indirizzo o coordinate)
  const handleVerifyManual = async () => {
    if (!manualInput.trim()) return;

    setIsVerifying(true);
    setVerifyError(null);
    setManualVerified(null);

    // Controlla se sono coordinate
    const coords = parseCoordinates(manualInput);

    if (coords) {
      // Sono coordinate → nessuna chiamata API
      setManualVerified({
        address: `${coords.lat}, ${coords.lng}`,
        coordinates: coords
      });
      setIsVerifying(false);
      console.log('📍 Coordinate riconosciute:', coords);
      return;
    }

    // È un indirizzo → chiama Photon
    try {
      const searchResults = await searchPlaces(manualInput, { limit: 1 });

      if (searchResults.length > 0) {
        const result = searchResults[0];
        setManualVerified({
          address: result.address,
          coordinates: result.coordinates
        });
        console.log('📍 Indirizzo trovato:', result.address);
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

  // Apri in Google Maps
  const handleOpenGoogleMaps = () => {
    if (selectedResult) {
      const url = getGoogleMapsUrl(
        selectedResult.coordinates.lat,
        selectedResult.coordinates.lng,
        selectedResult.name
      );
      window.open(url, '_blank');
    } else if (manualVerified) {
      const url = getGoogleMapsUrl(
        manualVerified.coordinates.lat,
        manualVerified.coordinates.lng
      );
      window.open(url, '_blank');
    }
  };

  // Conferma salvataggio
  const handleConfirm = () => {
    let locationData: LocationData;

    if (viewMode === 'search' && selectedResult) {
      locationData = {
        name: selectedResult.name,
        address: selectedResult.address,
        coordinates: selectedResult.coordinates
      };
    } else if (viewMode === 'manual' && manualVerified) {
      locationData = {
        name: manualInput,
        address: manualVerified.address,
        coordinates: manualVerified.coordinates
      };
    } else {
      return;
    }

    onConfirm(locationData, useAsTitle);
  };

  // Verifica se possiamo salvare
  const canSave = () => {
    if (viewMode === 'search') {
      return selectedResult !== null;
    } else {
      return manualVerified !== null;
    }
  };

  // Reset verifica quando cambia input manuale
  useEffect(() => {
    setManualVerified(null);
    setVerifyError(null);
  }, [manualInput]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-colors duration-300 ${isAnimating ? 'bg-black/50' : 'bg-transparent'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${isDesktop ? 'max-w-lg rounded-2xl mx-4 max-h-[90vh]' : 'max-w-[430px] rounded-t-3xl max-h-[95vh]'} 
  flex flex-col transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'
          }`}
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
          {viewMode === 'search' ? (
            <>
              {/* Search input */}
              {/* Box info tutorial */}
              {showSearchInfo && (
                <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg mb-2 leading-relaxed">
                  💡 Inserisci il luogo o l’indirizzo, i risultati appariranno sotto e saranno collegati a Google Maps.
                </p>
              )}

              {/* Search input */}
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

              {/* Contesto base */}
              {baseLocation && !selectedResult && (
                <div className="mb-4 px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-600">
                  💡 Base del giorno: <span className="font-medium">{baseLocation}</span>
                </div>
              )}

              {/* Errore */}
              {searchError && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">{searchError}</p>
                  <button
                    onClick={() => setViewMode('manual')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    📝 Inserisci manualmente
                  </button>
                </div>
              )}

              {/* Risultati */}
              {results.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 mb-2">Risultati:</p>
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedResult?.id === result.id
                        ? 'border-blue-500 bg-blue-50'
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
                        {selectedResult?.id === result.id && (
                          <span className="text-blue-500 text-sm">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Risultato selezionato - Azioni */}
              {selectedResult && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedResult.type}</span>
                      <span className="font-medium text-sm">{selectedResult.name}</span>
                    </div>
                    <button
                      onClick={handleOpenGoogleMaps}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 
                        border border-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ExternalLink size={14} />
                      Apri in Maps
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">{selectedResult.address}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {formatCoordinates(selectedResult.coordinates.lat, selectedResult.coordinates.lng)}
                  </p>
                </div>
              )}

              {/* Link inserimento manuale */}
              {!searchError && results.length > 0 && (
                <button
                  onClick={() => setViewMode('manual')}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  Non trovi il luogo? <span className="text-blue-600 font-medium">Inserisci manualmente</span>
                </button>
              )}
            </>
          ) : (
            /* Vista inserimento manuale - campo unico */
            <>
              <p className="text-sm text-gray-600 mb-4">
                Inserisci un indirizzo o le coordinate (es. 45.4893, 9.2034)
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo o coordinate
                  </label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyManual()}
                    placeholder="es. Via Roma 1, Milano oppure 45.4893, 9.2034"
                    className="w-full px-4 py-3 border rounded-xl text-sm"
                    autoFocus={isDesktop}
                  />
                </div>

                {/* Pulsante verifica */}
                <button
                  onClick={handleVerifyManual}
                  disabled={isVerifying || !manualInput.trim()}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 
                    disabled:text-gray-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Search size={18} />
                  {isVerifying ? 'Verifica in corso...' : 'Trova coordinate'}
                </button>

                {/* Errore verifica */}
                {verifyError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700">{verifyError}</p>
                  </div>
                )}

                {/* Risultato verifica */}
                {manualVerified && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-green-700 font-medium">
                        ✅ Posizione trovata
                      </p>
                      <button
                        onClick={handleOpenGoogleMaps}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 
                          border border-gray-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <ExternalLink size={14} />
                        Verifica su Maps
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">{manualVerified.address}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      📍 {formatCoordinates(manualVerified.coordinates.lat, manualVerified.coordinates.lng)}
                    </p>
                  </div>
                )}

                {/* Suggerimento */}
                <p className="text-xs text-gray-400">
                  💡 Per trovare le coordinate su Google Maps: tasto destro sul punto → copia coordinate
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 space-y-3">
          {/* Checkbox usa come nome */}
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

          {/* Bottoni azione */}
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
              Salva posizione
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;