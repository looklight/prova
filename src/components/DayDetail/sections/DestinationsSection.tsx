import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { OfflineDisabled, DestinationAutocomplete, type Destination } from '../../ui';
import { useSuggestions } from '../../../hooks/useSuggestions';
import AnimatedCollapse from '../components/AnimatedCollapse';

// ============================================
// ALTROVE - DestinationsSection
// Chips numerate per destinazioni del giorno
// Con suggerimenti intelligenti
// ============================================

interface DestinationsSectionProps {
  destinations: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateDestinations: (destinations: string[]) => void;
  onUpdateTripMetadata?: (metadata: any) => void;
  trip?: any;
  dayIndex?: number;
  categoryData?: Record<string, any>;
}

const DestinationsSection: React.FC<DestinationsSectionProps> = ({
  destinations,
  isExpanded,
  onToggle,
  onUpdateDestinations,
  onUpdateTripMetadata,
  trip,
  dayIndex = 0,
  categoryData = {}
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const editModeRef = useRef<HTMLDivElement>(null);

  // Click outside per chiudere edit mode
  useEffect(() => {
    if (!isAdding) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (editModeRef.current && !editModeRef.current.contains(event.target as Node)) {
        setIsAdding(false);
      }
    };

    // Delay per evitare che il click che apre chiuda subito
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isAdding]);

  // Lista nomi con geotag dal metadata
  const geotaggedNames = (trip?.metadata?.destinations || [])
    .filter((d: any) => d.coordinates || d.lat || d.lng)
    .map((d: any) => typeof d === 'string' ? d : d.name?.toLowerCase());

  // Verifica se una destinazione ha geotag
  const hasGeotag = (name: string) => {
    if (!name || !geotaggedNames.length) return false;
    return geotaggedNames.includes(name.toLowerCase());
  };

  // Suggerimenti
  const { getDestinationSuggestions } = useSuggestions(trip, dayIndex, categoryData);
  const suggestions = trip ? getDestinationSuggestions() : null;

  // Filtra suggerimenti già presenti nelle destinazioni
  const filteredSuggestions = suggestions?.filter(
    (s: any) => !destinations.includes(s.value)
  ) || [];

  // Aggiungi destinazione (max 2) - con possibile geotag
  const handleAddDestination = (destination: Destination) => {
    if (destinations.length >= 2) return;

    // Aggiungi nome alle destinazioni del giorno
    onUpdateDestinations([...destinations, destination.name]);

    // Se ha coordinate, aggiorna anche trip.metadata.destinations
    if (destination.coordinates && onUpdateTripMetadata) {
      const existingMetaDests = trip?.metadata?.destinations || [];
      // Verifica se esiste già (stesso nome)
      const alreadyExists = existingMetaDests.some(
        (d: any) => (typeof d === 'string' ? d : d.name)?.toLowerCase() === destination.name.toLowerCase()
      );

      if (!alreadyExists) {
        onUpdateTripMetadata({
          ...trip?.metadata,
          destinations: [
            ...existingMetaDests,
            { name: destination.name, coordinates: destination.coordinates }
          ]
        });
      }
    }

    // Chiudi sempre l'input dopo l'aggiunta
    setIsAdding(false);
  };

  // Seleziona un suggerimento (max 2)
  const handleSelectSuggestion = (value: string) => {
    if (destinations.length < 2) {
      onUpdateDestinations([...destinations, value]);
      // Chiudi sempre l'input dopo l'aggiunta
      setIsAdding(false);
    }
  };

  // Rimuovi destinazione
  const handleRemove = (index: number) => {
    onUpdateDestinations(destinations.filter((_, i) => i !== index));
  };

  return (
    <div
      className="rounded-2xl"
      style={{ backgroundColor: colors.accentSoft }}
    >
      {/* Header - cliccabile per espandere/comprimere */}
      <div
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 cursor-pointer"
        style={{ height: '64px' }}
      >
        <div className="flex items-center gap-2">
          <MapPin size={20} color={colors.accent} />
          <span
            className="text-base font-semibold"
            style={{ color: colors.text }}
          >
            Destinazioni
          </span>
        </div>

        {/* Preview destinazioni (quando chiuso) + Freccia */}
        <div className="flex items-center gap-2">
          {!isExpanded && destinations.length > 0 && (
            <span
              className="text-xs text-right"
              style={{ color: colors.textMuted, maxWidth: '140px' }}
            >
              {destinations.join(' → ')}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textMuted} />
          ) : (
            <ChevronDown size={20} color={colors.textMuted} />
          )}
        </div>
      </div>

      {/* Contenuto (se espanso) */}
      <AnimatedCollapse isOpen={isExpanded}>
        <div className="px-4 pb-4 space-y-3">
          {/* Placeholder se vuoto - sopra al pulsante */}
          {destinations.length === 0 && !isAdding && (
            <p
              className="text-sm italic text-left"
              style={{ color: colors.textPlaceholder }}
            >
              Dove ti porta questo giorno?
            </p>
          )}

          {/* Lista destinazioni + pulsante aggiungi inline */}
          <div className="flex flex-wrap items-center gap-2">
            {destinations.map((dest, index) => {
              const isGeotagged = hasGeotag(dest);
              return (
                <React.Fragment key={index}>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: colors.bgCard }}
                  >
                    {/* Nome destinazione con indicatore geotag */}
                    <span
                      className="text-sm font-medium flex items-center gap-1"
                      style={{ color: colors.text }}
                    >
                      {isGeotagged && <MapPin size={12} color={colors.accent} />}
                      {dest}
                    </span>

                    {/* Rimuovi */}
                    <button
                      onClick={() => handleRemove(index)}
                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X size={12} color={colors.textMuted} />
                    </button>
                  </div>

                  {/* Freccia dopo la prima destinazione (se ce ne sono 2) */}
                  {index === 0 && destinations.length === 2 && (
                    <span
                      className="text-sm font-medium"
                      style={{ color: colors.textMuted }}
                    >
                      →
                    </span>
                  )}
                </React.Fragment>
              );
            })}

            {/* Bottone aggiungi inline - max 2 destinazioni */}
            {!isAdding && destinations.length < 2 && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                style={{
                  backgroundColor: colors.bgCard,
                  color: colors.textMuted
                }}
              >
                <Plus size={14} />
                <span className="text-sm">Aggiungi destinazione</span>
              </button>
            )}
          </div>

          {/* Input nuova destinazione */}
          {isAdding && (
            <div ref={editModeRef} className="space-y-3">
              {/* Suggerimenti rapidi */}
              {filteredSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="text-[11px]"
                    style={{ color: colors.textMuted }}
                  >
                    Suggerimenti:
                  </span>
                  {filteredSuggestions.map((suggestion: any, idx: number) => {
                    const isGeotagged = hasGeotag(suggestion.value);
                    const isPrevious = suggestion.type === 'previous';
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(suggestion.value)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all hover:scale-105"
                        style={{
                          backgroundColor: isPrevious ? colors.warningSoft : colors.bgCard,
                          color: colors.text,
                          border: `1px solid ${isPrevious ? colors.warning : colors.border}`
                        }}
                      >
                        {isGeotagged && <MapPin size={10} color={isPrevious ? colors.warning : colors.accent} />}
                        <span>{suggestion.value}</span>
                        {isPrevious && suggestion.label && (
                          <span
                            className="text-[9px] opacity-70"
                            style={{ color: colors.warning }}
                          >
                            ({suggestion.label})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Autocomplete con geolocalizzazione */}
              <OfflineDisabled>
                <DestinationAutocomplete
                  onSelect={handleAddDestination}
                  placeholder="Cerca città o luogo..."
                  disabled={destinations.length >= 2}
                />
              </OfflineDisabled>

              {/* Hint */}
              <p className="text-xs" style={{ color: colors.textMuted }}>
                <MapPin size={10} className="inline mr-1" style={{ color: colors.accent }} />
                Seleziona dalla lista per salvare la posizione
              </p>
            </div>
          )}
        </div>
      </AnimatedCollapse>
    </div>
  );
};

export default DestinationsSection;