import React, { useState, useEffect } from 'react';
import { X, Crown, Loader } from 'lucide-react';
import { loadPublicProfile } from '../../services/profileService';
import Avatar from '../Avatar';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  tripContext?: {
    role?: 'owner' | 'member';
    joinedAt?: Date;
    displayName?: string;
    username?: string;
    avatar?: string;
  };
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  tripContext
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadProfile = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await loadPublicProfile(userId);
        setProfile(data);
      } catch (err) {
        console.error('❌ Errore caricamento profilo:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const displayName = profile?.displayName || tripContext?.displayName || 'Utente';
  const username = profile?.username || tripContext?.username;
  const avatar = profile?.avatar || tripContext?.avatar;
  const createdAt = profile?.createdAt;
  const bio = profile?.bio;
  const gender = profile?.gender;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Profilo</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {loading ? (
            <div className="text-center py-12">
              <Loader size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-500">Caricamento profilo...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-2">Errore nel caricamento del profilo</p>
              <p className="text-sm text-gray-500">Impossibile caricare i dati dell'utente</p>
            </div>
          ) : (
            <div className="text-center space-y-4">

              {/* Avatar */}
              <div className="flex justify-center">
                <Avatar
                  src={avatar}
                  name={displayName}
                  size="xl"
                  className="border-4 border-gray-200 shadow-lg"
                />
              </div>

              {/* Nome */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{displayName}</h3>
                {username && (
                  <p className="text-gray-500 mt-1">@{username}</p>
                )}
              </div>

              {/* Badge Ruolo */}
              {tripContext?.role && (
                <div className="flex justify-center">
                  {tripContext.role === 'owner' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      <Crown size={14} />
                      Owner
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      Member
                    </span>
                  )}
                </div>
              )}

              {/* Bio */}
              {bio && (
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <p className="text-sm text-gray-700 leading-relaxed">{bio}</p>
                </div>
              )}

              {/* Info temporali */}
              <div className="pt-4 space-y-2 text-sm text-gray-600">
                {createdAt && (
                  <p className="flex items-center justify-center gap-2">
                    <span>✈️</span>
                    <span>
                      Membro da{' '}
                      {createdAt.toDate ?
                        createdAt.toDate().toLocaleDateString('it-IT', {
                          month: 'long',
                          year: 'numeric'
                        }) :
                        new Date(createdAt).toLocaleDateString('it-IT', {
                          month: 'long',
                          year: 'numeric'
                        })
                      }
                    </span>
                  </p>
                )}

                {tripContext?.joinedAt && (
                  <p className="flex items-center justify-center gap-2">
                    <span>🤝</span>
                    <span>
                      Nel viaggio da{' '}
                      {tripContext.joinedAt.toLocaleDateString('it-IT', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserProfileModal;