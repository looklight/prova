import { useState, useCallback } from 'react';
import { Activity, ActivityLocation } from '../sections/ActivitiesSection';

// ============================================
// ALTROVE - useActivityLocation Hook
// Gestisce lo state e gli handlers per location
// ============================================

export type LocationTarget = 'main' | 'departure' | 'arrival';

interface UseActivityLocationProps {
  activity: Activity;
  onUpdate: (updates: Partial<Activity>) => void;
}

interface UseActivityLocationReturn {
  // State
  locationInputText: string;
  departureInputText: string;
  arrivalInputText: string;
  locationModalTarget: LocationTarget | null;

  // Setters
  setLocationInputText: (text: string) => void;
  setDepartureInputText: (text: string) => void;
  setArrivalInputText: (text: string) => void;

  // Modal handlers
  openLocationModal: (target: LocationTarget) => void;
  closeLocationModal: () => void;

  // Location handlers
  handleLocationConfirm: (location: any, useAsTitle: boolean) => void;
  handleLocationRemove: () => void;
  handleLocationSelect: (target: LocationTarget, location: { name: string; address?: string; coordinates?: { lat: number; lng: number } }) => void;
  handleLocationTextChange: (target: LocationTarget, text: string) => void;
}

export const useActivityLocation = ({
  activity,
  onUpdate
}: UseActivityLocationProps): UseActivityLocationReturn => {
  // State per input location text (per autocomplete)
  const [locationInputText, setLocationInputText] = useState(activity.location?.name || '');
  const [departureInputText, setDepartureInputText] = useState(activity.departure?.location?.name || '');
  const [arrivalInputText, setArrivalInputText] = useState(activity.arrival?.location?.name || '');

  // State per modal target
  const [locationModalTarget, setLocationModalTarget] = useState<LocationTarget | null>(null);

  const openLocationModal = useCallback((target: LocationTarget) => {
    setLocationModalTarget(target);
  }, []);

  const closeLocationModal = useCallback(() => {
    setLocationModalTarget(null);
  }, []);

  const handleLocationConfirm = useCallback((location: any, useAsTitle: boolean) => {
    const locationData: ActivityLocation = {
      name: location.name,
      address: location.address,
      coordinates: location.coordinates
    };

    if (locationModalTarget === 'main') {
      onUpdate({
        location: locationData,
        ...(useAsTitle && !activity.title ? { title: location.name } : {})
      });
      setLocationInputText(location.name);
    } else if (locationModalTarget === 'departure') {
      onUpdate({
        departure: {
          ...activity.departure,
          location: locationData
        }
      });
      setDepartureInputText(location.name);
    } else if (locationModalTarget === 'arrival') {
      onUpdate({
        arrival: {
          ...activity.arrival,
          location: locationData
        }
      });
      setArrivalInputText(location.name);
    }

    closeLocationModal();
  }, [locationModalTarget, activity, onUpdate, closeLocationModal]);

  const handleLocationRemove = useCallback(() => {
    if (locationModalTarget === 'main') {
      onUpdate({ location: undefined });
      setLocationInputText('');
    } else if (locationModalTarget === 'departure') {
      onUpdate({
        departure: {
          ...activity.departure,
          location: undefined
        }
      });
      setDepartureInputText('');
    } else if (locationModalTarget === 'arrival') {
      onUpdate({
        arrival: {
          ...activity.arrival,
          location: undefined
        }
      });
      setArrivalInputText('');
    }
    closeLocationModal();
  }, [locationModalTarget, activity, onUpdate, closeLocationModal]);

  const handleLocationSelect = useCallback((
    target: LocationTarget,
    location: { name: string; address?: string; coordinates?: { lat: number; lng: number } }
  ) => {
    const locationData: ActivityLocation = {
      name: location.name,
      address: location.address,
      coordinates: location.coordinates
    };

    if (target === 'main') {
      onUpdate({ location: locationData });
      setLocationInputText(location.name);
    } else if (target === 'departure') {
      onUpdate({
        departure: {
          ...activity.departure,
          location: locationData
        }
      });
      setDepartureInputText(location.name);
    } else if (target === 'arrival') {
      onUpdate({
        arrival: {
          ...activity.arrival,
          location: locationData
        }
      });
      setArrivalInputText(location.name);
    }
  }, [activity, onUpdate]);

  const handleLocationTextChange = useCallback((target: LocationTarget, text: string) => {
    if (target === 'main') {
      setLocationInputText(text);
      // Se il testo cambia e c'erano coordinate, rimuovile
      if (activity.location?.coordinates && text !== activity.location.name) {
        onUpdate({ location: { name: text } });
      }
    } else if (target === 'departure') {
      setDepartureInputText(text);
      if (activity.departure?.location?.coordinates && text !== activity.departure?.location?.name) {
        onUpdate({
          departure: {
            ...activity.departure,
            location: { name: text }
          }
        });
      }
    } else if (target === 'arrival') {
      setArrivalInputText(text);
      if (activity.arrival?.location?.coordinates && text !== activity.arrival?.location?.name) {
        onUpdate({
          arrival: {
            ...activity.arrival,
            location: { name: text }
          }
        });
      }
    }
  }, [activity, onUpdate]);

  return {
    // State
    locationInputText,
    departureInputText,
    arrivalInputText,
    locationModalTarget,

    // Setters
    setLocationInputText,
    setDepartureInputText,
    setArrivalInputText,

    // Modal handlers
    openLocationModal,
    closeLocationModal,

    // Location handlers
    handleLocationConfirm,
    handleLocationRemove,
    handleLocationSelect,
    handleLocationTextChange
  };
};

export default useActivityLocation;
