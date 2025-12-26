import React from 'react';
import { MapPin } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { Activity } from '../sections/ActivitiesSection';
import { getActivityTypeConfig } from '../../../utils/activityTypes';
import LocationAutocomplete from './LocationAutocomplete';
import TimeInput from './TimeInput';
import { LocationTarget } from '../hooks/useActivityLocation';

// ============================================
// ALTROVE - TransportFields
// Campi partenza/arrivo per attività di trasporto
// ============================================

interface TransportFieldsProps {
  activity: Activity;
  departureInputText: string;
  arrivalInputText: string;
  onUpdate: (updates: Partial<Activity>) => void;
  onLocationTextChange: (target: LocationTarget, text: string) => void;
  onLocationSelect: (target: LocationTarget, location: { name: string; address?: string; coordinates?: { lat: number; lng: number } }) => void;
  onOpenLocationModal: (target: LocationTarget) => void;
}

const TransportFields: React.FC<TransportFieldsProps> = ({
  activity,
  departureInputText,
  arrivalInputText,
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
      {/* PARTENZA */}
      <div className="space-y-2">
        <label
          className="text-xs font-medium mb-1.5 flex items-center gap-1.5"
          style={{ color: colors.textMuted }}
        >
          <TypeIcon size={12} style={{ color: typeConfig.color }} />
          <span>Partenza</span>
        </label>
        <div className="flex items-center gap-2">
          {/* Autocomplete luogo partenza */}
          <LocationAutocomplete
            value={departureInputText}
            onChange={(text) => onLocationTextChange('departure', text)}
            onSelect={(loc) => onLocationSelect('departure', loc)}
            placeholder="Luogo di partenza..."
            className="flex-1"
          />
          {/* MapPin per geotag */}
          <button
            onClick={() => onOpenLocationModal('departure')}
            className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${
              activity.departure?.location?.coordinates
                ? 'border-red-400 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={activity.departure?.location?.coordinates
              ? `Posizione salvata`
              : 'Aggiungi coordinate'
            }
          >
            <MapPin
              size={18}
              color={activity.departure?.location?.coordinates ? '#EF4444' : colors.textMuted}
            />
          </button>
          {/* Orario partenza */}
          <TimeInput
            value={activity.startTime}
            onChange={(value) => onUpdate({ startTime: value })}
          />
        </div>
      </div>

      {/* ARRIVO */}
      <div className="space-y-2">
        <label
          className="text-xs font-medium mb-1.5 flex items-center gap-1.5"
          style={{ color: colors.textMuted }}
        >
          <TypeIcon size={12} style={{ color: typeConfig.color }} />
          <span>Arrivo</span>
        </label>
        <div className="flex items-center gap-2">
          {/* Autocomplete luogo arrivo */}
          <LocationAutocomplete
            value={arrivalInputText}
            onChange={(text) => onLocationTextChange('arrival', text)}
            onSelect={(loc) => onLocationSelect('arrival', loc)}
            placeholder="Luogo di arrivo..."
            className="flex-1"
          />
          {/* MapPin per geotag */}
          <button
            onClick={() => onOpenLocationModal('arrival')}
            className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${
              activity.arrival?.location?.coordinates
                ? 'border-red-400 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={activity.arrival?.location?.coordinates
              ? `Posizione salvata`
              : 'Aggiungi coordinate'
            }
          >
            <MapPin
              size={18}
              color={activity.arrival?.location?.coordinates ? '#EF4444' : colors.textMuted}
            />
          </button>
          {/* Orario arrivo */}
          <TimeInput
            value={activity.endTime}
            onChange={(value) => onUpdate({ endTime: value })}
          />
        </div>
      </div>
    </>
  );
};

export default TransportFields;