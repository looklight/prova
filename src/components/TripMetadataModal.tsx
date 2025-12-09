import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, UserPlus, Crown, Calendar, HelpCircle, MapPin } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { it } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { resizeAndUploadImage, deleteImageFromStorage } from '../services/mediaService';
import { IMAGE_COMPRESSION } from '../config/imageConfig';
import InviteOptionsModal from './InviteOptionsModal';
import UserProfileModal from './Profile/UserProfileModal';
import Avatar from './Avatar';
import { normalizeDestination } from '../utils/textUtils';
import CurrencySelector from './CurrencySelector';
import { useAnalytics } from '../hooks/useAnalytics';
import DestinationAutocomplete, { Destination } from './DestinationAutocomplete';


interface TripMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: TripMetadata) => void;
  initialData?: TripMetadata & {
    tripId?: string;
    sharing?: {
      memberIds: string[];
      members: {
        [userId: string]: {
          role: 'owner' | 'member';
          status: 'active' | 'invited' | 'removed';
          displayName: string;
          username?: string;
          avatar?: string;
          joinedAt?: Date;
        };
      };
    };
  };
  currentUser: {
    uid: string;
    displayName: string;
    photoURL?: string;
    username?: string;
    email?: string;
  };
  mode: 'create' | 'edit';
  onInviteClick?: () => void;
}

export interface TripMetadata {
  name: string;
  image: string | null;
  imagePath?: string | null;
  destinations: Destination[];
  description: string;
  startDate?: Date;
  endDate?: Date;
  currency?: {
    preferred: Record<string, {
      code: string;
      name: string;
      symbol: string;
      flag: string;
      rate: number;
      lastUpdated: string;
    }>;
  };
}

// Componente Help Box riutilizzabile
const HelpBox: React.FC<{ text: string; isOpen: boolean; onToggle: () => void }> = ({ text, isOpen, onToggle }) => (
  <>
    <button
      type="button"
      onClick={onToggle}
      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
      title="Aiuto"
    >
      <HelpCircle size={16} />
    </button>
    {isOpen && (
      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-gray-600 leading-relaxed">
          💡 {text}
        </p>
      </div>
    )}
  </>
);

