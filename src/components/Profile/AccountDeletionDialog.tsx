import React, { useState } from 'react';
import { X, AlertTriangle, Loader, Lock, Trash2 } from 'lucide-react';
import { deleteUserAccount, reauthenticateUser } from '../../services/accountDeletionService';

const AccountDeletionDialog = ({ userId, userEmail, onClose }) => {
  const [step, setStep] = useState('warning'); // warning | reauth | confirm | deleting
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState([]);

  const handleReauth = async () => {
    setError('');
    try {
      await reauthenticateUser(password);
      setStep('confirm');
    } catch (err) {
      setError(err.message || 'Errore autenticazione. Riprova.');
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'ELIMINA') {
      setError('Digita "ELIMINA" per confermare');
      return;
    }

    setStep('deleting');
    setError('');

    try {
      await deleteUserAccount(userId, (message) => {
        setProgress(prev => [...prev, message]);
      });
      
      // Redirect gestito in accountDeletionService
    } catch (err) {
      setError(err.message || 'Errore durante l\'eliminazione');
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Step 1: Warning */}
        {step === 'warning' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={24} className="text-red-600" />
                <h2 className="text-xl font-bold text-gray-800">Eliminazione Account</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-800 font-semibold mb-2">⚠️ ATTENZIONE</p>
                <p className="text-sm text-red-700">
                  Questa azione è <strong>irreversibile</strong>. Non potrai recuperare il tuo account.
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-700">
                <p className="font-semibold">Cosa verrà eliminato:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Il tuo profilo e tutte le informazioni personali</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Verrai rimosso da tutti i viaggi condivisi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Avatar e immagini profilo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Notifiche e inviti</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => setStep('reauth')}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
              >
                Continua
              </button>
            </div>
          </>
        )}

        {/* Step 2: Re-autenticazione */}
        {step === 'reauth' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Conferma Identità</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm text-gray-700 mb-4">
                Per sicurezza, conferma la tua password prima di procedere.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la tua password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleReauth()}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 mt-3 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {error}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setStep('warning')}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
              >
                Indietro
              </button>
              <button
                onClick={handleReauth}
                disabled={!password}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Conferma
              </button>
            </div>
          </>
        )}

        {/* Step 3: Conferma finale */}
        {step === 'confirm' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 size={24} className="text-red-600" />
                <h2 className="text-xl font-bold text-gray-800">Conferma Finale</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-800 font-bold text-center">
                  ULTIMA POSSIBILITÀ DI ANNULLARE
                </p>
              </div>

              <p className="text-sm text-gray-700 mb-4">
                Digita <strong>ELIMINA</strong> in maiuscolo per confermare l'eliminazione definitiva del tuo account.
              </p>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digita ELIMINA"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none text-center font-bold"
              />

              {error && (
                <p className="text-sm text-red-600 mt-3 text-center">{error}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'ELIMINA'}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ELIMINA ACCOUNT
              </button>
            </div>
          </>
        )}

        {/* Step 4: Eliminazione in corso */}
        {step === 'deleting' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 text-center">Eliminazione in corso...</h2>
            </div>

            <div className="px-6 py-8">
              <Loader size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
              
              <div className="space-y-2 text-sm text-gray-600">
                {progress.map((msg, idx) => (
                  <p key={idx} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>{msg}</span>
                  </p>
                ))}
              </div>

              <p className="text-xs text-gray-500 text-center mt-6">
                Non chiudere questa finestra
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default AccountDeletionDialog;