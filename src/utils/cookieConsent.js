/**
 * 🍪 Cookie Consent Utility
 * 
 * Helper functions per gestire il consenso cookie GDPR-compliant
 */

/**
 * Ottieni il consenso cookie corrente
 * @returns {'all' | 'essential' | null}
 */
export const getCookieConsent = () => {
  const consent = localStorage.getItem('cookieConsent');
  if (consent === 'all' || consent === 'essential') {
    return consent;
  }
  return null;
};

/**
 * Verifica se l'utente ha già espresso una preferenza
 * @returns {boolean}
 */
export const hasConsentDecision = () => {
  return getCookieConsent() !== null;
};

/**
 * Verifica se i cookie analitici sono consentiti
 * @returns {boolean}
 */
export const isAnalyticsAllowed = () => {
  return getCookieConsent() === 'all';
};

/**
 * Salva il consenso cookie
 * @param {'all' | 'essential'} consent
 */
export const saveCookieConsent = (consent) => {
  localStorage.setItem('cookieConsent', consent);
  localStorage.setItem('cookieConsentDate', new Date().toISOString());
};

/**
 * Resetta il consenso (per testing o cambio preferenze)
 */
export const resetCookieConsent = () => {
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookieConsentDate');
};

/**
 * Ottieni la data di consenso
 * @returns {Date | null}
 */
export const getConsentDate = () => {
  const dateStr = localStorage.getItem('cookieConsentDate');
  if (dateStr) {
    return new Date(dateStr);
  }
  return null;
};

/**
 * Verifica se il consenso è scaduto (dopo 12 mesi)
 * Secondo GDPR, consenso dovrebbe essere richiesto periodicamente
 * @returns {boolean}
 */
export const isConsentExpired = () => {
  const consentDate = getConsentDate();
  if (!consentDate) return true;
  
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  
  return consentDate < twelveMonthsAgo;
};