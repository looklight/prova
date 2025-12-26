import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, ChevronUp, ChevronDown, Plus, HelpCircle, Loader2, Trash2 } from 'lucide-react';
import LocationModal from './LocationModal';
import { searchPlaces, GeocodingResult } from '../../../services/geocodingService';
import type { LocationData } from '../../../services/geocodingService';

export interface Waypoint {
  id: number;
  name: string;
  location: LocationData | null;
}

interface WaypointsModalProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
  onSave: (waypoints: Waypoint[], mainLocation: LocationData | null) => void;
  /** Title della categoria (per inizializzare prima tappa) */
  categoryTitle: string;
  /** Location della categoria (geotag principale) */
  categoryLocation: LocationData | null;
  /** Waypoints esistenti */
  existingWaypoints: Waypoint[];
  /** Location base del giorno (per suggerimenti ricerca) */
  baseLocation?: string | null;
}

const MAX_WAYPOINTS = 4;

/**
 * Modal per gestire le tappe di un'attività.
 *
 * - La prima tappa si inizializza dal title+location della categoria
 * - Massimo 4 tappe totali
 * - Ogni tappa può avere un geotag opzionale
 * - Riordinabili con frecce su/giù in modalità modifica
 * - Al salvataggio, la prima tappa diventa il title+location della categoria
 */
