import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, MapPin, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import PrivacyConsent from '../Legal/PrivacyConsent';

// Costanti
const BRAND_CONFIG = {
  name: '_Altrove',
  subtitle: 'Pianifica. Vivi. Ricorda.',
  copyright: '© 2025 Tutti i diritti riservati.'
};

const STYLES = {
  input: "w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent transition-all",
  inputWithRightIcon: "w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent transition-all",
  button: "w-full py-3.5 bg-[#3B82F6] text-white rounded-full font-semibold text-base hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]",
  buttonShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
  iconLeft: "absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400",
  iconRight: "absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600",
  label: "block text-sm font-medium text-gray-700 mb-2"
};

const BrandLogo = () => (
  <div
    className="inline-block p-4 rounded-full mb-4"
    style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #3DBDB5 100%)' }}
  >
    <MapPin size={40} className="text-white" />
  </div>
);

const Alert = ({ type, children }) => {
  const colors = {
    error: 'bg-red-50 border-red-200 text-red-600',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700'
  };

  return (
    <div className={`mb-6 p-4 border rounded-xl flex items-start gap-3 ${colors[type]}`}>
      <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
};

const InputField = ({ label, type, value, onChange, placeholder, icon: Icon, rightButton, onKeyDown }) => (
  <div>
    <label className={STYLES.label}>{label}</label>
    <div className="relative">
      <Icon size={20} className={STYLES.iconLeft} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={rightButton ? STYLES.inputWithRightIcon : STYLES.input}
        onKeyDown={onKeyDown}
      />
      {rightButton}
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AuthPage = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State per consenso privacy (solo signup)
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  const validateForm = () => {
    if (!email || !password) {
      setError('Inserisci email e password');
      return false;
    }
    if (!email.includes('@')) {
      setError('Inserisci un\'email valida');
      return false;
    }
    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login effettuato:', userCredential.user.email);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      console.error('❌ Errore login:', err);
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email o password non corretti');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Troppi tentativi. Riprova più tardi.');
      } else {
        setError('Errore durante il login. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setTermsError('');

    if (!validateForm()) return;

    // Valida consenso privacy
    if (!acceptedTerms) {
      setTermsError('Devi accettare la Privacy Policy e i Termini di Servizio per registrarti');
      return;
    }

    setIsLoading(true);
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Account creato');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      console.error('❌ Errore registrazione:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Questa email è già registrata');
      } else if (err.code === 'auth/weak-password') {
        setError('Password troppo debole. Usa almeno 6 caratteri.');
      } else {
        setError('Errore durante la registrazione. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Login Google effettuato:', result.user.email);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      console.error('❌ Errore login Google:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login annullato');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Questa email è già registrata con un altro metodo di login');
      } else {
        setError('Errore durante il login con Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Inserisci la tua email per recuperare la password');
      return;
    }

    if (!email.includes('@')) {
      setError('Inserisci un\'email valida');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      alert('✅ Email inviata! Controlla la tua casella di posta per reimpostare la password.');
    } catch (err) {
      console.error('❌ Errore invio email reset:', err);
      
      if (err.code === 'auth/user-not-found') {
        setError('Nessun account trovato con questa email');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Troppi tentativi. Riprova più tardi.');
      } else {
        setError('Errore durante l\'invio dell\'email. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordToggleButton = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className={STYLES.iconRight}
    >
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #3DBDB5 100%)' }}
    >
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-3xl p-8"
          style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <BrandLogo />
            <h1 className="text-3xl font-bold text-gray-800">{BRAND_CONFIG.name}</h1>
            <p className="text-gray-500 mt-2">{BRAND_CONFIG.subtitle}</p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert type="error">
              <p>{error}</p>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-5">

            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.com"
              icon={Mail}
            />

            <InputField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              rightButton={passwordToggleButton}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin(e) : handleSignup(e))}
            />

            {/* Consenso Privacy (solo signup) */}
            {mode === 'signup' && (
              <PrivacyConsent
                checked={acceptedTerms}
                onChange={setAcceptedTerms}
                error={termsError}
              />
            )}

            {/* Remember Me & Forgot Password (solo login) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 border-gray-300 rounded focus:ring-[#4ECDC4] accent-[#4ECDC4]"
                  />
                  <span className="ml-2 text-sm text-gray-600">Ricordami</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-sm font-medium disabled:opacity-50 hover:opacity-80 transition-opacity"
                  style={{ color: '#4ECDC4' }}
                >
                  Password dimenticata?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={STYLES.button}
              style={{ boxShadow: STYLES.buttonShadow }}
            >
              {isLoading
                ? (mode === 'login' ? 'Accesso in corso...' : 'Registrazione in corso...')
                : (mode === 'login' ? 'Accedi' : 'Registrati')
              }
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {mode === 'login' ? 'Non hai un account? ' : 'Hai già un account? '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                  setTermsError('');
                  setAcceptedTerms(false);
                }}
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: '#4ECDC4' }}
              >
                {mode === 'login' ? 'Registrati' : 'Accedi'}
              </button>
            </p>
          </div>

          {/* Social Login */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-sm text-gray-500">oppure continua con</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
            
            <div className="mt-4">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                Continua con Google
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6">
          {BRAND_CONFIG.copyright}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;