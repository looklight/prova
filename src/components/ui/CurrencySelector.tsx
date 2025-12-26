import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Search, Loader2, Pencil } from 'lucide-react';
import { searchCurrencies } from '../../utils/currencyData';
import { getExchangeRate } from '../../services/currencyService';

/**
 * Componente per gestire le valute preferite del viaggio
 * Mostra EUR come valuta base (non removibile) + altre valute aggiuntive
 */
const CurrencySelector = ({ preferredCurrencies = {}, onChange }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCurrency, setLoadingCurrency] = useState(null);
  const [error, setError] = useState(null);

  // Stati per valuta personalizzata
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRate, setCustomRate] = useState('');

  const searchRef = useRef(null);
  const customCodeRef = useRef(null);

  // Chiudi ricerca quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        resetAndClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus sull'input quando si apre la ricerca
  useEffect(() => {
    if (showSearch && !showCustomForm && searchRef.current) {
      const input = searchRef.current.querySelector('input[type="text"]');
      if (input) input.focus();
    }
  }, [showSearch, showCustomForm]);

  // Focus sul campo codice quando si apre il form personalizzato
  useEffect(() => {
    if (showCustomForm && customCodeRef.current) {
      customCodeRef.current.focus();
    }
  }, [showCustomForm]);

  const resetAndClose = () => {
    setShowSearch(false);
    setShowCustomForm(false);
    setSearchQuery('');
    setCustomCode('');
    setCustomName('');
    setCustomRate('');
    setError(null);
  };

  // Filtra valute già aggiunte e cerca (escludi EUR)
  const getFilteredCurrencies = () => {
    const addedCodes = [...Object.keys(preferredCurrencies), 'EUR'];
    const searchResults = searchCurrencies(searchQuery);
    return searchResults.filter(c => !addedCodes.includes(c.code));
  };

  const filteredCurrencies = getFilteredCurrencies();

  // Aggiungi valuta dalla lista
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

      resetAndClose();
    } catch (err) {
      setError(`Impossibile aggiungere ${currency.name}`);
    } finally {
      setLoadingCurrency(null);
    }
  };

  // Aggiungi valuta personalizzata
  const handleAddCustomCurrency = () => {
    const code = customCode.toUpperCase().trim();
    const name = customName.trim();
    const rate = parseFloat(customRate);

    if (!code || code.length < 2 || code.length > 5) {
      setError('Codice non valido (2-5 caratteri)');
      return;
    }
    if (!name) {
      setError('Nome richiesto');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      setError('Tasso non valido');
      return;
    }
    if (preferredCurrencies[code] || code === 'EUR') {
      setError('Valuta già presente');
      return;
    }

    const newCurrency = {
      code,
      name,
      symbol: code,
      flag: '🏷️',
      rate,
      lastUpdated: new Date().toISOString().split('T')[0],
      isCustom: true
    };

    onChange({
      ...preferredCurrencies,
      [code]: newCurrency
    });

    resetAndClose();
  };

  // Rimuovi valuta
  const handleRemoveCurrency = (code) => {
    const updated = { ...preferredCurrencies };
    delete updated[code];
    onChange(updated);
  };

  const currencyList = Object.values(preferredCurrencies);
  const isCustomFormValid = customCode.trim().length >= 2 && customName.trim() && customRate;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* EUR - valuta base, sempre visibile, non removibile */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
        <span className="text-sm">🇪🇺</span>
        <span className="text-sm font-medium text-blue-800">EUR</span>
      </div>

      {/* Altre valute aggiunte */}
      {currencyList.map((currency) => (
        <div
          key={currency.code}
          className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-gray-100 border border-gray-200 rounded-full group"
        >
          <span className="text-sm">{currency.flag}</span>
          <span className="text-sm font-medium text-gray-700">{currency.code}</span>
          <button
            type="button"
            onClick={() => handleRemoveCurrency(currency.code)}
            className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title={`Rimuovi ${currency.name}`}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* Pulsante aggiungi / Campo ricerca */}
      {!showSearch ? (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-dashed border-gray-300 rounded-full transition-colors"
        >
          <Plus size={14} />
          <span className="text-sm">Aggiungi</span>
        </button>
      ) : (
        <div ref={searchRef} className="relative">
          {!showCustomForm ? (
            <>
              {/* Campo ricerca */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setError(null);
                  }}
                  placeholder="Cerca valuta..."
                  className="w-40 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-full focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {/* Dropdown risultati */}
              <div className="absolute z-20 left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {/* Opzione personalizzata - sempre in cima */}
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left text-gray-600"
                >
                  <Pencil size={14} className="text-gray-400" />
                  <span className="text-sm">Valuta personalizzata...</span>
                </button>

                {/* Separatore */}
                {filteredCurrencies.length > 0 && (
                  <div className="border-t border-gray-100 my-1" />
                )}

                {/* Lista valute */}
                {filteredCurrencies.slice(0, 6).map((currency) => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => handleAddCurrency(currency)}
                    disabled={loadingCurrency === currency.code}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                  >
                    {loadingCurrency === currency.code ? (
                      <Loader2 size={16} className="animate-spin text-gray-500" />
                    ) : (
                      <span>{currency.flag}</span>
                    )}
                    <span className="text-sm text-gray-800">{currency.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{currency.code}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Form valuta personalizzata */
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => setShowCustomForm(false)}
              />
              {/* Modal */}
              <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Valuta personalizzata</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Se non la trovi tra quelle disponibili
                </p>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="w-[60%]">
                      <label className="block text-xs text-gray-500 mb-1">Nome valuta</label>
                      <input
                        ref={customCodeRef}
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="es. Bitcoin"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div className="w-[40%]">
                      <label className="block text-xs text-gray-500 mb-1">Codice</label>
                      <input
                        type="text"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value.toUpperCase().slice(0, 5))}
                        placeholder="es. BTC"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-400 focus:outline-none"
                        maxLength={5}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm text-gray-500 shrink-0">1 EUR =</span>
                    <div className="flex-1 min-w-0 relative">
                      <input
                        type="number"
                        value={customRate}
                        onChange={(e) => setCustomRate(e.target.value)}
                        placeholder="0.00"
                        step="any"
                        min="0"
                        className="w-full px-3 py-2 pr-12 text-sm border border-gray-200 rounded-md focus:border-blue-400 focus:outline-none"
                      />
                      {customCode && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                          {customCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="mt-2 text-xs text-red-500">{error}</p>
                )}

                <button
                  type="button"
                  onClick={handleAddCustomCurrency}
                  disabled={!isCustomFormValid}
                  className="w-full mt-3 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  Aggiungi
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Errore globale */}
      {error && !showCustomForm && (
        <p className="w-full text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default CurrencySelector;
