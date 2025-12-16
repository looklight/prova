import React, { useState } from 'react';
import CostConflictDialog from './CostConflictDialog';
import { parseCost } from '../../../utils/costsUtils';

interface CostInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hasSplitCost?: boolean;
  currentUserId?: string;
  costBreakdown?: Array<{ userId: string; amount: number }> | null;
  tripMembers?: Record<string, { status: string; displayName: string; avatar?: string }> | null;
  onClearBreakdown?: () => void;
  onOpenManageBreakdown?: () => void;
}

const CostInput: React.FC<CostInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  hasSplitCost = false,
  currentUserId,
  costBreakdown,
  tripMembers,
  onClearBreakdown,
  onOpenManageBreakdown
}) => {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState<string>('');
  const [localValue, setLocalValue] = useState<string | null>(null);

  // Filtra breakdown per membri ATTIVI
  const getActiveBreakdown = () => {
    if (!costBreakdown || costBreakdown.length === 0 || !tripMembers) {
      return [];
    }

    return costBreakdown.filter(entry => {
      const member = tripMembers[entry.userId];
      return member && member.status === 'active';
    });
  };

  // Calcola il valore effettivo da mostrare (solo membri attivi)
  const activeBreakdown = getActiveBreakdown();
  const computedValue = activeBreakdown.length > 0
    ? parseCost(activeBreakdown.reduce((sum, entry) => sum + entry.amount, 0))
    : '';

  const displayValue = localValue !== null ? localValue : computedValue;

  // Determina colore basato su UTENTI UNICI ATTIVI che hanno pagato
  const getBackgroundColor = () => {
    const activeBreakdown = getActiveBreakdown();

    if (activeBreakdown.length === 0) {
      return 'bg-gray-50';
    }

    // Conta utenti UNICI ATTIVI che hanno pagato
    const uniquePayers = new Set(activeBreakdown.map(e => e.userId));
    const uniquePayersCount = uniquePayers.size;

    // Spesa condivisa (2+ utenti attivi diversi) → arancione
    if (uniquePayersCount > 1) {
      return 'bg-orange-50 ring-1 ring-orange-300';
    }

    // Spesa singola (1 utente attivo solo)
    const singlePayer = activeBreakdown[0].userId;

    if (singlePayer === currentUserId) {
      return 'bg-blue-50 ring-1 ring-blue-300'; // Pagato da ME
    } else {
      return 'bg-gray-50'; // Pagato da ALTRI
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    const normalizedValue = newValue.replace(',', '.');
    const currentAmount = parseFloat(displayValue) || 0;

    // Usa SOLO breakdown di membri ATTIVI
    const uniquePayers = new Set(activeBreakdown.map(e => e.userId));
    const uniquePayersCount = uniquePayers.size;

    // Breakdown multi-utente (2+ utenti attivi diversi)
    const isMultiUser = uniquePayersCount > 1;

    // Breakdown di altro utente attivo (1 utente attivo, non sei tu)
    const isOtherUserCost = uniquePayersCount === 1 &&
      activeBreakdown.length > 0 &&
      activeBreakdown[0].userId !== currentUserId;

    // Breakdown tuo (1 utente attivo, sei tu)
    const isYourBreakdown = uniquePayersCount === 1 &&
      activeBreakdown.length > 0 &&
      activeBreakdown[0].userId === currentUserId;

    // Se è il TUO breakdown E l'importo corrisponde → stai continuando a digitare
    const isActivelyEditing = isYourBreakdown &&
      activeBreakdown.reduce((sum, e) => sum + e.amount, 0) === currentAmount;

    // Mostra dialogo SOLO se:
    // 1. Multi-utente attivo (2+ persone), O
    // 2. Altro utente attivo singolo
    // MA NON se stai modificando il tuo breakdown
    const shouldShowDialog = (isMultiUser || isOtherUserCost) && !isActivelyEditing;

    if (shouldShowDialog && normalizedValue !== displayValue && onClearBreakdown) {
      console.log('⚠️ [CostInput] Rilevato conflitto, apertura dialogo');
      setPendingValue(newValue);
      setShowConflictDialog(true);
    } else {
      console.log('✅ [CostInput] Modifica normale');

      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: normalizedValue
        }
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
    }
  };

  // Handler per "Elimina e ricomincia"
  const handleReset = () => {
    if (onClearBreakdown) {
      onClearBreakdown();
      // Reset completo: svuota il campo
      const syntheticEvent = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    setShowConflictDialog(false);
    setPendingValue('');
  };

  // Handler per "Gestisci ripartizione"
  const handleManage = () => {
    setShowConflictDialog(false);
    setPendingValue('');
    if (onOpenManageBreakdown) {
      onOpenManageBreakdown();
    }
  };

  // Handler per "Annulla"
  const handleCancel = () => {
    setShowConflictDialog(false);
    setPendingValue('');
  };

  return (
    <>
      <div className="relative" style={{ width: '90px' }}>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={() => setLocalValue(null)}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 pr-7 border rounded-full text-sm text-center ${getBackgroundColor()}`}
          onWheel={(e) => e.currentTarget.blur()}
        />
        
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          €
        </span>
      </div>

      <CostConflictDialog
        isOpen={showConflictDialog}
        onReset={handleReset}
        onManage={handleManage}
        onCancel={handleCancel}
      />
    </>
  );
};

export default CostInput;