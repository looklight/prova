// Lista valute supportate da Frankfurter (BCE)
// 31 valute con nomi italiani, simboli e bandiere

export const currencies = {
  AUD: {
    code: 'AUD',
    name: 'Dollaro Australiano',
    symbol: '$',
    flag: '🇦🇺',
    keywords: ['australia', 'australiano', 'aud', 'dollaro']
  },
  BGN: {
    code: 'BGN',
    name: 'Lev Bulgaro',
    symbol: 'лв',
    flag: '🇧🇬',
    keywords: ['bulgaria', 'bulgaro', 'lev', 'bgn']
  },
  BRL: {
    code: 'BRL',
    name: 'Real Brasiliano',
    symbol: 'R$',
    flag: '🇧🇷',
    keywords: ['brasile', 'brasiliano', 'real', 'brl']
  },
  CAD: {
    code: 'CAD',
    name: 'Dollaro Canadese',
    symbol: '$',
    flag: '🇨🇦',
    keywords: ['canada', 'canadese', 'cad', 'dollaro']
  },
  CHF: {
    code: 'CHF',
    name: 'Franco Svizzero',
    symbol: 'Fr',
    flag: '🇨🇭',
    keywords: ['svizzera', 'svizzero', 'franco', 'chf']
  },
  CNY: {
    code: 'CNY',
    name: 'Yuan Cinese',
    symbol: '¥',
    flag: '🇨🇳',
    keywords: ['cina', 'cinese', 'yuan', 'renminbi', 'cny']
  },
  CZK: {
    code: 'CZK',
    name: 'Corona Ceca',
    symbol: 'Kč',
    flag: '🇨🇿',
    keywords: ['cechia', 'ceca', 'corona', 'czk', 'praga']
  },
  DKK: {
    code: 'DKK',
    name: 'Corona Danese',
    symbol: 'kr',
    flag: '🇩🇰',
    keywords: ['danimarca', 'danese', 'corona', 'dkk']
  },
  GBP: {
    code: 'GBP',
    name: 'Sterlina Britannica',
    symbol: '£',
    flag: '🇬🇧',
    keywords: ['regno unito', 'britannica', 'sterlina', 'gbp', 'uk', 'inghilterra', 'londra']
  },
  HKD: {
    code: 'HKD',
    name: 'Dollaro di Hong Kong',
    symbol: '$',
    flag: '🇭🇰',
    keywords: ['hong kong', 'hkd', 'dollaro']
  },
  HUF: {
    code: 'HUF',
    name: 'Fiorino Ungherese',
    symbol: 'Ft',
    flag: '🇭🇺',
    keywords: ['ungheria', 'ungherese', 'fiorino', 'huf', 'budapest']
  },
  IDR: {
    code: 'IDR',
    name: 'Rupia Indonesiana',
    symbol: 'Rp',
    flag: '🇮🇩',
    keywords: ['indonesia', 'indonesiana', 'rupia', 'idr', 'bali']
  },
  ILS: {
    code: 'ILS',
    name: 'Nuovo Shekel Israeliano',
    symbol: '₪',
    flag: '🇮🇱',
    keywords: ['israele', 'israeliano', 'shekel', 'ils']
  },
  INR: {
    code: 'INR',
    name: 'Rupia Indiana',
    symbol: '₹',
    flag: '🇮🇳',
    keywords: ['india', 'indiana', 'rupia', 'inr']
  },
  ISK: {
    code: 'ISK',
    name: 'Corona Islandese',
    symbol: 'kr',
    flag: '🇮🇸',
    keywords: ['islanda', 'islandese', 'corona', 'isk']
  },
  JPY: {
    code: 'JPY',
    name: 'Yen Giapponese',
    symbol: '¥',
    flag: '🇯🇵',
    keywords: ['giappone', 'giapponese', 'yen', 'jpy', 'tokyo']
  },
  KRW: {
    code: 'KRW',
    name: 'Won Sudcoreano',
    symbol: '₩',
    flag: '🇰🇷',
    keywords: ['corea', 'sudcoreano', 'won', 'krw', 'seoul']
  },
  MXN: {
    code: 'MXN',
    name: 'Peso Messicano',
    symbol: '$',
    flag: '🇲🇽',
    keywords: ['messico', 'messicano', 'peso', 'mxn']
  },
  MYR: {
    code: 'MYR',
    name: 'Ringgit Malese',
    symbol: 'RM',
    flag: '🇲🇾',
    keywords: ['malesia', 'malese', 'ringgit', 'myr']
  },
  NOK: {
    code: 'NOK',
    name: 'Corona Norvegese',
    symbol: 'kr',
    flag: '🇳🇴',
    keywords: ['norvegia', 'norvegese', 'corona', 'nok']
  },
  NZD: {
    code: 'NZD',
    name: 'Dollaro Neozelandese',
    symbol: '$',
    flag: '🇳🇿',
    keywords: ['nuova zelanda', 'neozelandese', 'nzd', 'dollaro']
  },
  PHP: {
    code: 'PHP',
    name: 'Peso Filippino',
    symbol: '₱',
    flag: '🇵🇭',
    keywords: ['filippine', 'filippino', 'peso', 'php']
  },
  PLN: {
    code: 'PLN',
    name: 'Zloty Polacco',
    symbol: 'zł',
    flag: '🇵🇱',
    keywords: ['polonia', 'polacco', 'zloty', 'pln']
  },
  RON: {
    code: 'RON',
    name: 'Leu Rumeno',
    symbol: 'lei',
    flag: '🇷🇴',
    keywords: ['romania', 'rumeno', 'leu', 'ron']
  },
  SEK: {
    code: 'SEK',
    name: 'Corona Svedese',
    symbol: 'kr',
    flag: '🇸🇪',
    keywords: ['svezia', 'svedese', 'corona', 'sek']
  },
  SGD: {
    code: 'SGD',
    name: 'Dollaro di Singapore',
    symbol: '$',
    flag: '🇸🇬',
    keywords: ['singapore', 'sgd', 'dollaro']
  },
  THB: {
    code: 'THB',
    name: 'Baht Thailandese',
    symbol: '฿',
    flag: '🇹🇭',
    keywords: ['thailandia', 'thailandese', 'baht', 'thb', 'bangkok']
  },
  TRY: {
    code: 'TRY',
    name: 'Lira Turca',
    symbol: '₺',
    flag: '🇹🇷',
    keywords: ['turchia', 'turca', 'lira', 'try', 'istanbul']
  },
  USD: {
    code: 'USD',
    name: 'Dollaro USA',
    symbol: '$',
    flag: '🇺🇸',
    keywords: ['usa', 'stati uniti', 'americano', 'dollaro', 'usd', 'america']
  },
  ZAR: {
    code: 'ZAR',
    name: 'Rand Sudafricano',
    symbol: 'R',
    flag: '🇿🇦',
    keywords: ['sudafrica', 'sudafricano', 'rand', 'zar']
  }
};