const TripMetadataModal: React.FC<TripMetadataModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentUser,
  mode,
  onInviteClick
}) => {
  const [tripName, setTripName] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const [preferredCurrencies, setPreferredCurrencies] = useState<Record<string, any>>({});

  // State per help boxes
  const [showHelp, setShowHelp] = useState<Record<string, boolean>>({});

  const analytics = useAnalytics();

  const toggleHelp = (section: string) => {
    setShowHelp(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Rileva desktop/mobile
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click fuori dal calendario lo chiude e salva
  useEffect(() => {
    if (!showCalendar) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideCalendar = calendarRef.current && !calendarRef.current.contains(target);
      const isOutsideButton = calendarButtonRef.current && !calendarButtonRef.current.contains(target);

      if (isOutsideCalendar && isOutsideButton) {
        // Se c'è solo data inizio, imposta fine = inizio
        if (dateRange?.from && !dateRange?.to) {
          setDateRange({ from: dateRange.from, to: dateRange.from });
        }
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar, dateRange]);

  // Carica dati iniziali quando il modal si apre
  useEffect(() => {
    if (isOpen && initialData) {
      setTripName(initialData.name || '');
      setDestinations(initialData.destinations || []);
      setDescription(initialData.description || '');
      setImage(initialData.image || null);
      setImagePath(initialData.imagePath || null);
      setDateRange(undefined);
      setShowCalendar(false);
      setPreferredCurrencies(initialData.currency?.preferred || {});
      setShowHelp({});
    } else if (isOpen && !initialData) {
      setTripName('');
      setDestinations([]);
      setDescription('');
      setImage(null);
      setImagePath(null);
      setDateRange(undefined);
      setShowCalendar(false);
      setPreferredCurrencies({});
      setShowHelp({});
    }
  }, [isOpen, initialData]);

  const removeDestination = (index: number) => {
    const removedDest = destinations[index];

    if (mode === 'edit' && initialData?.tripId && removedDest) {
      analytics.trackDestinationRemoved(removedDest.name, initialData.tripId);
    }

    setDestinations(destinations.filter((_, i) => i !== index));
  };

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

      if (imagePath) {
        try {
          await deleteImageFromStorage(imagePath);
          console.log('🗑️ Vecchia cover eliminata');
        } catch (error) {
          console.warn('⚠️ Errore eliminazione vecchia cover:', error);
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
      console.error('❌ Errore caricamento immagine:', error);
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    const finalName = tripName.trim() || 'Nuovo Viaggio';

    const metadata: TripMetadata = {
      name: finalName,
      image,
      imagePath,
      destinations,
      description: description.trim(),
      ...(mode === 'create' && dateRange?.from && { startDate: dateRange.from }),
      ...(mode === 'create' && dateRange?.to && { endDate: dateRange.to }),
      ...(Object.keys(preferredCurrencies).length > 0 && {
        currency: { preferred: preferredCurrencies }
      })
    };

    onSave(metadata);

    if (mode === 'edit' && initialData?.tripId) {
      analytics.trackTripMetadataUpdated(initialData.tripId, {
        name: tripName !== initialData.name,
        image: image !== initialData.image,
        destinations: JSON.stringify(destinations) !== JSON.stringify(initialData.destinations),
        description: description !== initialData.description
      });
    }

    onClose();
  };

  // Calcola numero giorni
  const getDaysDiff = () => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const diffTime = dateRange.to.getTime() - dateRange.from.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const daysDiff = getDaysDiff();
  const isValidRange = daysDiff !== null && daysDiff > 0 && daysDiff <= 90;

  // Formatta data per display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  const tripForInvite = initialData?.tripId ? {
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
  } : null;

  const activeMembers = initialData?.sharing?.members
    ? Object.entries(initialData.sharing.members)
      .filter(([_, member]) => member.status === 'active')
      .map(([userId, member]) => ({
        userId,
        ...member
      }))
    : [];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              {mode === 'create' ? '✈️ Nuovo Viaggio' : '✏️ Modifica Viaggio'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* CONTENT - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            {/* IMMAGINE COPERTINA */}
            <div className="relative">
              {image && (
                <div className="absolute top-0 right-0">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (imagePath) {
                        try {
                          await deleteImageFromStorage(imagePath);
                          console.log('🗑️ Cover eliminata');
                        } catch (error) {
                          console.warn('⚠️ Errore eliminazione cover:', error);
                        }
                      }
                      setImage(null);
                      setImagePath(null);
                    }}
                    className="text-[10px] text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Rimuovi immagine
                  </button>
                </div>
              )}

              <div className="flex flex-col items-center">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="relative">
                    {image ? (
                      <img
                        src={image}
                        alt="Viaggio"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center">
                        {isUploading ? (
                          <div className="text-xs text-gray-500">Caricamento...</div>
                        ) : (
                          <>
                            <Upload size={28} className="text-gray-400 mb-1" />
                            <p className="text-[10px] text-gray-500">Carica foto</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* NOME VIAGGIO */}
            <div>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="Inserisci nome del viaggio"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base text-center font-medium"
              />
            </div>

            {/* DESTINAZIONI */}
            <div>
              <div className="flex items-center gap-1 mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  🌍 Destinazioni
                </label>
                <button
                  type="button"
                  onClick={() => toggleHelp('destinations')}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Aiuto"
                >
                  <HelpCircle size={16} />
                </button>
              </div>

              {destinations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {destinations.map((dest, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium group hover:bg-blue-200 transition-colors"
                    >
                      {dest.coordinates && (
                        <MapPin size={12} className="text-blue-600" />
                      )}
                      <span>{dest.name}</span>
                      <button
                        type="button"
                        onClick={() => removeDestination(index)}
                        className="hover:bg-blue-300 rounded-full p-0.5 transition-colors"
                      >
                        <X size={14} className="text-blue-600" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <DestinationAutocomplete
                onSelect={(destination) => {
                  if (destinations.length < 20) {
                    setDestinations([...destinations, destination]);

                    if (mode === 'edit' && initialData?.tripId) {
                      analytics.trackDestinationAdded(destination.name, initialData.tripId, 'edit');
                    }
                  }
                }}
                placeholder="es. Tokyo"
                disabled={destinations.length >= 20}
              />

              {destinations.length >= 20 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Massimo 20 destinazioni
                </p>
              )}

              {showHelp['destinations'] && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    💡 Aggiungi le città o i luoghi che visiterai, saranno inserite dentro al viaggio e potrai ottimizzare l'itinerario.
                  </p>
                </div>
              )}
            </div>

            {/* 📅 PERIODO DEL VIAGGIO - Solo in modalità create */}
            {mode === 'create' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-semibold text-gray-700">
                      📅 Durata del viaggio
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleHelp('duration')}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Aiuto"
                    >
                      <HelpCircle size={16} />
                    </button>
                  </div>
                  {daysDiff !== null && (
                    <span className={`text-xs font-semibold ${isValidRange ? 'text-blue-500' : 'text-red-500'}`}>
                      {isValidRange ? `${daysDiff} giorni` : daysDiff > 90 ? 'Max 90 giorni' : 'Date non valide'}
                    </span>
                  )}
                </div>

                {/* Date selector button */}
                <button
                  ref={calendarButtonRef}
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`w-full px-4 py-2 border-2 rounded-lg flex items-center justify-between transition-colors text-sm ${showCalendar
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={20} className={showCalendar ? 'text-blue-500' : 'text-gray-400'} />
                    <span className={dateRange?.from ? 'text-gray-900' : 'text-gray-400'}>
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${formatDate(dateRange.from)} → ${formatDate(dateRange.to)}`
                        ) : (
                          `${formatDate(dateRange.from)} → Seleziona ritorno`
                        )
                      ) : (
                        'Seleziona le date del viaggio'
                      )}
                    </span>
                  </div>
                  <span className={`text-sm transition-transform ${showCalendar ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {/* Calendar */}
                {showCalendar && (
                  <div ref={calendarRef} className="mt-3 border-2 border-gray-200 rounded-xl p-4 bg-white shadow-lg overflow-hidden">
                    <style>{`
                      .travel-calendar {
                        --rdp-accent-color: #3b82f6;
                        --rdp-accent-background-color: #dbeafe;
                      }
                      .travel-calendar .rdp-months {
                        display: flex !important;
                        flex-direction: row !important;
                        flex-wrap: nowrap !important;
                        gap: 1rem;
                        justify-content: center;
                      }
                      .travel-calendar-desktop {
                        transform: scale(0.75);
                        transform-origin: top center;
                        margin-bottom: -80px;
                      }
                      .travel-calendar .rdp-month_caption {
                        padding-bottom: 0.5rem;
                        margin-bottom: 0.5rem;
                        border-bottom: 1px solid #e5e7eb;
                      }
                      .travel-calendar .rdp-caption_label {
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: #1f2937;
                      }
                      .travel-calendar .rdp-weekday {
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: #6b7280;
                      }
                      .travel-calendar .rdp-day_button {
                        border-radius: 50%;
                      }
                      .travel-calendar .rdp-selected .rdp-day_button {
                        background-color: #3b82f6;
                        color: white;
                        font-weight: 600;
                      }
                      .travel-calendar .rdp-range_middle .rdp-day_button {
                        background-color: #dbeafe;
                        color: #1e40af;
                        border-radius: 50%;
                      }
                      .travel-calendar .rdp-today:not(.rdp-selected) .rdp-day_button {
                        border: 2px solid #3b82f6;
                        font-weight: 600;
                      }
                      .travel-calendar .rdp-button_previous,
                      .travel-calendar .rdp-button_next {
                        color: #3b82f6;
                      }
                      .travel-calendar .rdp-disabled .rdp-day_button {
                        color: #d1d5db;
                      }
                    `}</style>
                    <div className={`flex justify-center ${isDesktop ? 'travel-calendar-desktop' : ''}`}>
                      <DayPicker
                        className="travel-calendar"
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={it}
                        numberOfMonths={isDesktop ? 2 : 1}
                        disabled={{ before: new Date() }}
                      />
                    </div>

                    {/* Quick info */}
                    <div className="pt-3 border-t border-gray-100 text-center">
                      {!dateRange?.from && (
                        <p className="text-sm text-gray-500">Seleziona la data di partenza</p>
                      )}
                      {dateRange?.from && !dateRange?.to && (
                        <p className="text-sm text-blue-600">Seleziona la data di ritorno</p>
                      )}
                      {dateRange?.from && dateRange?.to && (
                        <div className="flex justify-around">
                          <button
                            type="button"
                            onClick={() => setDateRange(undefined)}
                            className="text-sm text-red-500 hover:text-red-600"
                          >
                            ✕ Cancella date
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCalendar(false)}
                            className="text-sm text-blue-500 hover:text-blue-700"
                          >
                            ✓ Conferma
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showHelp['duration'] && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      💡 Potrai modificare le date e la durata del viaggio anche in seguito con il pulsante ✎
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PERSONE CHE ORGANIZZANO */}
            <div>
              <div className="flex items-center gap-1 mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  👥 Chi organizza questo viaggio
                </label>
                <button
                  type="button"
                  onClick={() => toggleHelp('organizers')}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Aiuto"
                >
                  <HelpCircle size={16} />
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                <div className="space-y-2">
                  {mode === 'edit' && initialData?.sharing?.members ? (
                    Object.entries(initialData.sharing.members)
                      .filter(([_, member]) => member.status === 'active')
                      .sort((a, b) => {
                        if (a[1].role === 'owner') return -1;
                        if (b[1].role === 'owner') return 1;
                        return 0;
                      })
                      .map(([userId, member]) => {
                        const isCurrentUser = userId === currentUser.uid;

                        return (
                          <div
                            key={userId}
                            onClick={() => setSelectedUserProfile(userId)}
                            className={`border-2 rounded-lg p-3 transition-all cursor-pointer ${isCurrentUser
                              ? 'border-blue-400 bg-blue-100'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={member.avatar}
                                name={member.displayName}
                                size="md"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {member.displayName}
                                  </p>
                                  {member.role === 'owner' && (
                                    <span className="flex-shrink-0 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1">
                                      <Crown size={12} />
                                      Owner
                                    </span>
                                  )}
                                </div>

                                {member.username && (
                                  <p className="text-sm text-gray-500 truncate">@{member.username}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div
                      onClick={() => setSelectedUserProfile(currentUser.uid)}
                      className="border-2 border-blue-400 bg-blue-100 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={currentUser.photoURL}
                          name={currentUser.displayName}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-gray-900 truncate">
                              {currentUser.displayName}
                            </p>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1">
                              <Crown size={12} />
                              Owner
                            </span>
                          </div>
                          {currentUser.username && (
                            <p className="text-sm text-gray-500 truncate">@{currentUser.username}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {mode === 'edit' &&
                  tripForInvite &&
                  initialData?.sharing?.members?.[currentUser.uid]?.role === 'owner' && (
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      className="w-full mt-3 px-4 py-2.5 bg-white border-2 border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      <UserPlus size={18} />
                      Invita
                    </button>
                  )}
              </div>

              {showHelp['organizers'] && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    💡 {mode === 'create'
                      ? 'Dopo aver creato il viaggio potrai invitare altri collaboratori direttamente dal Menu del Viaggio.'
                      : 'Clicca su un partecipante per vedere il suo profilo. Solo l\'owner può invitare nuovi membri.'}
                  </p>
                </div>
              )}
            </div>

            {/* 💱 VALUTE DEL VIAGGIO */}
            <CurrencySelector
              preferredCurrencies={preferredCurrencies}
              onChange={setPreferredCurrencies}
              showHelp={showHelp['currencies']}
              onToggleHelp={() => toggleHelp('currencies')}
            />

            {/* DESCRIZIONE */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📝 Descrizione
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="Aggiungi note e dettagli sul viaggio..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5 text-right">
                {description.length} / 500
              </p>
            </div>

          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              {mode === 'create' ? 'Crea viaggio' : 'Salva modifiche'}
            </button>
          </div>

        </div>
      </div>

      {/* Modal Invita Membri */}
      {mode === 'edit' && tripForInvite && (
        <InviteOptionsModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          trip={tripForInvite}
          currentUser={currentUser}
        />
      )}

      {/* Modal Profilo Utente */}
      {selectedUserProfile && (() => {
        const memberData = activeMembers.find(m => m.userId === selectedUserProfile);
        return (
          <UserProfileModal
            isOpen={true}
            onClose={() => setSelectedUserProfile(null)}
            userId={selectedUserProfile}
            tripContext={memberData ? {
              role: memberData.role,
              joinedAt: memberData.joinedAt,
              displayName: memberData.displayName,
              username: memberData.username,
              avatar: memberData.avatar
            } : mode === 'create' && selectedUserProfile === currentUser.uid ? {
              role: 'owner',
              displayName: currentUser.displayName,
              username: currentUser.username,
              avatar: currentUser.photoURL
            } : undefined}
          />
        );
      })()}
    </>
  );
};

export default TripMetadataModal;