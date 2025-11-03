import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, MapPin, AlertCircle, Loader } from 'lucide-react';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validazione
    if (!email || !password) {
      setError('Inserisci email e password');
      setIsLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Inserisci un\'email valida');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Registrazione
        await createUserWithEmailAndPassword(auth, email, password);
      }
      
      // ⭐ Controlla se c'è un invite token salvato
      const inviteToken = sessionStorage.getItem('inviteToken');
      if (inviteToken) {
        console.log('🔗 Token invito trovato, redirect dopo login');
        // Il redirect path è già impostato da InviteHandler
        // App.jsx gestirà il redirect automaticamente
      }
      
      // Successo - il componente padre gestirà il redirect
      onAuthSuccess();
    } catch (err) {
      console.error('Errore auth:', err);
      
      // Messaggi di errore user-friendly
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Questa email è già registrata');
          break;
        case 'auth/invalid-email':
          setError('Email non valida');
          break;
        case 'auth/user-not-found':
          setError('Utente non trovato');
          break;
        case 'auth/wrong-password':
          setError('Password errata');
          break;
        case 'auth/weak-password':
          setError('Password troppo debole (minimo 6 caratteri)');
          break;
        case 'auth/invalid-credential':
          setError('Credenziali non valide');
          break;
        default:
          setError('Errore durante l\'autenticazione. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Inserisci la tua email per recuperare la password');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError('');
    } catch (err) {
      setError('Errore nell\'invio dell\'email di recupero');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mb-4">
              <MapPin size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">I Miei Viaggi</h1>
            <p className="text-gray-500 mt-2">
              {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {resetEmailSent && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-700">
                ✅ Email di recupero inviata! Controlla la tua casella di posta.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.com"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  Password dimenticata?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold text-base hover:from-blue-600 hover:to-purple-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>{isLogin ? 'Accesso...' : 'Registrazione...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? 'Non hai un account?' : 'Hai già un account?'}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setResetEmailSent(false);
                }}
                className="text-blue-500 hover:text-blue-600 font-semibold"
              >
                {isLogin ? 'Registrati' : 'Accedi'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6">
          © 2025 I Miei Viaggi. Tutti i diritti riservati.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;