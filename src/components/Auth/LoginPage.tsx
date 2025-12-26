import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, MapPin, AlertCircle } from 'lucide-react';

// Costanti per evitare duplicazioni
const BRAND_CONFIG = {
  name: 'I Miei Viaggi',
  subtitle: 'Accedi per gestire i tuoi viaggi',
  copyright: '© 2025 Tutti i diritti riservati.'
};

const DEMO_CREDENTIALS = {
  email: 'demo@esempio.com',
  password: 'demo123'
};

const STYLES = {
  input: "w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  inputWithRightIcon: "w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  button: "w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold text-base hover:from-blue-600 hover:to-purple-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all",
  iconLeft: "absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400",
  iconRight: "absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600",
  label: "block text-sm font-medium text-gray-700 mb-2"
};

// Componente Logo riutilizzabile
const BrandLogo = () => (
  <div className="inline-block p-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mb-4">
    <MapPin size={40} className="text-white" />
  </div>
);

// Componente Alert riutilizzabile
const Alert = ({ type, children }) => {
  const colors = {
    error: 'bg-red-50 border-red-200 text-red-600',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  return (
    <div className={`mb-6 p-4 border rounded-xl flex items-start gap-3 ${colors[type]}`}>
      {type === 'error' && <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />}
      <div className="flex-1">{children}</div>
    </div>
  );
};

// Componente InputField riutilizzabile
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

// Componente GoogleIcon separato
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!email || !password) {
      setError('Inserisci email e password');
      return false;
    }
    if (!email.includes('@')) {
      setError('Inserisci un\'email valida');
      return false;
    }
    return true;
  };

  const handleLogin = async (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          resolve();
        } else {
          reject();
        }
      }, 1500);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      await handleLogin(email, password);
      alert(`Login effettuato con successo! 🎉\n\nCredenziali demo:\nemail: ${DEMO_CREDENTIALS.email}\npassword: ${DEMO_CREDENTIALS.password}`);
    } catch (err) {
      setError('Email o password non corretti');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <BrandLogo />
            <h1 className="text-3xl font-bold text-gray-800">{BRAND_CONFIG.name}</h1>
            <p className="text-gray-500 mt-2">{BRAND_CONFIG.subtitle}</p>
          </div>

          {/* Demo Credentials Info */}
          <Alert type="info">
            <p className="text-blue-800 text-sm font-medium">Demo:</p>
            <p className="text-blue-700 text-xs mt-1">email: {DEMO_CREDENTIALS.email}</p>
            <p className="text-blue-700 text-xs">password: {DEMO_CREDENTIALS.password}</p>
          </Alert>

          {/* Error Message */}
          {error && (
            <Alert type="error">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Form */}
          <div className="space-y-5">
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
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Ricordami</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Funzione recupero password')}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                Password dimenticata?
              </button>
            </div>

            {/* Login Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={STYLES.button}
            >
              {isLoading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Non hai un account?{' '}
              <button
                onClick={() => alert('Funzione registrazione')}
                className="text-blue-500 hover:text-blue-600 font-semibold"
              >
                Registrati
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
                onClick={() => alert('Login con Google')}
                className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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

export default LoginPage;