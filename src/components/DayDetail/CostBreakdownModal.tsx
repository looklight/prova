import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import Avatar from '../Avatar';

interface BreakdownEntry {
  id: number;
  userId: string;
  amount: string;
}

interface CostBreakdownModalProps {
  isOpen: boolean;
  isDesktop: boolean;
  categoryLabel: string;
  currentUserId: string;
  tripMembers: Array<{ uid: string; displayName: string; avatar?: string }>;
  existingBreakdown: Array<{ userId: string; amount: number }> | null;
  existingParticipants?: string[] | null; // 🆕 Chi ha usufruito
  onClose: () => void;
  onConfirm: (breakdown: Array<{ userId: string; amount: number }>, participants: string[]) => void; // 🆕 Aggiungi participants
}

const CostBreakdownModal: React.FC<CostBreakdownModalProps> = ({
  isOpen,
  isDesktop,
  categoryLabel,
  currentUserId,
  tripMembers,
  existingBreakdown,
  existingParticipants,
  onClose,
  onConfirm
}) => {
  const [entries, setEntries] = useState<BreakdownEntry[]>([]);
  const [nextId, setNextId] = useState(2);
  const [participants, setParticipants] = useState<Set<string>>(new Set()); // 🆕 Set di UIDs partecipanti

  // Inizializza entries e participants
  useEffect(() => {
    if (isOpen) {
      // 🆕 Inizializza participants
      if (existingParticipants && existingParticipants.length > 0) {
        setParticipants(new Set(existingParticipants));
      } else {
        // Default: tutti i membri attivi
        setParticipants(new Set(tripMembers.map(m => m.uid)));
      }

      if (existingBreakdown && existingBreakdown.length > 0) {
        // Carica breakdown esistente
        setEntries(
          existingBreakdown.map((item, idx) => ({
            id: idx + 1,
            userId: item.userId,
            amount: item.amount.toString()
          }))
        );
        setNextId(existingBreakdown.length + 1);
      } else {
        // Nuova entry con utente corrente di default
        setEntries([{ id: 1, userId: currentUserId, amount: '' }]);
        setNextId(2);
      }
    }
  }, [isOpen, existingBreakdown, existingParticipants, currentUserId, tripMembers]);

  const addEntry = () => {
    setEntries([...entries, { id: nextId, userId: currentUserId, amount: '' }]);
    setNextId(nextId + 1);
  };

  const removeEntry = (id: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: number, field: 'userId' | 'amount', value: string) => {
    setEntries(entries.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  // 🆕 Toggle partecipante
  const toggleParticipant = (userId: string) => {
    setParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        // Non permettere di rimuovere l'ultimo partecipante
        if (newSet.size === 1) {
          alert('Almeno una persona deve usufruire di questa spesa');
          return prev;
        }
        newSet.delete(userId);
        
        // Se rimuovi un partecipante, azzera il suo amount
        setEntries(currentEntries => 
          currentEntries.map(e => 
            e.userId === userId ? { ...e, amount: '0' } : e
          )
        );
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleConfirm = () => {
    // Valida che ci siano partecipanti
    if (participants.size === 0) {
      alert('Seleziona almeno una persona che ha usufruito di questa spesa');
      return;
    }

    // Valida che ci siano dei valori
    const validEntries = entries.filter(e => 
      e.userId && e.amount && parseFloat(e.amount) > 0
    );

    if (validEntries.length === 0) {
      alert('Inserisci almeno un contributo valido');
      return;
    }

    const breakdown = validEntries.map(e => ({
      userId: e.userId,
      amount: parseFloat(e.amount)
    }));

    // 🆕 Passa anche i participants
    onConfirm(breakdown, Array.from(participants));
    onClose();
  };

  const getMember = (userId: string) => {
    return tripMembers.find(m => m.uid === userId);
  };

  if (!isOpen) return null;

  const total = calculateTotal();
  const idealShare = participants.size > 0 ? total / participants.size : 0;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-2xl w-full ${isDesktop ? 'max-w-md' : 'max-w-[430px]'} max-h-[80vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-bold">Gestisci Spesa</h3>
            <p className="text-sm text-gray-500 mt-1">{categoryLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 🆕 Chi ha usufruito */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">👥 Chi ha usufruito?</h4>
            <div className="flex flex-wrap gap-2">
              {tripMembers.map(member => {
                const isSelected = participants.has(member.uid);
                return (
                  <button
                    key={member.uid}
                    onClick={() => toggleParticipant(member.uid)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
                      transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    <Avatar src={member.avatar} name={member.displayName} size="xs" />
                    <span>{member.displayName}</span>
                    {isSelected ? (
                      <span className="text-xs">✓</span>
                    ) : (
                      <span className="text-xs opacity-50">✕</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chi ha pagato quanto */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">💰 Chi ha pagato quanto?</h4>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => {
              const member = getMember(entry.userId);
              const isParticipant = participants.has(entry.userId);
              
              return (
                <div key={entry.id} className="flex gap-2 items-center">
                  {/* Dropdown Membro con Avatar */}
                  <div className="flex-1 relative">
                    <select
                      value={entry.userId}
                      onChange={(e) => updateEntry(entry.id, 'userId', e.target.value)}
                      className="w-full pl-12 pr-3 py-2.5 border rounded-lg text-sm bg-white appearance-none cursor-pointer"
                    >
                      {tripMembers.map(m => (
                        <option key={m.uid} value={m.uid}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                    {/* Avatar sovrapposto */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Avatar 
                        src={member?.avatar} 
                        name={member?.displayName || 'Utente'} 
                        size="xs"
                      />
                    </div>
                  </div>

                  {/* Input Importo */}
                  <div className="relative" style={{ width: '100px' }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={entry.amount}
                      onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                      placeholder="0"
                      className={`w-full px-3 py-2.5 pr-7 border rounded-lg text-sm text-center ${
                        !isParticipant ? 'bg-gray-50 text-gray-400' : ''
                      }`}
                      disabled={!isParticipant}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                      €
                    </span>
                  </div>

                  {/* Bottone Rimuovi */}
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottone Aggiungi */}
          <button
            onClick={addEntry}
            className="w-full mt-4 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Aggiungi Contributo</span>
          </button>

          {/* Totale e Bilancio */}
          <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Totale Spesa</span>
              <span className="text-xl font-bold text-blue-700">{total.toFixed(2)} €</span>
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
              <span>Quota per persona</span>
              <span className="font-medium">{idealShare.toFixed(2)} € ({participants.size} {participants.size === 1 ? 'partecipante' : 'partecipanti'})</span>
            </div>

            {/* Dettaglio bilancio per partecipante */}
            {participants.size > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                {Array.from(participants).map((userId) => {
                  const member = getMember(userId);
                  const paidAmount = entries
                    .filter(e => e.userId === userId)
                    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                  const balance = paidAmount - idealShare;
                  
                  return (
                    <div key={userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar 
                          src={member?.avatar} 
                          name={member?.displayName || 'Utente'} 
                          size="xs"
                        />
                        <span className="text-xs text-gray-600">{member?.displayName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">
                          {paidAmount.toFixed(2)}€ / {idealShare.toFixed(2)}€
                        </span>
                        <span className={`font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {balance >= 0 ? '+' : ''}{balance.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostBreakdownModal;