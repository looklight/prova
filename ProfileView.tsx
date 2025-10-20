import React, { useState } from 'react';
import { ChevronLeft, User, Mail, Edit2, Check } from 'lucide-react';

const ProfileView = ({ onBack }) => {
  // Stati
  const [userName, setUserName] = useState('Mario Rossi');
  const [username, setUsername] = useState('mariorossi');
  const [avatar, setAvatar] = useState(null);
  const [editing, setEditing] = useState({ name: false, username: false });
  const [temp, setTemp] = useState({ name: '', username: '' });

  // Dati utente (dovrebbero arrivare come props)
  const userEmail = 'demo@esempio.com';
  const userId = 'user-' + Date.now();

  // Handler avatar
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
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

  const saveEdit = (field) => {
    if (!temp[field].trim()) {
      cancelEdit(field);
      return;
    }

    if (field === 'name') {
      setUserName(temp.name.trim());
    } else if (field === 'username') {
      const clean = temp.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (clean) setUsername(clean);
    }
    
    cancelEdit(field);
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') saveEdit(field);
    if (e.key === 'Escape') cancelEdit(field);
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
            className={`w-full px-3 py-1.5 rounded-lg text-gray-800 ${inputSize} font-semibold`}
            autoFocus
            onKeyDown={(e) => handleKeyDown(e, field)}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => saveEdit(field)}
              className="flex-1 px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-medium"
            >
              <Check size={14} className="inline mr-1" />
              Salva
            </button>
            <button
              onClick={() => cancelEdit(field)}
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
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <label htmlFor="avatar-upload" className="cursor-pointer block flex-shrink-0">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-full object-cover border-4 border-white border-opacity-30"
                />
              ) : (
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white border-opacity-30">
                  <User size={40} className="text-white" />
                </div>
              )}
            </label>
            
            {/* Info Utente */}
            <div className="flex-1 min-w-0">
              <EditableField field="name" value={userName} placeholder="Nome visualizzato" size="lg" />
              <EditableField field="username" value={username} placeholder="username" prefix="@" size="sm" />
              
              <div className="flex items-center gap-2 text-blue-100 text-xs mt-2">
                <Mail size={12} />
                <span className="truncate">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* User ID */}
          <div className="pt-3 border-t border-white border-opacity-20">
            <div className="text-xs text-blue-100 opacity-60 truncate">
              ID: {userId}
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-xl shadow mb-6">
          <button
            onClick={() => {
              if (confirm('Vuoi davvero uscire?')) {
                alert('Logout effettuato');
                onBack();
              }
            }}
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

// Wrapper per demo
export default function App() {
  return <ProfileView onBack={() => alert('Torna indietro')} />;
}