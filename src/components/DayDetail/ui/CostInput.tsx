import React from 'react';

interface CostInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hasSplitCost?: boolean;
  currentUserId?: string;
  costBreakdown?: Array<{ userId: string; amount: number }> | null;
  tripMembers?: Record<string, { status: string; displayName: string; avatar?: string }> | null;
  onClearBreakdown?: () => void;
}

const CostInput: React.FC<CostInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "0",
  hasSplitCost = false,
  currentUserId,
  costBreakdown,
  tripMembers,
  onClearBreakdown
}) => {
  // 🔧 FIX: Filtra breakdown per membri ATTIVI
  const getActiveBreakdown = () => {
    if (!costBreakdown || costBreakdown.length === 0 || !tripMembers) {
      return [];
    }
    
    return costBreakdown.filter(entry => {
      const member = tripMembers[entry.userId];
      return member && member.status === 'active';
    });
  };

  // 🔧 Calcola il valore effettivo da mostrare (solo membri attivi)
  const activeBreakdown = getActiveBreakdown();
  const displayValue = activeBreakdown.length > 0
    ? activeBreakdown.reduce((sum, entry) => sum + entry.amount, 0).toString()
    : '';

  // 🔧 FIX: Determina colore basato su UTENTI UNICI ATTIVI che hanno pagato
  const getBackgroundColor = () => {
    const activeBreakdown = getActiveBreakdown();
    
    // Se non c'è breakdown attivo, usa grigio normale
    if (activeBreakdown.length === 0) {
      return 'bg-gray-50';
    }

    // 🔧 Conta utenti UNICI ATTIVI che hanno pagato
    const uniquePayers = new Set(activeBreakdown.map(e => e.userId));
    const uniquePayersCount = uniquePayers.size;

    // Spesa condivisa (2+ utenti attivi diversi) → arancione
    if (uniquePayersCount > 1) {
      return 'bg-orange-50 ring-1 ring-orange-300';
    }

    // Spesa singola (1 utente attivo solo, anche con più contributi)
    const singlePayer = activeBreakdown[0].userId;
    
    if (singlePayer === currentUserId) {
      return 'bg-blue-50 ring-1 ring-blue-300'; // 🔵 Pagato interamente da ME
    } else {
      return 'bg-gray-50'; // ⚪ Pagato interamente da ALTRI
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const currentAmount = parseFloat(displayValue) || 0;
    const newAmount = parseFloat(newValue) || 0;

    // 🔧 FIX: Usa SOLO breakdown di membri ATTIVI
    const uniquePayers = new Set(activeBreakdown.map(e => e.userId));
    const uniquePayersCount = uniquePayers.size;

    // 🔧 Breakdown multi-utente (2+ utenti attivi diversi)
    const isMultiUser = uniquePayersCount > 1;
    
    // 🔧 Breakdown di altro utente attivo (1 utente attivo, non sei tu)
    const isOtherUserCost = uniquePayersCount === 1 && 
      activeBreakdown.length > 0 &&
      activeBreakdown[0].userId !== currentUserId;
    
    // 🔧 Breakdown tuo (1 utente attivo, sei tu, anche con più contributi)
    const isYourBreakdown = uniquePayersCount === 1 && 
      activeBreakdown.length > 0 &&
      activeBreakdown[0].userId === currentUserId;

    // Se è il TUO breakdown E l'importo corrisponde → stai continuando a digitare
    const isActivelyEditing = isYourBreakdown && 
      activeBreakdown.reduce((sum, e) => sum + e.amount, 0) === currentAmount;

    console.log('🔍 [CostInput] handleChange:', {
      displayValue,
      newValue,
      costBreakdown,
      activeBreakdown,
      currentUserId,
      uniquePayersCount,
      isMultiUser,
      isOtherUserCost,
      isYourBreakdown,
      isActivelyEditing
    });

    // Mostra alert SOLO se:
    // 1. Multi-utente attivo (2+ persone attive diverse), O
    // 2. Altro utente attivo singolo
    // MA NON se stai attivamente modificando il tuo breakdown
    const shouldShowAlert = (isMultiUser || isOtherUserCost) && !isActivelyEditing;

    if (shouldShowAlert && newValue !== displayValue && onClearBreakdown) {
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
        value={displayValue}
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