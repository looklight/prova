import React from 'react';
import { MapPin } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { Activity } from '../sections/ActivitiesSection';
import { getActivityTypeConfig } from '../../../utils/activityTypes';
import LocationAutocomplete from './LocationAutocomplete';
import TimeInput from './TimeInput';
import { LocationTarget } from '../hooks/useActivityLocation';

// ============================================
// ALTROVE - LocationFields
// Campi location e orari per attività normali
// ============================================

interface LocationFieldsProps {
  activity: Activity;
  locationInputText: string;
  onUpdate: (updates: Partial<Activity>) => void;
  onLocationTextChange: (target: LocationTarget, text: string) => void;
  onLocationSelect: (target: LocationTarget, location: { name: string; address?: string; coordinates?: { lat: number; lng: number } }) => void;
  onOpenLocationModal: (target: LocationTarget) => void;
}

const LocationFields: React.FC<LocationFieldsProps> = ({
  activity,
  locationInputText,
  onUpdate,
  onLocationTextChange,
  onLocationSelect,
  onOpenLocationModal
}) => {
  // Ottieni config del tipo per icona e colore
  const typeConfig = getActivityTypeConfig(activity.type);
  const TypeIcon = typeConfig.selectorIcon;

  return (
    <>
      {/* Location con autocomplete + MapPin */}
      <div className="space-y-2">
        <label
          className="text-xs font-medium mb-1.5 flex items-center gap-1.5"
          style={{ color: colors.textMuted }}
        >
          <TypeIcon size={12} style={{ color: typeConfig.color }} />
          <span>Luogo</span>
        </label>
        <div className="flex items-center gap-2">
          {/* Autocomplete luogo */}
          <LocationAutocomplete
            value={locationInputText}
            onChange={(text) => onLocationTextChange('main', text)}
            onSelect={(loc) => onLocationSelect('main', loc)}
            placeholder="Cerca luogo..."
            className="flex-1"
          />
          {/* MapPin per geotag */}
          <button
            onClick={() => onOpenLocationModal('main')}
            className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${
              activity.location?.coordinates
                ? 'border-red-400 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={activity.location?.coordinates
              ? `📍 ${activity.location.name || activity.location.address}`
              : 'Aggiungi posizione'
            }
          >
            <MapPin
              size={18}
              color={activity.location?.coordinates ? '#EF4444' : colors.textMuted}
            />
          </button>
        </div>
        {/* Location preview */}
        {activity.location?.coordinates && (
          <p
            className="text-xs truncate flex items-center gap-1"
            style={{ color: colors.textMuted }}
          >
            <MapPin size={12} className="text-red-500 flex-shrink-0" />
            {activity.location.name || activity.location.address}
          </p>
        )}
      </div>

      {/* Orari */}
      <div className="flex items-end gap-3 flex-wrap">
        <TimeInput
          value={activity.startTime}
          onChange={(value) => onUpdate({ startTime: value })}
          label="Inizio"
        />
        <TimeInput
          value={activity.endTime}
          onChange={(value) => onUpdate({ endTime: value })}
          label="Fine"
        />
      </div>
    </>
  );
};

export default LocationFields;