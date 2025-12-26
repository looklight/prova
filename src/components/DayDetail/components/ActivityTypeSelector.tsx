import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { Activity } from '../sections/ActivitiesSection';
import { ACTIVITY_TYPES_FOR_SELECTOR, ActivityType, isTransportType, getActivityTypeConfig } from '../../../utils/activityTypes';

// ============================================
// ALTROVE - ActivityTypeSelector
// Chips collassabili per selezione tipo attività
// - Prima selezione: tutte visibili
// - Dopo selezione: solo chip selezionata (cliccabile per espandere)
// ============================================

interface ActivityTypeSelectorProps {
  activity: Activity;
  onUpdate: (updates: Partial<Activity>) => void;
  onDepartureTextChange: (text: string) => void;
  onArrivalTextChange: (text: string) => void;
  onLocationTextChange: (text: string) => void;
}

const ActivityTypeSelector: React.FC<ActivityTypeSelectorProps> = ({
  activity,
  onUpdate,
  onDepartureTextChange,
  onArrivalTextChange,
  onLocationTextChange
}) => {
  // Stato per espansione: 
  // - true = mostra tutte le chips
  // - false = mostra solo quella selezionata (se diversa da generic)
  const [isExpanded, setIsExpanded] = useState(activity.type === 'generic');

  const handleTypeChange = (newType: ActivityType) => {
    const wasTransport = isTransportType(activity.type);
    const willBeTransport = isTransportType(newType);

    // Migrazione solo delle location tra layout
    if (wasTransport && !willBeTransport) {
      const migratedLocation = activity.departure?.location || activity.arrival?.location;
      const updates: Partial<Activity> = { type: newType };
      if (migratedLocation) updates.location = migratedLocation;

      onLocationTextChange(migratedLocation?.name || '');
      onUpdate(updates);
    } else if (!wasTransport && willBeTransport) {
      const updates: Partial<Activity> = { type: newType };
      if (activity.location) {
        updates.departure = { location: activity.location };
      }

      onDepartureTextChange(activity.location?.name || '');
      onArrivalTextChange('');
      onUpdate(updates);
    } else {
      onUpdate({ type: newType });
    }

    // Collassa dopo la selezione (se non è generic)
    if (newType !== 'generic') {
      setIsExpanded(false);
    }
  };

  // Trova la configurazione del tipo selezionato
  const selectedType = getActivityTypeConfig(activity.type);

  // Se collassato e ha un tipo selezionato (non generic), mostra solo quello
  if (!isExpanded && activity.type !== 'generic' && selectedType) {
    const SelectorIcon = selectedType.selectorIcon || selectedType.icon;
    
    return (
      <div>
        <label
          className="text-xs font-medium mb-1.5 block"
          style={{ color: colors.textMuted }}
        >
          Tipo
        </label>
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-80 border"
          style={{
            backgroundColor: `${selectedType.color}20`,
            color: selectedType.color,
            borderColor: selectedType.color
          }}
        >
          {SelectorIcon && <SelectorIcon size={14} />}
          <span className="font-medium">{selectedType.label}</span>
          <ChevronDown size={12} className="ml-1 opacity-60" />
        </button>
      </div>
    );
  }

  // Espanso: mostra tutte le chips
  return (
    <div>
      <label
        className="text-xs font-medium mb-1.5 block"
        style={{ color: colors.textMuted }}
      >
        Tipo
      </label>
      <div className="flex flex-wrap gap-1.5">
        {ACTIVITY_TYPES_FOR_SELECTOR.map((type) => {
          const SelectorIcon = type.selectorIcon || type.icon;
          const isSelected = activity.type === type.value;
          return (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                isSelected ? 'ring-1 ring-offset-1' : 'hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: isSelected ? `${type.color}20` : colors.bgSubtle,
                color: isSelected ? type.color : colors.textMuted,
                ringColor: isSelected ? type.color : undefined
              }}
            >
              {SelectorIcon && <SelectorIcon size={12} />}
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTypeSelector;