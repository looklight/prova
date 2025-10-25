import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Camera, Loader } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { loadUserProfile, updateUserProfile, resizeImage, checkUsernameExists, isValidUsername } from './services';

const ProfileView = ({ onBack, user, trips = [] }) => {
  // Stati
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Carica profilo al mount
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

  // Handler avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setUploadingAvatar(true);
      
      // Ridimensiona a 200x200px
      const resizedAvatar = await resizeImage(file, 200, 200, 0.85);
      
      // Aggiorna localmente
      setProfile({ ...profile, avatar: resizedAvatar });
      
      // Salva su Firestore
      await updateUserProfile(user.uid, { avatar: resizedAvatar });
      
      console.log('✅ Avatar aggiornato');
    } catch (error) {
      console.error('Errore upload avatar:', error);
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setUploadingAvatar(false);
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

  // Calcola statistiche utente
  const calculateStats = () => {
    const totalTrips = trips.length;
    const totalDays = trips.reduce((sum, trip) => sum + (trip.days?.length || 0), 0);
    return { totalTrips, totalDays };
  };

  const stats = calculateStats();

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
      {/* Header Minimal */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Profilo</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Sezione Avatar + Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 text-center">
          {/* Avatar con hint cambio foto */}
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
              {profile.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                  {uploadingAvatar ? (
                    <Loader size={32} className="text-gray-400 animate-spin" />
                  ) : (
                    <User size={40} className="text-gray-400" />
                  )}
                </div>
              )}
              
              {/* Hint cambio foto */}
              {!uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all">
                  <Camera size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </label>
          </div>

          {/* Nome e Username */}
          <h2 className="text-lg font-bold text-gray-900 mb-1">{profile.displayName}</h2>
          <p className="text-sm text-gray-500 mb-3">@{profile.username}</p>
          
          {/* Data iscrizione */}
          <p className="text-xs text-gray-400">
            ✈️ Membro da {new Date(profile.createdAt).toLocaleDateString('it-IT', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>

          {/* Bottone Modifica Profilo */}
          <button
            onClick={() => setShowEditModal(true)}
            className="mt-4 w-full py-2 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Modifica Profilo
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Viaggi Totali */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalTrips}</div>
              <div className="text-xs text-gray-500 mt-1">Viaggi</div>
            </div>

            {/* Giorni Totali */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalDays}</div>
              <div className="text-xs text-gray-500 mt-1">Giorni</div>
            </div>
          </div>
        </div>


        {/* Info App */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>Info App</span>
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Versione 1.0.0</p>
            
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

      {/* Modal Modifica Profilo */}
      {showEditModal && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSave={async (updates) => {
            try {
              // Aggiorna localmente
              setProfile({ ...profile, ...updates });
              
              // Salva su Firestore
              await updateUserProfile(user.uid, updates);
              
              setShowEditModal(false);
              console.log('✅ Profilo aggiornato');
            } catch (error) {
              console.error('Errore aggiornamento profilo:', error);
              alert('Errore nel salvataggio');
            }
          }}
        />
      )}
    </div>
  );
};

// Componente Modal per Editing
const ProfileEditModal = ({ profile, onClose, onSave }) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert('Il nome è obbligatorio');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      alert('Username non valido. Usa solo lettere, numeri e underscore.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        username: cleanUsername
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Modifica Profilo</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome visualizzato
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Mario Rossi"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mariorossi"
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Solo lettere, numeri e underscore</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;