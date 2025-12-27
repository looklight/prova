/**
 * useTripMetadataForm
 * Custom hook per gestione stato e logica del form TripMetadataModal
 */

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { resizeAndUploadImage, deleteImageFromStorage } from '../../../services/mediaService';
import { IMAGE_COMPRESSION } from '../../../config/imageConfig';
import { useAnalytics } from '../../../hooks/useAnalytics';
import type {
  TripMetadataModalProps,
  TripMetadata,
  Destination,
  PreferredCurrency,
  MemberWithId,
  PackingList
} from './types';

interface UseTripMetadataFormOptions {
  isOpen: boolean;
  initialData: TripMetadataModalProps['initialData'];
  currentUser: TripMetadataModalProps['currentUser'];
  mode: 'create' | 'edit';
  onSave: (metadata: TripMetadata) => void;
  onClose: () => void;
}

export const useTripMetadataForm = ({
  isOpen,
  initialData,
  currentUser,
  mode,
  onSave,
  onClose
}: UseTripMetadataFormOptions) => {
  // ============= FORM STATE =============
  const [tripName, setTripName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [preferredCurrencies, setPreferredCurrencies] = useState<Record<string, PreferredCurrency>>({});
  const [packingList, setPackingList] = useState<PackingList>({ items: [] });

  // ============= UI STATE =============
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);

  const analytics = useAnalytics();

  // ============= RESET STATE ON OPEN =============
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTripName(initialData.name || '');
        setImage(initialData.image || null);
        setImagePath(initialData.imagePath || null);
        setDestinations(initialData.destinations || []);
        // In edit mode, inizializza con le date esistenti
        if (mode === 'edit' && initialData.startDate && initialData.endDate) {
          setDateRange({
            from: new Date(initialData.startDate),
            to: new Date(initialData.endDate)
          });
        } else {
          setDateRange(undefined);
        }
        setPreferredCurrencies(initialData.currency?.preferred || {});
        setPackingList(initialData.packingList || { items: [] });
      } else {
        setTripName('');
        setImage(null);
        setImagePath(null);
        setDestinations([]);
        setDateRange(undefined);
        setPreferredCurrencies({});
        setPackingList({ items: [] });
      }
      setShowDatePicker(false);
      setShowInviteModal(false);
      setSelectedUserProfile(null);
    }
  }, [isOpen, initialData, mode]);

  // ============= COMPUTED =============
  const activeMembers = useMemo<MemberWithId[]>(() => {
    if (!initialData?.sharing?.members) {
      // In create mode, only current user
      return [{
        userId: currentUser.uid,
        role: 'owner',
        status: 'active',
        displayName: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.photoURL
      }];
    }

    return Object.entries(initialData.sharing.members)
      .filter(([_, member]) => member.status === 'active')
      .map(([userId, member]) => ({
        userId,
        ...member
      }))
      .sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        return 0;
      });
  }, [initialData?.sharing?.members, currentUser]);

  const isOwner = useMemo(() => {
    if (mode === 'create') return true;
    return initialData?.sharing?.members?.[currentUser.uid]?.role === 'owner';
  }, [mode, initialData?.sharing?.members, currentUser.uid]);

  const isValid = useMemo(() => {
    // In create mode, at least dates should be selected (or we allow empty)
    return true; // Name defaults to "Nuovo Viaggio" if empty
  }, []);

  const daysDiff = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const diffTime = dateRange.to.getTime() - dateRange.from.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [dateRange]);

  // Durata originale del viaggio (per edit mode)
  const originalDuration = useMemo(() => {
    if (mode !== 'edit' || !initialData?.startDate || !initialData?.endDate) return null;
    const start = new Date(initialData.startDate);
    const end = new Date(initialData.endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [mode, initialData?.startDate, initialData?.endDate]);

  // Handler per cambio date che mantiene la durata in edit mode
  const handleDateRangeChange = (newRange: DateRange | undefined) => {
    if (mode === 'edit' && originalDuration !== null && newRange?.from) {
      // In edit mode, se cambia la data di inizio, mantieni la durata
      const newEndDate = new Date(newRange.from);
      newEndDate.setDate(newEndDate.getDate() + originalDuration);
      setDateRange({
        from: newRange.from,
        to: newEndDate
      });
    } else {
      // In create mode o se non c'è durata originale, comportamento normale
      setDateRange(newRange);
    }
  };

  // ============= HANDLERS =============
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido');
      return;
    }

    setIsUploading(true);
    try {
      const tripIdForPath = initialData?.tripId || Date.now();

      // Delete old image if exists
      if (imagePath) {
        try {
          await deleteImageFromStorage(imagePath);
        } catch (error) {
          console.warn('Errore eliminazione vecchia cover:', error);
        }
      }

      const path = `trips/${tripIdForPath}/cover`;
      const { url: imageURL, path: newImagePath } = await resizeAndUploadImage(
        file,
        path,
        IMAGE_COMPRESSION.tripCover.maxWidth,
        IMAGE_COMPRESSION.tripCover.maxHeight,
        IMAGE_COMPRESSION.tripCover.quality
      );

      setImage(imageURL);
      setImagePath(newImagePath);
    } catch (error) {
      console.error('Errore caricamento immagine:', error);
      alert("Errore nel caricamento dell'immagine");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageRemove = async () => {
    if (imagePath) {
      try {
        await deleteImageFromStorage(imagePath);
      } catch (error) {
        console.warn('Errore eliminazione cover:', error);
      }
    }
    setImage(null);
    setImagePath(null);
  };

  const addDestination = (destination: Destination) => {
    if (destinations.length < 30) {
      setDestinations([...destinations, destination]);

      if (mode === 'edit' && initialData?.tripId) {
        analytics.trackDestinationAdded(destination.name, initialData.tripId, 'edit');
      }
    }
  };

  const removeDestination = (index: number) => {
    const removedDest = destinations[index];

    if (mode === 'edit' && initialData?.tripId && removedDest) {
      analytics.trackDestinationRemoved(removedDest.name, initialData.tripId);
    }

    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const finalName = tripName.trim() || 'Nuovo Viaggio';

    const metadata: TripMetadata = {
      name: finalName,
      image,
      imagePath,
      destinations,
      ...(dateRange?.from && { startDate: dateRange.from }),
      ...(dateRange?.to && { endDate: dateRange.to }),
      ...(Object.keys(preferredCurrencies).length > 0 && {
        currency: { preferred: preferredCurrencies }
      }),
      ...(packingList.items.length > 0 && { packingList })
    };

    onSave(metadata);

    if (mode === 'edit' && initialData?.tripId) {
      analytics.trackTripMetadataUpdated(initialData.tripId, {
        name: tripName !== initialData.name,
        image: image !== initialData.image,
        destinations: JSON.stringify(destinations) !== JSON.stringify(initialData.destinations)
      });
    }

    onClose();
  };

  // ============= TRIP FOR INVITE MODAL =============
  const tripForInvite = useMemo(() => {
    if (!initialData?.tripId) return null;

    return {
      id: initialData.tripId,
      name: tripName || initialData.name || 'Viaggio',
      sharing: initialData.sharing || {
        memberIds: [currentUser.uid],
        members: {
          [currentUser.uid]: {
            role: 'owner' as const,
            status: 'active' as const,
            displayName: currentUser.displayName,
            username: currentUser.username,
            avatar: currentUser.photoURL
          }
        }
      }
    };
  }, [initialData, tripName, currentUser]);

  return {
    // Form state
    tripName,
    setTripName,
    image,
    imagePath,
    isUploading,
    handleImageUpload,
    handleImageRemove,
    destinations,
    addDestination,
    removeDestination,
    dateRange,
    setDateRange: handleDateRangeChange,
    preferredCurrencies,
    setPreferredCurrencies,
    packingList,
    setPackingList,

    // UI state
    showDatePicker,
    setShowDatePicker,
    showInviteModal,
    setShowInviteModal,
    selectedUserProfile,
    setSelectedUserProfile,

    // Actions
    handleSave,

    // Computed
    isValid,
    activeMembers,
    isOwner,
    daysDiff,
    tripForInvite
  };
};
