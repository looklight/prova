import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, User, Camera, Loader, HardDrive } from 'lucide-react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { loadUserProfile, updateUserProfile, updateUserProfileInTrips } from "../../services/profileService";
import { resizeAndUploadImage, deleteImageFromStorage } from "../../services/mediaService";
import { confirmMedia } from "../../services/pendingMediaService";
import { IMAGE_COMPRESSION } from '../../config/imageConfig';
import { Avatar } from '../ui';
import ProfileEditModal from './ProfileEditModal';
import UserStorageModal from './UserStorageModal';

const ProfileView = ({ onBack, user, trips = [] }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userProfile = await loadUserProfile(user.uid, user.email);
        setProfile(userProfile);
      } catch (error) {
        console.error('Errore caricamento profilo:', error);
        alert('Errore nel caricamento del profilo');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);

      if (profile.avatarPath) {
        try {
          await deleteImageFromStorage(profile.avatarPath);
          console.log('🗑️ Vecchio avatar eliminato');
        } catch (error) {
          console.warn('⚠️ Errore eliminazione vecchio avatar:', error);
        }
      }

      const { url: avatarURL, path: avatarPath } = await resizeAndUploadImage(
        file,
        `avatars/${user.uid}`,
        IMAGE_COMPRESSION.avatar.maxWidth,
        IMAGE_COMPRESSION.avatar.maxHeight,
        IMAGE_COMPRESSION.avatar.quality,
        'avatar'
      );

      setProfile({
        ...profile,
        avatar: avatarURL,
        avatarPath: avatarPath
      });

      await updateUserProfile(user.uid, {
        avatar: avatarURL,
        avatarPath: avatarPath
      });

      // Conferma media salvato (per cleanup orfani)
      await confirmMedia(avatarPath);

      await updateUserProfileInTrips(user.uid, {
        avatar: avatarURL,
        displayName: profile.displayName,
        username: profile.username
      });

      console.log('✅ Avatar aggiornato ovunque');
    } catch (error) {
      console.error('❌ Errore upload avatar:', error);
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile.avatar) return;

    try {
      if (profile.avatarPath) {
        await deleteImageFromStorage(profile.avatarPath);
        console.log('🗑️ Avatar eliminato da Storage');
      }

      setProfile({ ...profile, avatar: null, avatarPath: null });
      await updateUserProfile(user.uid, { avatar: null, avatarPath: null });
      
      await updateUserProfileInTrips(user.uid, { 
        avatar: null,
        displayName: profile.displayName,
        username: profile.username
      });
      
      console.log('✅ Avatar rimosso ovunque');
    } catch (error) {
      console.error('❌ Errore rimozione avatar:', error);
      alert('Errore nella rimozione dell\'avatar');
    }
  };

  const handleLogout = async () => {
    if (confirm('Vuoi davvero uscire?')) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Errore logout:', error);
        alert('Errore durante il logout');
      }
    }
  };

  const calculateStats = () => {
    const totalTrips = trips.length;
    const totalDays = trips.reduce((sum, trip) => sum + (trip.days?.length || 0), 0);
    return { totalTrips, totalDays };
  };

  const stats = calculateStats();

  // Calcola spazio file caricati dall'utente (immagini + documenti)
  const storageUsed = useMemo(() => {
    if (!user?.uid || !trips.length) return 0;

    let totalBytes = 0;

    trips.forEach((trip: any) => {
      if (!trip.data) return;

      // Itera su tutti i giorni
      trip.days?.forEach((day: any) => {
        const dayId = day.id;

        // Attività
        const activitiesKey = `${dayId}-attivita`;
        const activitiesData = trip.data[activitiesKey];
        if (activitiesData?.activities && Array.isArray(activitiesData.activities)) {
          activitiesData.activities.forEach((activity: any) => {
            // Immagini attività
            if (activity.images && Array.isArray(activity.images)) {
              activity.images.forEach((img: any) => {
                if (img.uploaderId === user.uid && img.size) {
                  totalBytes += img.size;
                }
              });
            }
            // Documenti attività
            if (activity.documents && Array.isArray(activity.documents)) {
              activity.documents.forEach((doc: any) => {
                if (doc.uploaderId === user.uid && doc.size) {
                  totalBytes += doc.size;
                }
              });
            }
          });
        }

        // Pernottamento
        const accommodationKey = `${dayId}-pernottamento`;
        const accommodationData = trip.data[accommodationKey];
        if (accommodationData) {
          // Immagini pernottamento
          if (accommodationData.images && Array.isArray(accommodationData.images)) {
            accommodationData.images.forEach((img: any) => {
              if (img.uploaderId === user.uid && img.size) {
                totalBytes += img.size;
              }
            });
          }
          // Documenti pernottamento
          if (accommodationData.documents && Array.isArray(accommodationData.documents)) {
            accommodationData.documents.forEach((doc: any) => {
              if (doc.uploaderId === user.uid && doc.size) {
                totalBytes += doc.size;
              }
            });
          }
        }
      });
    });

    return totalBytes;
  }, [trips, user?.uid]);

  // Formatta bytes in formato leggibile
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Limite storage (es. 100 MB per utenti free)
  const STORAGE_LIMIT_MB = 100;
  const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024;
  const storagePercentage = Math.min((storageUsed / STORAGE_LIMIT_BYTES) * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ maxWidth: '430px', margin: '0 auto' }}>
        <div className="text-xl text-gray-600 flex items-center gap-2">
          <Loader size={24} className="animate-spin" />
          Caricamento profilo...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ maxWidth: '430px', margin: '0 auto' }}>
        <div className="text-xl text-red-600">Errore nel caricamento del profilo</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: '430px', margin: '0 auto' }}>
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Profilo</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Avatar + Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 text-center">
          <div className="relative inline-block mb-4">
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploadingAvatar}
            />
            <label
              htmlFor="avatar-upload"
              className={`cursor-pointer block relative group ${uploadingAvatar ? 'opacity-50' : ''}`}
            >
              {uploadingAvatar ? (
                <div className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-gray-200 bg-gray-300">
                  <Loader size={32} className="text-white animate-spin" />
                </div>
              ) : (
                <Avatar 
                  src={profile.avatar} 
                  name={profile.displayName || 'User'} 
                  size="xl"
                  className="border-2 border-gray-200"
                />
              )}

              {!uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all">
                  <Camera size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </label>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-1">{profile.displayName}</h2>
          <p className="text-sm text-gray-500 mb-3">@{profile.username}</p>

          <p className="text-xs text-gray-400">
            ✈️ Membro da {profile.createdAt?.toDate ? 
              profile.createdAt.toDate().toLocaleDateString('it-IT', {
                month: 'long',
                year: 'numeric'
              }) :
              new Date(profile.createdAt).toLocaleDateString('it-IT', {
                month: 'long',
                year: 'numeric'
              })
            }
          </p>

          <button
            onClick={() => setShowEditModal(true)}
            className="mt-4 w-full py-2 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Modifica Profilo
          </button>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalTrips}</div>
              <div className="text-xs text-gray-500 mt-1">Viaggi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalDays}</div>
              <div className="text-xs text-gray-500 mt-1">Giorni</div>
            </div>
          </div>
        </div>

        {/* Storage */}
        <button
          onClick={() => setShowStorageModal(true)}
          className="w-full bg-white rounded-2xl shadow-sm p-6 mb-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <HardDrive size={20} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Spazio di archiviazione</h3>
              <p className="text-xs text-gray-500">
                {formatBytes(storageUsed)} di {STORAGE_LIMIT_MB} MB utilizzati
              </p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${storagePercentage}%`,
                backgroundColor: storagePercentage > 90 ? '#EF4444' : storagePercentage > 70 ? '#F59E0B' : '#3B82F6'
              }}
            />
          </div>

          {storagePercentage > 90 && (
            <p className="text-xs text-red-500 mt-2">
              Stai esaurendo lo spazio disponibile
            </p>
          )}
        </button>

        {/* Info App */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>Info App</span>
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Versione 1.0 - Fatta col ❤️ per i viaggiatori</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-colors"
        >
          Esci
        </button>
      </div>

      {/* Modal */}
      {showEditModal && (
        <ProfileEditModal
          profile={profile}
          userId={user.uid}
          userEmail={user.email}
          onClose={() => setShowEditModal(false)}
          onSave={async (updates) => {
            setProfile({ ...profile, ...updates });
            await updateUserProfile(user.uid, updates);
            await updateUserProfileInTrips(user.uid, updates);
            setShowEditModal(false);
            console.log('✅ Profilo aggiornato ovunque');
          }}
          onRemoveAvatar={handleRemoveAvatar}
        />
      )}

      {/* Storage Modal */}
      <UserStorageModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        trips={trips}
        userId={user?.uid}
        onFileDeleted={() => {
          // I trips si aggiorneranno automaticamente dal listener realtime
          console.log('📁 File eliminato, storage aggiornato');
        }}
      />
    </div>
  );
};

export default ProfileView;