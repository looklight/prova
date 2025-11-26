// Servizio per tassi di cambio via Frankfurter API (BCE)
// https://frankfurter.dev

const FRANKFURTER_API = 'https://api.frankfurter.dev/v1';

// Cache in memoria per sessione
const ratesCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 ora

/**
 * Ottiene il tasso di cambio per una valuta verso EUR
 * @param {string} currencyCode - Codice valuta (es. 'USD')
 * @returns {Promise<{rate: number, date: string}>} - Tasso e data aggiornamento
 */
export async function getExchangeRate(currencyCode) {
  if (currencyCode === 'EUR') {
    return { rate: 1, date: new Date().toISOString() };
  }

  // Controlla cache
  const cached = ratesCache.get(currencyCode);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { rate: cached.rate, date: cached.date };
  }

  try {
    // Fetch da Frankfurter: quanto vale 1 [currencyCode] in EUR
    const response = await fetch(
      `${FRANKFURTER_API}/latest?base=${currencyCode}&symbols=EUR`
    );

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json();
    
    // data.rates.EUR = quanto vale 1 currencyCode in EUR
    const rate = data.rates.EUR;
    const date = data.date;

    // Salva in cache
    ratesCache.set(currencyCode, {
      rate,
      date,
      timestamp: Date.now()
    });

    return { rate, date };
  } catch (error) {
    console.error(`❌ Errore fetch tasso ${currencyCode}:`, error);
    throw error;
  }
}

/**
 * Ottiene i tassi per multiple valute in una sola chiamata
 * @param {string[]} currencyCodes - Array di codici valuta
 * @returns {Promise<Object>} - Oggetto { USD: { rate, date }, ... }
 */
export async function getMultipleExchangeRates(currencyCodes) {
  const results = {};
  const toFetch = [];

  // Controlla cache per ogni valuta
  for (const code of currencyCodes) {
    if (code === 'EUR') {
      results[code] = { rate: 1, date: new Date().toISOString() };
      continue;
    }

    const cached = ratesCache.get(code);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      results[code] = { rate: cached.rate, date: cached.date };
    } else {
      toFetch.push(code);
    }
  }

  // Fetch quelle non in cache (in parallelo)
  if (toFetch.length > 0) {
    const fetchPromises = toFetch.map(async (code) => {
      try {
        const { rate, date } = await getExchangeRate(code);
        results[code] = { rate, date };
      } catch {
        // Se fallisce, non aggiungiamo al risultato
        console.warn(`⚠️ Impossibile ottenere tasso per ${code}`);
      }
    });

    await Promise.all(fetchPromises);
  }

  return results;
}

/**
 * Converte un importo da una valuta a EUR
 * @param {number} amount - Importo nella valuta originale
 * @param {number} rate - Tasso di cambio (1 valuta = X EUR)
 * @returns {number} - Importo in EUR arrotondato a 2 decimali
 */
export function convertToEUR(amount, rate) {
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Formatta un tasso per display
 * @param {number} rate - Tasso di cambio
 * @param {string} currencyCode - Codice valuta
 * @returns {string} - Es. "1 USD = 0.92 EUR"
 */
export function formatRate(rate, currencyCode) {
  // Mostra più decimali per valute "deboli" (es. JPY, THB)
  const decimals = rate < 0.01 ? 5 : rate < 0.1 ? 4 : rate < 1 ? 3 : 2;
  return `1 ${currencyCode} = ${rate.toFixed(decimals)} EUR`;
}

/**
 * Pulisce la cache (utile per test o force refresh)
 */
export function clearRatesCache() {
  ratesCache.clear();
}