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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const currentAmount = parseFloat(value) || 0;
    const newAmount = parseFloat(newValue) || 0;
    
    // 🆕 DEBUG: Log per capire cosa succede
    console.log('🔍 [CostInput] handleChange:', {
      currentValue: value,
      newValue,
      costBreakdown,
      currentUserId,
      hasSplitCost
    });
    
    // Verifica breakdown
    const isMultiUser = costBreakdown && costBreakdown.length > 1;
    const isOtherUserCost = costBreakdown && 
      costBreakdown.length === 1 && 
      costBreakdown[0].userId !== currentUserId;
    
    // 🆕 CRITICAL FIX: Se il breakdown ha 1 utente (tu) E l'importo corrisponde al valore attuale,
    // significa che stai CONTINUANDO a digitare nello stesso campo (non è un breakdown "protetto")
    const isYourSingleUserBreakdown = costBreakdown && 
      costBreakdown.length === 1 && 
      costBreakdown[0].userId === currentUserId;
    
    // 🆕 Verifica se l'importo nel breakdown corrisponde al valore attuale
    // Se sì, significa che è il breakdown auto-generato mentre digiti
    const isActivelyEditing = isYourSingleUserBreakdown && 
      costBreakdown[0].amount === currentAmount;
    
    console.log('🔍 [CostInput] Checks:', {
      isMultiUser,
      isOtherUserCost,
      isYourSingleUserBreakdown,
      isActivelyEditing,
      breakdownAmount: costBreakdown?.[0]?.amount,
      currentAmount
    });
    
    // Mostra alert SOLO se:
    // 1. Breakdown multi-utente (2+ persone), O
    // 2. Breakdown di altro utente
    // MA NON se stai attivamente modificando il tuo breakdown singolo
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
        className={`w-full px-3 py-2.5 pr-7 border rounded-full bg-gray-50 text-sm text-center ${
          hasSplitCost ? 'ring-2 ring-orange-400 bg-orange-50' : ''
        }`}
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