const WaypointsModal: React.FC<WaypointsModalProps> = ({
  isOpen,
  isDesktop,
  onClose,
  onSave,
  categoryTitle,
  categoryLocation,
  existingWaypoints,
  baseLocation
}) => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Stato per LocationModal interno
  const [locationModal, setLocationModal] = useState<{
    isOpen: boolean;
    waypointId: number | null;
  }>({ isOpen: false, waypointId: null });

  // Stato per autocomplete
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inizializza waypoints quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      // Animazione entrata
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });

      // Inizializza waypoints
      if (existingWaypoints && existingWaypoints.length > 0) {
        // Ci sono waypoints esistenti
        // Verifica se il primo corrisponde al title categoria
        const firstWaypoint = existingWaypoints[0];
        if (firstWaypoint.name === categoryTitle) {
          // Già sincronizzato, usa come sono
          setWaypoints(existingWaypoints);
        } else if (categoryTitle) {
          // Inserisci il title categoria come primo
          const categoryWaypoint: Waypoint = {
            id: Date.now(),
            name: categoryTitle || '',
            location: categoryLocation
          };
          setWaypoints([categoryWaypoint, ...existingWaypoints]);
        } else {
          setWaypoints(existingWaypoints);
        }
        setIsEditing(false); // Apri in lettura se ci sono dati
      } else {
        // Nessun waypoint, inizializza con title categoria
        const initialWaypoint: Waypoint = {
          id: Date.now(),
          name: categoryTitle || '',
          location: categoryLocation
        };
        setWaypoints([initialWaypoint]);
        setIsEditing(true); // Apri in modifica se è vuoto
      }
    } else {
      setIsAnimating(false);
      setActiveAutocomplete(null);
      setSuggestions([]);
    }
  }, [isOpen, existingWaypoints, categoryTitle, categoryLocation]);

  // Blocca scroll quando modal aperto
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

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setActiveAutocomplete(null);
    setSuggestions([]);
    setTimeout(onClose, 200);
  };

  const handleSave = () => {
    // Filtra waypoints vuoti (senza nome)
    const validWaypoints = waypoints.filter(w => w.name.trim() !== '');

    if (validWaypoints.length === 0) {
      // Nessuna tappa valida, salva con valori vuoti
      onSave([], null);
    } else {
      // La prima tappa diventa il title+location della categoria
      const mainLocation = validWaypoints[0].location;
      onSave(validWaypoints, mainLocation);
    }

    handleClose();
  };

  const addWaypoint = () => {
    if (waypoints.length >= MAX_WAYPOINTS) return;

    const newWaypoint: Waypoint = {
      id: Date.now(),
      name: '',
      location: null
    };
    setWaypoints([...waypoints, newWaypoint]);
    // Attiva autocomplete sul nuovo waypoint
    setActiveAutocomplete(newWaypoint.id);
  };

  // Elimina waypoint
  const removeWaypoint = (id: number) => {
    // Se è l'unico, svuotalo invece di rimuoverlo
    if (waypoints.length <= 1) {
      setWaypoints([{ id: Date.now(), name: '', location: null }]);
      return;
    }
    setWaypoints(waypoints.filter(w => w.id !== id));
  };

  // Ricerca luoghi con debounce
  const searchDestinations = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      // Cerca tutti i tipi di luoghi (non solo città)
      const results = await searchPlaces(query, { limit: 5 });
      setSuggestions(results);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Errore ricerca luoghi:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const updateWaypointName = (id: number, name: string) => {
    setWaypoints(waypoints.map(w =>
      w.id === id ? { ...w, name } : w
    ));

    // Attiva autocomplete e cerca
    setActiveAutocomplete(id);

    // Debounce ricerca
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchDestinations(name);
    }, 300);
  };

  // Seleziona suggerimento
  const handleSelectSuggestion = (waypointId: number, suggestion: GeocodingResult) => {
    setWaypoints(waypoints.map(w =>
      w.id === waypointId ? {
        ...w,
        name: suggestion.name,
        location: {
          name: suggestion.name,
          address: suggestion.address,
          coordinates: suggestion.coordinates
        }
      } : w
    ));
    setSuggestions([]);
    setActiveAutocomplete(null);
  };

  // Gestione keyboard nel campo input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, waypointId: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectSuggestion(waypointId, suggestions[highlightedIndex]);
      } else {
        // Chiudi dropdown, mantieni testo
        setSuggestions([]);
        setActiveAutocomplete(null);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveAutocomplete(null);
    }
  };

  const updateWaypointLocation = (id: number, location: LocationData | null) => {
    setWaypoints(waypoints.map(w =>
      w.id === id ? { ...w, location } : w
    ));
  };

  const moveWaypoint = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= waypoints.length) return;

    const newWaypoints = [...waypoints];
    [newWaypoints[index], newWaypoints[newIndex]] = [newWaypoints[newIndex], newWaypoints[index]];
    setWaypoints(newWaypoints);
  };

  const openLocationModal = (waypointId: number) => {
    setSuggestions([]);
    setActiveAutocomplete(null);
    setLocationModal({ isOpen: true, waypointId });
  };

  const handleLocationConfirm = (location: LocationData, useAsTitle: boolean) => {
    if (locationModal.waypointId !== null) {
      updateWaypointLocation(locationModal.waypointId, location);

      // Se useAsTitle e il nome è vuoto, usa il nome della location
      if (useAsTitle) {
        const waypoint = waypoints.find(w => w.id === locationModal.waypointId);
        if (waypoint && !waypoint.name.trim()) {
          setWaypoints(waypoints.map(w =>
            w.id === locationModal.waypointId ? { ...w, name: location.name } : w
          ));
        }
      }
    }
    setLocationModal({ isOpen: false, waypointId: null });
  };

  const handleLocationRemove = () => {
    if (locationModal.waypointId !== null) {
      updateWaypointLocation(locationModal.waypointId, null);
    }
    setLocationModal({ isOpen: false, waypointId: null });
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-end justify-center z-40 transition-colors duration-300 ${
        isAnimating ? 'bg-black bg-opacity-50' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-3xl shadow-xl max-h-[85vh] flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full sm:translate-y-8 sm:opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-cyan-600" />
            <h3 className="text-lg font-bold text-gray-800">Tappe</h3>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 text-gray-400 hover:text-cyan-500 transition-colors"
            >
              <HelpCircle size={16} />
            </button>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Help box */}
        {showHelp && (
          <div className="mx-5 mt-3 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
            <p className="text-xs text-gray-600 leading-relaxed">
              💡 In questa sezione puoi raggruppare più tappe per una singola categoria. Digita per cercare luoghi con geolocalizzazione automatica, oppure clicca 📍 per cercare manualmente.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {waypoints.map((waypoint, index) => (
              <div
                key={waypoint.id}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl relative"
              >
                {/* Frecce riordino a sinistra (solo in editing e se più di 1 waypoint) */}
                {isEditing && waypoints.length > 1 && (
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveWaypoint(index, 'up')}
                      disabled={index === 0}
                      className={`p-0.5 rounded transition-colors ${
                        index === 0
                          ? 'text-gray-200 cursor-not-allowed'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveWaypoint(index, 'down')}
                      disabled={index === waypoints.length - 1}
                      className={`p-0.5 rounded transition-colors ${
                        index === waypoints.length - 1
                          ? 'text-gray-200 cursor-not-allowed'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                )}

                {/* Numero tappa */}
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>

                {/* Input nome con autocomplete */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={waypoint.name}
                    onChange={(e) => updateWaypointName(waypoint.id, e.target.value)}
                    onFocus={() => {
                      if (isEditing) {
                        setActiveAutocomplete(waypoint.id);
                        if (waypoint.name.length >= 2) {
                          searchDestinations(waypoint.name);
                        }
                      }
                    }}
                    onKeyDown={(e) => handleInputKeyDown(e, waypoint.id)}
                    placeholder="Cerca luogo..."
                    className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-cyan-400 focus:outline-none ${
                      !isEditing ? 'cursor-default bg-gray-50' : ''
                    }`}
                    readOnly={!isEditing}
                  />

                  {/* Loading spinner */}
                  {isSearching && activeAutocomplete === waypoint.id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                    </div>
                  )}

                  {/* Dropdown suggerimenti */}
                  {activeAutocomplete === waypoint.id && suggestions.length > 0 && isEditing && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                    >
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(waypoint.id, suggestion)}
                          className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${
                            idx === highlightedIndex ? 'bg-cyan-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-sm flex-shrink-0">{suggestion.type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs text-gray-900 truncate">
                              {suggestion.name}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              {suggestion.address}
                            </p>
                          </div>
                          <MapPin size={12} className="text-green-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* MapPin button - SEMPRE ATTIVO */}
                <button
                  onClick={() => openLocationModal(waypoint.id)}
                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                    waypoint.location?.coordinates
                      ? 'bg-red-100 text-red-500 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={waypoint.location?.coordinates ? 'Modifica posizione' : 'Aggiungi posizione'}
                >
                  <MapPin size={18} />
                </button>

                {/* Pulsante elimina (solo in editing) */}
                {isEditing && (
                  <button
                    onClick={() => removeWaypoint(waypoint.id)}
                    className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Elimina tappa"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {/* Aggiungi tappa */}
            {isEditing && waypoints.length < MAX_WAYPOINTS && (
              <button
                onClick={addWaypoint}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-cyan-300 hover:text-cyan-600 transition-colors"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">Aggiungi tappa</span>
              </button>
            )}

            {/* Info max tappe */}
            {isEditing && waypoints.length >= MAX_WAYPOINTS && (
              <p className="text-xs text-amber-600 text-center">
                ⚠️ Massimo {MAX_WAYPOINTS} tappe
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors"
              >
                Salva
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Chiudi
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors"
              >
                Modifica
              </button>
            </>
          )}
        </div>
      </div>

      {/* LocationModal interno */}
      <LocationModal
        isOpen={locationModal.isOpen}
        isDesktop={isDesktop}
        categoryTitle={waypoints.find(w => w.id === locationModal.waypointId)?.name || ''}
        baseLocation={baseLocation || null}
        existingLocation={waypoints.find(w => w.id === locationModal.waypointId)?.location || null}
        onClose={() => setLocationModal({ isOpen: false, waypointId: null })}
        onConfirm={handleLocationConfirm}
        onRemove={handleLocationRemove}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WaypointsModal;
