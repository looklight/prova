import React from 'react';

interface CostInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hasSplitCost?: boolean;
  currentUserId?: string;
  costBreakdown?: Array<{ userId: string; amount: number }> | null;
  onClearBreakdown?: () => void;
}

const CostInput: React.FC<CostInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "0",
  hasSplitCost = false,
  currentUserId,
  costBreakdown,
  onClearBreakdown
}) => {
  // 🔧 FIX: Determina colore basato su UTENTI UNICI che hanno pagato
  const getBackgroundColor = () => {
    // Se non c'è breakdown, usa grigio normale
    if (!costBreakdown || costBreakdown.length === 0) {
      return 'bg-gray-50';
    }

    // 🔧 FIX: Conta utenti UNICI che hanno pagato
    const uniquePayers = new Set(costBreakdown.map(e => e.userId));
    const uniquePayersCount = uniquePayers.size;

    // Spesa condivisa (2+ utenti diversi) → arancione
    if (uniquePayersCount > 1) {
      return 'bg-orange-50 ring-1 ring-orange-300';
    }

    // Spesa singola (1 utente solo, anche con più contributi)
    const singlePayer = costBreakdown[0].userId;
    
    if (singlePayer === currentUserId) {
      return 'bg-blue-50 ring-1 ring-blue-300'; // 🔵 Pagato interamente da ME
    } else {
      return 'bg-gray-50'; // ⚪ Pagato interamente da ALTRI
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const currentAmount = parseFloat(value) || 0;
    const newAmount = parseFloat(newValue) || 0;

    // 🔧 FIX: Logica basata su UTENTI UNICI
    const uniquePayers = costBreakdown ? new Set(costBreakdown.map(e => e.userId)) : new Set();
    const uniquePayersCount = uniquePayers.size;

    // 🔧 Breakdown multi-utente (2+ utenti diversi)
    const isMultiUser = uniquePayersCount > 1;
    
    // 🔧 Breakdown di altro utente (1 utente, non sei tu)
    const isOtherUserCost = uniquePayersCount === 1 && 
      costBreakdown && 
      costBreakdown.length > 0 &&
      costBreakdown[0].userId !== currentUserId;
    
    // 🔧 Breakdown tuo (1 utente, sei tu, anche con più contributi)
    const isYourBreakdown = uniquePayersCount === 1 && 
      costBreakdown && 
      costBreakdown.length > 0 &&
      costBreakdown[0].userId === currentUserId;

    // Se è il TUO breakdown E l'importo corrisponde → stai continuando a digitare
    const isActivelyEditing = isYourBreakdown && 
      costBreakdown.reduce((sum, e) => sum + e.amount, 0) === currentAmount;

    console.log('🔍 [CostInput] handleChange:', {
      currentValue: value,
      newValue,
      costBreakdown,
      currentUserId,
      uniquePayersCount,
      isMultiUser,
      isOtherUserCost,
      isYourBreakdown,
      isActivelyEditing
    });

    // Mostra alert SOLO se:
    // 1. Multi-utente (2+ persone diverse), O
    // 2. Altro utente singolo
    // MA NON se stai attivamente modificando il tuo breakdown
    const shouldShowAlert = (isMultiUser || isOtherUserCost) && !isActivelyEditing;

    if (shouldShowAlert && newValue !== value && onClearBreakdown) {
      console.log('⚠️ [CostInput] Showing alert');
      const confirmed = window.confirm(
        'Sovrascrivendo il costo, la ripartizione verrà cancellata.\n\n' +
        'Per aggiungere contributi, usa \'Gestisci spesa\'.\n\n' +
        'Vuoi continuare?'
      );

      if (confirmed) {
        onClearBreakdown();
        onChange(e);
      }
    } else {
      console.log('✅ [CostInput] Normal onChange');
      onChange(e);
    }
  };

  return (
    <div className="relative" style={{ width: '90px' }}>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 pr-7 border rounded-full text-sm text-center ${getBackgroundColor()}`}
        onWheel={(e) => e.currentTarget.blur()}
      />
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
        €
      </span>
    </div>
  );
};

export default CostInput;