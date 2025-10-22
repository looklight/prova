import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Mail, Edit2, Check, Loader } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { loadUserProfile, updateUserProfile, resizeImage } from './firestoreService';

const ProfileView = ({ onBack, user }) => {
  // Stati
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState({ displayName: false, username: false });
  const [temp, setTemp] = useState({ displayName: '', username: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  // Handler generici per editing
  const startEdit = (field, value) => {
    setEditing({ ...editing, [field]: true });
    setTemp({ ...temp, [field]: value });
  };

  const cancelEdit = (field) => {
    setEditing({ ...editing, [field]: false });
    setTemp({ ...temp, [field]: '' });
  };

  const saveEdit = async (field) => {
    if (!temp[field].trim()) {
      cancelEdit(field);
      return;
    }

    try {
      setSaving(true);
      
      const updates = {};
      
      if (field === 'displayName') {
        updates.displayName = temp.displayName.trim();
      } else if (field === 'username') {
        const clean = temp.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!clean) {
          alert('Username non valido. Usa solo lettere, numeri e underscore.');
          return;
        }
        updates.username = clean;
      }
      
      // Aggiorna localmente
      setProfile({ ...profile, ...updates });
      
      // Salva su Firestore
      await updateUserProfile(user.uid, updates);
      
      console.log('✅ Profilo aggiornato');
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      alert('Errore nel salvataggio');
    } finally {
      setSaving(false);
      cancelEdit(field);
    }
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') saveEdit(field);
    if (e.key === 'Escape') cancelEdit(field);
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

  // Componente EditableField riutilizzabile
  const EditableField = ({ field, value, placeholder, prefix = '', size = 'lg' }) => {
    const isEditing = editing[field];
    const textSize = size === 'lg' ? 'text-xl' : 'text-sm';
    const inputSize = size === 'lg' ? 'text-lg' : 'text-sm';
    const iconSize = size === 'lg' ? 16 : 14;

    if (isEditing) {
      return (
        <div className="mb-2">
          <input
            type="text"
            value={temp[field]}
            onChange={(e) => setTemp({ ...temp, [field]: e.target.value })}
            placeholder={placeholder}
            className={`w-full px-3 py-1.5 rounded-lg text-gray-800 ${inputSize} font-semibold border-2 border-blue-400 focus:outline-none`}
            autoFocus
            onKeyDown={(e) => handleKeyDown(e, field)}
            disabled={saving}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => saveEdit(field)}
              disabled={saving}
              className="flex-1 px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-medium border border-blue-600 disabled:opacity-50"
            >
              {saving ? (
                <><Loader size={14} className="inline animate-spin mr-1" /> Salvo...</>
              ) : (
                <><Check size={14} className="inline mr-1" /> Salva</>
              )}
            </button>
            <button
              onClick={() => cancelEdit(field)}
              disabled={saving}
              className="flex-1 px-3 py-1 bg-white bg-opacity-20 rounded-lg text-xs font-medium"
            >
              Annulla
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 mb-1">
        <span className={`${textSize} font-bold truncate`}>
          {prefix}{value}
        </span>
        <button
          onClick={() => startEdit(field, value)}
          className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors flex-shrink-0"
        >
          <Edit2 size={iconSize} />
        </button>
      </div>
    );
  };

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

      <div className="p-4">
        {/* Card Profilo */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
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
                className={`cursor-pointer block ${uploadingAvatar ? 'opacity-50' : ''}`}
              >
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full object-cover border-4 border-white border-opacity-30"
                  />
                ) : (
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white border-opacity-30">
                    {uploadingAvatar ? (
                      <Loader size={32} className="text-white animate-spin" />
                    ) : (
                      <User size={40} className="text-white" />
                    )}
                  </div>
                )}
              </label>
            </div>
            
            {/* Info Utente */}
            <div className="flex-1 min-w-0">
              <EditableField 
                field="displayName" 
                value={profile.displayName} 
                placeholder="Nome visualizzato" 
                size="lg" 
              />
              <EditableField 
                field="username" 
                value={profile.username} 
                placeholder="username" 
                prefix="@" 
                size="sm" 
              />
              
              <div className="flex items-center gap-2 text-blue-100 text-xs mt-2">
                <Mail size={12} />
                <span className="truncate">{profile.email}</span>
              </div>
            </div>
          </div>

          {/* User ID e Date */}
          <div className="pt-3 border-t border-white border-opacity-20">
            <div className="text-xs text-blue-100 opacity-60 truncate">
              Membro da: {new Date(profile.createdAt).toLocaleDateString('it-IT', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-xl shadow mb-6">
          <button
            onClick={handleLogout}
            className="w-full p-4 text-red-500 font-semibold rounded-xl hover:bg-red-50 transition-colors"
          >
            Esci
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-xs pb-4">
          <p>Fatto con ❤️ per i viaggiatori</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;