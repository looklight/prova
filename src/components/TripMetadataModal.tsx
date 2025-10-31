import React, { useState, useEffect } from 'react';
import { X, Upload, User, UserPlus } from 'lucide-react';
import { resizeAndUploadImage } from '../services';

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
  const [isUploading, setIsUploading] = useState(false);

  // Carica dati iniziali quando il modal si apre
  useEffect(() => {
    if (isOpen && initialData) {
      setTripName(initialData.name || '');
      setDestinations(initialData.destinations || []);
      setDescription(initialData.description || '');
      setImage(initialData.image || null);
    } else if (isOpen && !initialData) {
      // Reset per creazione nuovo viaggio
      setTripName('');
      setDestinations([]);
      setDescription('');
      setImage(null);
    }
  }, [isOpen, initialData]);

  const addDestination = () => {
    if (newDestination.trim() && destinations.length < 10) {
      setDestinations([...destinations, newDestination.trim()]);
      setNewDestination('');
    }
  };

  const removeDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Immagine troppo grande (max 5MB)');
      return;
    }

    setIsUploading(true);
    try {
      const tripIdForPath = initialData?.tripId || Date.now();
      const imageURL = await resizeAndUploadImage(
        file,
        `trips/${tripIdForPath}/cover`,
        400,
        400,
        0.85
      );
      
      setImage(imageURL);
    } catch (error) {
      console.error('Errore caricamento immagine:', error);
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
      destinations,
      description: description.trim()
    };

    onSave(metadata);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDestination();
    }
  };

  const handleInviteClick = () => {
    onInviteClick?.();
  };

  if (!isOpen) return null;

  return (
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
                      onClick={(e) => {
                        e.preventDefault();
                        setImage(null);
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

          {/* DESTINAZIONI/TAPPE - Subito dopo il titolo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🌍 Destinazioni
            </label>
            
            {/* Lista destinazioni - Tag multipli per riga */}
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

          {/* ⭐ PERSONE CHE ORGANIZZANO */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
            <label className="block text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>👥</span>
              <span>Chi organizza questo viaggio</span>
            </label>
            
            {/* ⭐ LISTA TUTTI I MEMBRI ATTIVI */}
            <div className="space-y-2">
              {mode === 'edit' && initialData?.sharing?.members ? (
                // Modalità edit: mostra tutti i membri dal trip
                Object.entries(initialData.sharing.members)
                  .filter(([_, member]) => member.status === 'active')
                  .sort((a, b) => {
                    // Owner sempre per primo
                    if (a[1].role === 'owner') return -1;
                    if (b[1].role === 'owner') return 1;
                    return 0;
                  })
                  .map(([userId, member]) => {
                    const isCurrentUser = userId === currentUser.uid;
                    
                    return (
                      <div 
                        key={userId}
                        className={`flex items-center gap-3 rounded-lg p-3 shadow-sm ${
                          isCurrentUser ? 'bg-blue-100 border-2 border-blue-300' : 'bg-white'
                        }`}
                      >
                        {member.avatar ? (
                          <img 
                            src={member.avatar} 
                            alt={member.displayName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-300 shadow"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow">
                            <User size={22} className="text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800 text-sm">
                              {member.displayName}
                            </p>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                                Tu
                              </span>
                            )}
                          </div>
                          {member.username && (
                            <p className="text-xs text-gray-500">@{member.username}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          member.role === 'owner' 
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            : 'bg-blue-100 text-blue-700 border border-blue-300'
                        }`}>
                          {member.role === 'owner' ? 'Owner' : 'Member'}
                        </span>
                      </div>
                    );
                  })
              ) : (
                // Modalità create: mostra solo currentUser
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-300 shadow"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow">
                      <User size={22} className="text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{currentUser.displayName}</p>
                    {currentUser.username && (
                      <p className="text-xs text-gray-500">@{currentUser.username}</p>
                    )}
                    {!currentUser.username && (
                      <p className="text-xs text-gray-500">Proprietario</p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    Owner
                  </span>
                </div>
              )}
            </div>
            
            {/* ⭐ Pulsante Invita (solo in modalità edit) */}
            {mode === 'edit' && onInviteClick && (
              <button
                type="button"
                onClick={handleInviteClick}
                className="w-full mt-3 px-4 py-2.5 bg-white border-2 border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <UserPlus size={18} />
                Invita collaboratori
              </button>
            )}
            
            {/* Messaggio in creazione */}
            {mode === 'create' && (
              <p className="text-xs text-gray-500 mt-3 italic">
                💡 Potrai invitare collaboratori dopo aver creato il viaggio
              </p>
            )}
          </div>

          {/* DESCRIZIONE VIAGGIO */}
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

        {/* FOOTER - Fixed */}
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
  );
};

export default TripMetadataModal;