// Valuta base (non selezionabile come preferita)
export const BASE_CURRENCY = {
  code: 'EUR',
  name: 'Euro',
  symbol: '€',
  flag: '🇪🇺'
};

/**
 * Cerca valute per query (nome, codice, keyword)
 * @param {string} query - Testo di ricerca
 * @returns {Array} - Array di valute matchate
 */
export function searchCurrencies(query) {
  if (!query || query.trim().length === 0) {
    // Ritorna le più comuni se nessuna query
    return ['USD', 'GBP', 'CHF', 'JPY', 'AUD', 'THB'].map(code => currencies[code]);
  }

  const normalizedQuery = query.toLowerCase().trim();

  return Object.values(currencies)
    .filter(currency => {
      // Match su codice
      if (currency.code.toLowerCase().includes(normalizedQuery)) return true;
      // Match su nome
      if (currency.name.toLowerCase().includes(normalizedQuery)) return true;
      // Match su keywords
      if (currency.keywords.some(kw => kw.includes(normalizedQuery))) return true;
      return false;
    })
    .slice(0, 8); // Max 8 risultati
}

/**
 * Ottiene una valuta per codice
 * @param {string} code - Codice valuta (es. 'USD')
 * @returns {Object|null} - Oggetto valuta o null
 */
export function getCurrencyByCode(code) {
  return currencies[code] || null;
}