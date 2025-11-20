import React, { useState, useEffect } from 'react';
import { X, Cookie, Settings } from 'lucide-react';

interface CookieBannerProps {
  onAccept?: () => void;
  onReject?: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onReject }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Controlla se l'utente ha già espresso una preferenza
    const consent = localStorage.getItem('cookieConsent');
    
    if (!consent) {
      // Mostra banner dopo un piccolo delay per UX migliore
      setTimeout(() => {
        setIsVisible(true);
      }, 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setIsVisible(false);
    
    // Inizializza analytics (se non già fatto)
    if (onAccept) onAccept();
    
    console.log('✅ Cookie accettati: essenziali + analitici');
  };

  const handleRejectAnalytics = () => {
    localStorage.setItem('cookieConsent', 'essential');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setIsVisible(false);
    
    // Blocca analytics
    if (onReject) onReject();
    
    console.log('✅ Cookie accettati: solo essenziali');
  };

  const handleSavePreferences = (analytics: boolean) => {
    const consent = analytics ? 'all' : 'essential';
    localStorage.setItem('cookieConsent', consent);
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setIsVisible(false);
    
    if (analytics && onAccept) {
      onAccept();
    } else if (!analytics && onReject) {
      onReject();
    }
    
    console.log(`✅ Preferenze salvate: ${consent}`);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" />

      {/* Banner */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 max-w-7xl mx-auto">
        <div className="p-6">
          {!showDetails ? (
            // ========== VISTA SEMPLICE ==========
            <div>
              <div className="flex items-start gap-4">
                {/* Icona */}
                <div className="flex-shrink-0">
                  <Cookie size={32} className="text-blue-500" />
                </div>

                {/* Contenuto */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    🍪 Utilizziamo i Cookie
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Utilizziamo cookie essenziali per il funzionamento dell'app e cookie analitici 
                    (opzionali) per migliorare l'esperienza utente. Puoi scegliere quali accettare.
                  </p>

                  {/* Bottoni */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleAcceptAll}
                      className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors shadow-md"
                    >
                      Accetta tutti
                    </button>
                    
                    <button
                      onClick={handleRejectAnalytics}
                      className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Solo essenziali
                    </button>
                    
                    <button
                      onClick={() => setShowDetails(true)}
                      className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Settings size={18} />
                      Preferenze
                    </button>
                  </div>

                  {/* Link policy */}
                  <p className="text-xs text-gray-500 mt-3">
                    Maggiori informazioni nella{' '}
                    <a href="/cookies" className="text-blue-500 hover:underline">Cookie Policy</a>
                    {' '}e nella{' '}
                    <a href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</a>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // ========== VISTA DETTAGLIATA ==========
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  ⚙️ Preferenze Cookie
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Cookie Essenziali */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">Cookie Essenziali</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Sempre attivi
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Necessari per il funzionamento dell'app (login, sessioni, sicurezza). 
                    Non possono essere disattivati.
                  </p>
                </div>

                {/* Cookie Analitici */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">Cookie Analitici</h4>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="analytics-toggle"
                        defaultChecked={true}
                        className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Accetta</span>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Ci aiutano a capire come viene usata l'app per migliorarla. 
                    Dati raccolti: pagine visitate, tempo di utilizzo (anonimi).
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Provider: Google Analytics (Firebase)
                  </p>
                </div>
              </div>

              {/* Bottoni salvataggio */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const analyticsCheckbox = document.getElementById('analytics-toggle') as HTMLInputElement;
                    handleSavePreferences(analyticsCheckbox?.checked || false);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors shadow-md"
                >
                  Salva preferenze
                </button>
                
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CookieBanner;