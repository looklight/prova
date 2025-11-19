import React, { useState, useEffect } from 'react';
import { X, Upload, UserPlus, Crown } from 'lucide-react';
import { resizeAndUploadImage, deleteImageFromStorage } from '../services/mediaService';
import { IMAGE_COMPRESSION } from '../config/imageConfig';
import InviteOptionsModal from './InviteOptionsModal';
import UserProfileModal from './Profile/UserProfileModal';
import Avatar from './Avatar';
import { normalizeDestination } from '../utils/textUtils';
import { useAnalytics } from '../hooks/useAnalytics';

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
  imagePath?: string | null; // ⭐ Aggiungi path per cleanup
  destinations: string[];
  description: string;
}

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
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newDestination, setNewDestination] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null); // ⭐ Nuovo state
  const [isUploading, setIsUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  const analytics = useAnalytics();

  // Carica dati iniziali quando il modal si apre
  useEffect(() => {
    if (isOpen && initialData) {
      setTripName(initialData.name || '');
      setDestinations(initialData.destinations || []);
      setDescription(initialData.description || '');
      setImage(initialData.image || null);
      setImagePath(initialData.imagePath || null); // ⭐ Carica anche path
    } else if (isOpen && !initialData) {
      // Reset per creazione nuovo viaggio
      setTripName('');
      setDestinations([]);
      setDescription('');
      setImage(null);
      setImagePath(null); // ⭐ Reset path
    }
  }, [isOpen, initialData]);

  const addDestination = () => {
    if (newDestination.trim() && destinations.length < 10) {
      const normalized = normalizeDestination(newDestination.trim());
      setDestinations([...destinations, normalized]);

      // 📊 Track aggiunta destinazione (solo in edit mode)
      if (mode === 'edit' && initialData?.tripId) {
        analytics.trackDestinationAdded(normalized, initialData.tripId, 'edit');
      }

      setNewDestination('');
    }
  };

  const removeDestination = (index: number) => {
    const removedDest = destinations[index];

    // 📊 Track rimozione destinazione (solo in edit mode)
    if (mode === 'edit' && initialData?.tripId && removedDest) {
      analytics.trackDestinationRemoved(removedDest, initialData.tripId);
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

    // ✅ RIMOSSO: Controllo dimensione file (il resize gestisce tutto)

    setIsUploading(true);
    try {
      const tripIdForPath = initialData?.tripId || Date.now();

      // ⭐ STEP 1: Elimina vecchia cover se esiste
      if (imagePath) {
        try {
          await deleteImageFromStorage(imagePath);
          console.log('🗑️ Vecchia cover eliminata');
        } catch (error) {
          console.warn('⚠️ Errore eliminazione vecchia cover:', error);
        }
      }

      // ⭐ STEP 2: Carica nuova cover
      const path = `trips/${tripIdForPath}/cover`;
      const { url: imageURL, path: newImagePath } = await resizeAndUploadImage(
        file,
        path,
        IMAGE_COMPRESSION.tripCover.maxWidth,
        IMAGE_COMPRESSION.tripCover.maxHeight,
        IMAGE_COMPRESSION.tripCover.quality
      );

      setImage(imageURL);
      setImagePath(newImagePath); // ⭐ Salva nuovo path
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
      imagePath, // ⭐ Includi path
      destinations,
      description: description.trim()
    };

    onSave(metadata);

    // 📊 Track modifiche metadata (solo in edit mode)
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDestination();
    }
  };

  if (!isOpen) return null;

  // Crea oggetto trip per InviteOptionsModal
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

  // Lista membri per UserProfileModal
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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

            {/* IMMAGINE COPERTINA - Cerchio centrato */}
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
                    <div className="relative">
                      <img
                        src={image}
                        alt="Viaggio"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          
                          // ⭐ Elimina da Storage se esiste path
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
                        className="absolute -top-1 -right-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
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

            {/* DESTINAZIONI/TAPPE */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🌍 Destinazioni
              </label>

              {/* Lista destinazioni */}
              {destinations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {destinations.map((dest, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium group hover:bg-blue-200 transition-colors"
                    >
                      <span>{dest}</span>
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

              {/* Input nuova destinazione */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="es. Tokyo"
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={addDestination}
                  disabled={!newDestination.trim() || destinations.length >= 10}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm whitespace-nowrap"
                >
                  + Inserisci
                </button>
              </div>

              {destinations.length >= 10 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Massimo 10 destinazioni
                </p>
              )}
            </div>

            {/* PERSONE CHE ORGANIZZANO */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
              <label className="block text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>👥</span>
                <span>Chi organizza questo viaggio</span>
              </label>

              {/* LISTA MEMBRI - UNIFORMATA E CLICCABILE */}
              <div className="space-y-2">
                {mode === 'edit' && initialData?.sharing?.members ? (
                  // Modalità edit: mostra tutti i membri
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
                            {/* Avatar */}
                            <Avatar
                              src={member.avatar}
                              name={member.displayName}
                              size="md"
                            />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              {/* Riga 1: Nome + Badge Owner inline */}
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

                              {/* Riga 2: Username */}
                              {member.username && (
                                <p className="text-sm text-gray-500 truncate">@{member.username}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  // Modalità create: mostra solo currentUser (cliccabile)
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

              {/* Pulsante Invita (solo in edit E solo se owner) */}
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

              {/* Messaggio in creazione */}
              {mode === 'create' && (
                <p className="text-xs text-gray-500 mt-3 italic">
                  💡 Potrai invitare collaboratori dopo aver creato il viaggio
                </p>
              )}
            </div>

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

      {/* Modal Invita Membri Unificato */}
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