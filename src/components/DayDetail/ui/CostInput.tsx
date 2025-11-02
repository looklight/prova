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
    
    // Verifica se c'è un breakdown multi-utente o se il costo è di un altro user
    const isMultiUser = costBreakdown && costBreakdown.length > 1;
    const isOtherUserCost = costBreakdown && 
                            costBreakdown.length === 1 && 
                            costBreakdown[0].userId !== currentUserId;
    
    // Mostra alert solo se:
    // 1. C'è un breakdown multi-utente, OPPURE
    // 2. Il costo è stato inserito da un altro user
    if ((isMultiUser || isOtherUserCost) && newValue !== value && onClearBreakdown) {
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