import React from 'react';
import { MapPin, X } from 'lucide-react';
import { DestinationAutocomplete } from '../../../ui';
import { colors } from '../../../../styles/theme';
import type { DestinationsSectionProps } from '../types';

const DestinationsSection: React.FC<DestinationsSectionProps> = ({
  destinations,
  onAdd,
  onRemove,
  maxDestinations = 20
}) => {
  const isMaxReached = destinations.length >= maxDestinations;

  return (
    <div className="space-y-3">
      <label
        className="block text-sm font-semibold"
        style={{ color: colors.textMuted }}
      >
        Destinazioni
      </label>

      {/* Chips */}
      {destinations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {destinations.map((dest, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
              style={{
                backgroundColor: colors.accentSoft,
                color: colors.accent
              }}
            >
              {dest.coordinates && (
                <MapPin size={14} />
              )}
              <span className="font-medium">{dest.name}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="hover:opacity-70 rounded-full p-0.5 transition-opacity ml-0.5"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Autocomplete */}
      <DestinationAutocomplete
        onSelect={onAdd}
        placeholder="Aggiungi destinazione..."
        disabled={isMaxReached}
      />

      {isMaxReached && (
        <p className="text-xs" style={{ color: colors.warning }}>
          Massimo {maxDestinations} destinazioni
        </p>
      )}
    </div>
  );
};

export default DestinationsSection;
