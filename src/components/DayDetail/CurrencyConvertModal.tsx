import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { getExchangeRate } from '../../services/currencyService';

interface PreferredCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number;
  lastUpdated: string;
}

interface CurrencyConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAmountChange: (amountInEUR: number) => void;
  preferredCurrencies: Record<string, PreferredCurrency>;
}

const CurrencyConvertModal: React.FC<CurrencyConvertModalProps> = ({
  isOpen,
  onClose,
  onAmountChange,
  preferredCurrencies = {}
}) => {
  const currencyList = Object.values(preferredCurrencies);

  const [selectedCurrency, setSelectedCurrency] = useState<PreferredCurrency | null>(null);
  const [amount, setAmount] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Formatta numero con separatore migliaia (')
  const formatWithThousands = (num: number): string => {
    const parts = num.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return parts.join('.');
  };

  // Reset e focus quando si apre
  useEffect(() => {
    if (isOpen) {
      const firstCurrency = currencyList.length > 0 ? currencyList[0] : null;
      setSelectedCurrency(firstCurrency);
      setCustomRate(firstCurrency?.rate?.toString() || '');
      setAmount('');

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Aggiorna rate quando cambia valuta
  useEffect(() => {
    if (selectedCurrency) {
      setCustomRate(selectedCurrency.rate.toString());
    }
  }, [selectedCurrency]);

  // Conversione live
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    const numRate = parseFloat(customRate) || 0;
    const converted = Math.round(numAmount * numRate * 100) / 100;
    onAmountChange(converted);
  }, [amount, customRate]);

  // Chiudi con Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleRefreshRate = async () => {
    if (!selectedCurrency) return;

    setIsRefreshing(true);
    try {
      const { rate } = await getExchangeRate(selectedCurrency.code);
      setCustomRate(rate.toString());
    } catch (err) {
      console.error('Errore aggiornamento tasso:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    const currency = preferredCurrencies[code];
    if (currency) {
      setSelectedCurrency(currency);
    }
  };

  if (!isOpen || currencyList.length === 0) return null;

  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(customRate) || 0;
  const convertedAmount = Math.round(numAmount * numRate * 100) / 100;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header compatto */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800">💱 Converti</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content - 3 righe */}
        <div className="p-4 space-y-3">

          {/* Riga 1: Input importo + Valuta */}
          <div className="flex items-center gap-2">
            {/* Input importo */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-base font-semibold focus:border-amber-400 focus:outline-none"
                onWheel={(e) => e.currentTarget.blur()}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">
                {selectedCurrency?.symbol}
              </span>
            </div>

            {/* Selezione valuta compatta */}
            {currencyList.length > 1 ? (
              <select
                value={selectedCurrency?.code || ''}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="px-2 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {currencyList.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-base">{selectedCurrency?.flag}</span>
                <span className="text-sm font-medium text-gray-700">{selectedCurrency?.code}</span>
              </div>
            )}
          </div>

          {/* Riga 2: Tasso di cambio */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">1 {selectedCurrency?.code} =</span>
            <input
              type="number"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              step="0.0001"
              className="w-20 px-2 py-1.5 border border-gray-200 rounded text-center text-sm focus:border-amber-400 focus:outline-none"
              onWheel={(e) => e.currentTarget.blur()}
            />
            <span className="text-gray-500">EUR</span>
            <button
              onClick={handleRefreshRate}
              disabled={isRefreshing}
              className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors ml-auto"
              title="Aggiorna tasso"
            >
              {isRefreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
          </div>

          {/* Riga 3: Risultato + Conferma */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex-1 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-4 py-2.5 border border-green-100">
              {numAmount >= 1000 && (
                <div className="text-xs text-gray-400 mb-0.5">
                  {formatWithThousands(numAmount).split('.')[0]} {selectedCurrency?.symbol} =
                </div>
              )}
              <span className={`text-lg font-bold ${numAmount > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                {numAmount > 0 ? formatWithThousands(convertedAmount) : '0.00'} €
              </span>
            </div>
            <button
              onClick={onClose}
              disabled={numAmount <= 0}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Conferma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConvertModal;