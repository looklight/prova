import React from 'react';
import { AlertCircle } from 'lucide-react';

interface PrivacyConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

/**
 * 📋 Checkbox consenso Privacy Policy e Terms of Service
 * 
 * GDPR-compliant:
 * - NON pre-checked (utente deve accettare esplicitamente)
 * - Link cliccabili a documenti
 * - Errore visibile se non accettato
 */
const PrivacyConsent: React.FC<PrivacyConsentProps> = ({ checked, onChange, error }) => {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500 mt-0.5 flex-shrink-0"
        />
        <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
          Accetto la{' '}
          <a 
            href="/privacy" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline font-medium"
            onClick={(e) => e.stopPropagation()} // Previene toggle checkbox quando clicchi link
          >
            Privacy Policy
          </a>
          {' '}e i{' '}
          <a 
            href="/terms" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            Termini di Servizio
          </a>
        </span>
      </label>

      {/* Messaggio errore */}
      {error && (
        <div className="mt-2 flex items-start gap-2 text-red-600">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  );
};

export default PrivacyConsent;