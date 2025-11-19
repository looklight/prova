import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { checkUsernameExists, isValidUsername } from '../../services/profileService';
import AccountDeletionDialog from './AccountDeletionDialog';

const ProfileEditModal = ({ profile, userId, userEmail, onClose, onSave, onRemoveAvatar }) => {
  // Stati form
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  
  // Stati UI
  const [saving, setSaving] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Validazione username
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameError, setUsernameError] = useState('');
  const [checkTimeout, setCheckTimeout] = useState(null);

  // Validazione username in tempo reale
  useEffect(() => {
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername === profile.username.toLowerCase()) {
      setUsernameStatus('valid');
      setUsernameError('');
      return;
    }

    if (!cleanUsername) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    if (!isValidUsername(cleanUsername)) {
      setUsernameStatus('invalid');
      setUsernameError('Username non valido. Usa 3-20 caratteri: lettere, numeri e underscore.');
      return;
    }

    setUsernameStatus('checking');
    const timeout = setTimeout(async () => {
      try {
        const exists = await checkUsernameExists(cleanUsername, userId);
        if (exists) {
          setUsernameStatus('taken');
          setUsernameError('Username già in uso da un altro utente');
        } else {
          setUsernameStatus('valid');
          setUsernameError('');
        }
      } catch (error) {
        console.error('Errore check username:', error);
        setUsernameStatus('invalid');
        setUsernameError('Errore nella verifica');
      }
    }, 500);

    setCheckTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [username, userId, profile.username]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert('Il nome è obbligatorio');
      return;
    }

    if (usernameStatus !== 'valid') {
      alert(usernameError || 'Username non valido');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

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

  const getUsernameIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <Loader size={18} className="text-gray-400 animate-spin" />;
      case 'valid':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'invalid':
      case 'taken':
        return <XCircle size={18} className="text-red-500" />;
      default:
        return null;
    }
  };

  const memberSince = profile.createdAt?.toDate
    ? profile.createdAt.toDate().toLocaleDateString('it-IT', {
        month: 'long',
        year: 'numeric'
      })
    : 'Non disponibile';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800">Modifica Profilo</h2>
            {profile.avatar && (
              <button
                onClick={onRemoveAvatar}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                title="Rimuovi foto profilo"
              >
                Rimuovi foto
              </button>
            )}
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            
            {/* 👤 Sezione Info Base */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>Informazioni Base</span>
              </h3>
              
              {/* Nome */}
              <div className="mb-4">
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
                    className={`w-full pl-8 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      usernameStatus === 'valid' ? 'border-green-300 focus:border-green-500' :
                      usernameStatus === 'invalid' || usernameStatus === 'taken' ? 'border-red-300 focus:border-red-500' :
                      'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {getUsernameIcon()}
                  </div>
                </div>

                {usernameStatus === 'checking' && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <Loader size={12} className="animate-spin" />
                    Verifica disponibilità...
                  </p>
                )}
                {usernameStatus === 'valid' && username.trim().toLowerCase() !== profile.username.toLowerCase() && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle size={12} />
                    Username disponibile!
                  </p>
                )}
                {usernameStatus === 'invalid' && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {usernameError}
                  </p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <XCircle size={12} />
                    {usernameError}
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-1.5">3-20 caratteri: lettere, numeri e underscore</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* ⚙️ Sezione Info Account */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>Informazioni Account</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Email
                  </label>
                  <div className="text-sm text-gray-900 font-medium">{userEmail}</div>
                  <p className="text-xs text-gray-400 mt-0.5">(non modificabile)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Membro da
                  </label>
                  <div className="text-sm text-gray-900 font-medium">{memberSince}</div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* 🗑️ Elimina Account */}
            <div>
              <button
                onClick={() => setShowDeleteSection(!showDeleteSection)}
                className="w-full flex items-center justify-between text-sm text-red-700 hover:text-red-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>Elimina Account</span>
                </span>
              </button>

              {showDeleteSection && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="text-xs text-red-700 space-y-1 mb-4">
                    <p>Eliminando il tuo account:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>Perderai l'accesso permanente</li>
                      <li>Verrai rimosso da tutti i viaggi</li>
                      <li>I tuoi dati personali saranno cancellati</li>
                    </ul>
                    <p className="mt-2 font-semibold">Questa azione è irreversibile.</p>
                  </div>

                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Elimina Account</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving || usernameStatus !== 'valid'}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </div>
      </div>

      {/* Dialog eliminazione */}
      {showDeleteDialog && (
        <AccountDeletionDialog
          userId={userId}
          userEmail={userEmail}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  );
};

export default ProfileEditModal;