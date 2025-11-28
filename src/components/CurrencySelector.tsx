import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Loader2, RefreshCw, HelpCircle } from 'lucide-react';
import { currencies, searchCurrencies, getCurrencyByCode } from '../utils/currencyData';
import { getExchangeRate, formatRate } from '../services/currencyService';

/**
 * @typedef {Object} PreferredCurrency
 * @property {string} code - Codice valuta (es. 'USD')
 * @property {string} name - Nome valuta
 * @property {string} symbol - Simbolo valuta
 * @property {string} flag - Emoji bandiera
 * @property {number} rate - Tasso di cambio verso EUR
 * @property {string} lastUpdated - Data ultimo aggiornamento
 */

/**
 * Componente per gestire le valute preferite del viaggio
 * @param {Object} props
 * @param {Object.<string, PreferredCurrency>} props.preferredCurrencies - Valute già aggiunte
 * @param {function} props.onChange - Callback quando cambiano le valute
 * @param {boolean} props.showHelp - Se mostrare l'help box
 * @param {function} props.onToggleHelp - Callback per toggle help
 */
const CurrencySelector = ({ preferredCurrencies = {}, onChange, showHelp = false, onToggleHelp }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCurrency, setLoadingCurrency] = useState(null);
  const [error, setError] = useState(null);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra valute già aggiunte e cerca
  const getFilteredCurrencies = () => {
    const addedCodes = Object.keys(preferredCurrencies);
    const searchResults = searchCurrencies(searchQuery);
    return searchResults.filter(c => !addedCodes.includes(c.code));
  };

  const filteredCurrencies = getFilteredCurrencies();

  // Aggiungi valuta
  const handleAddCurrency = async (currency) => {
    setLoadingCurrency(currency.code);
    setError(null);

    try {
      const { rate, date } = await getExchangeRate(currency.code);
      
      const newCurrency = {
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        flag: currency.flag,
        rate: rate,
        lastUpdated: date
      };

      onChange({
        ...preferredCurrencies,
        [currency.code]: newCurrency
      });

      setSearchQuery('');
      setShowDropdown(false);
    } catch (err) {
      setError(`Impossibile ottenere il tasso per ${currency.name}`);
    } finally {
      setLoadingCurrency(null);
    }
  };

  // Rimuovi valuta
  const handleRemoveCurrency = (code) => {
    const updated = { ...preferredCurrencies };
    delete updated[code];
    onChange(updated);
  };

  // Aggiorna tasso singola valuta
  const handleRefreshRate = async (code) => {
    setLoadingCurrency(code);
    setError(null);

    try {
      const { rate, date } = await getExchangeRate(code);
      
      onChange({
        ...preferredCurrencies,
        [code]: {
          ...preferredCurrencies[code],
          rate: rate,
          lastUpdated: date
        }
      });
    } catch (err) {
      setError(`Impossibile aggiornare il tasso per ${code}`);
    } finally {
      setLoadingCurrency(null);
    }
  };

  const currencyList = Object.values(preferredCurrencies);

  return (
    <div>
      <div className="flex items-center gap-1 mb-3">
        <label className="text-sm font-semibold text-gray-700">
          💱 Valute del viaggio
        </label>
        {onToggleHelp && (
          <button
            type="button"
            onClick={onToggleHelp}
            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
            title="Aiuto"
          >
            <HelpCircle size={16} />
          </button>
        )}
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-200">
        
        {/* Lista valute aggiunte */}
        {currencyList.length > 0 && (
          <div className="space-y-2 mb-4">
            {currencyList.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currency.flag}</span>
                  <span className="font-medium text-gray-800">{currency.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatRate(currency.rate, currency.code)}
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleRefreshRate(currency.code)}
                    disabled={loadingCurrency === currency.code}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Aggiorna tasso"
                  >
                    {loadingCurrency === currency.code ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveCurrency(currency.code)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Rimuovi valuta"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input ricerca */}
        <div className="relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                setError(null);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Aggiungi valuta..."
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-amber-400 focus:outline-none transition-colors text-sm bg-white"
            />
          </div>

          {/* Dropdown suggerimenti */}
          {showDropdown && filteredCurrencies.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              {filteredCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => handleAddCurrency(currency)}
                  disabled={loadingCurrency === currency.code}
                  className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-amber-50 transition-colors text-left disabled:opacity-50"
                >
                  {loadingCurrency === currency.code ? (
                    <Loader2 size={18} className="animate-spin text-amber-500" />
                  ) : (
                    <span className="text-lg">{currency.flag}</span>
                  )}
                  <span className="font-medium text-gray-800">{currency.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{currency.code}</span>
                </button>
              ))}
            </div>
          )}

          {/* Messaggio nessun risultato */}
          {showDropdown && searchQuery && filteredCurrencies.length === 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg p-3"
            >
              <p className="text-sm text-gray-500 text-center">
                Nessuna valuta trovata per "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Errore */}
        {error && (
          <p className="mt-2 text-xs text-red-500">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Help box - SOTTO il box principale */}
      {showHelp && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-gray-600 leading-relaxed">
            💡 Aggiungi le valute locali per convertire facilmente in Euro le spese durante il viaggio. 
            I tassi vengono aggiornati automaticamente dalla BCE.
          </p>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;