import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ArrowRightLeft, ChevronDown, X } from 'lucide-react';
import { Avatar } from '../../ui';
import CurrencyConvertModal from './CurrencyConvertModal';
import { parseCost } from '../../../utils/costsUtils';
import { colors } from '../../../styles/theme';
import { animationStyles } from '../../../styles/animations';
import { ActivityType, ACTIVITY_TYPES_LIST, getActivityTypeConfig } from '../../../utils/activityTypes';

interface BreakdownEntry {
  id: number;
  userId: string;
  amount: string;
}

interface TripDay {
  id: string;
  number: number;
  date: Date;
}

interface ExpenseSuggestion {
  id: string;
  title: string;
  type: ActivityType;
  sourceType: 'accommodation' | 'activity';
}

interface CostBreakdownModalProps {
  isOpen: boolean;
  isDesktop: boolean;
  categoryLabel: string;
  currentUserId: string;
  tripMembers: Array<{ uid: string; displayName: string; avatar?: string }>;
  tripSharing: any;
  existingBreakdown: Array<{ userId: string; amount: number }> | null;
  existingParticipants?: string[] | null;
  existingParticipantsUpdatedAt?: any | null;
  preferredCurrencies?: Record<string, any>;
  // Props per editing nome/data/tipo
  tripDays?: TripDay[];
  tripData?: Record<string, any>;
  currentDayId?: string;
  existingType?: ActivityType;
  isNewExpense?: boolean;
  onClose: () => void;
  onConfirm: (
    breakdown: Array<{ userId: string; amount: number }> | 'RESET_ALL',
    participants: string[] | null,
    expenseTitle?: string,
    targetDayId?: string,
    expenseType?: ActivityType,
    selectedSuggestion?: ExpenseSuggestion | null
  ) => void;
}

const CostBreakdownModal: React.FC<CostBreakdownModalProps> = ({
  isOpen,
  isDesktop,
  categoryLabel,
  currentUserId,
  tripMembers,
  tripSharing,
  existingBreakdown,
  existingParticipants,
  existingParticipantsUpdatedAt,
  preferredCurrencies = {},
  tripDays = [],
  tripData = {},
  currentDayId,
  existingType,
  isNewExpense = false,
  onClose,
  onConfirm
}) => {
  const [entries, setEntries] = useState<BreakdownEntry[]>([]);
  const [nextId, setNextId] = useState(2);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingEntryId, setConvertingEntryId] = useState<number | null>(null);

  // State per nome spesa, giorno e tipo
  const [expenseTitle, setExpenseTitle] = useState(categoryLabel);
  const [selectedDayId, setSelectedDayId] = useState(currentDayId || '');
  const [expenseType, setExpenseType] = useState<ActivityType>(existingType || 'generic');
  const [isTypeExpanded, setIsTypeExpanded] = useState(false);
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ExpenseSuggestion | null>(null);

  // Helper: verifica se un item ha già un costo assegnato
  const hasExpenseCost = (item: any): boolean => {
    // Ha un costo diretto > 0
    if (item?.cost && parseFloat(item.cost) > 0) return true;
    // Ha un breakdown con almeno un importo > 0
    if (item?.costBreakdown && Array.isArray(item.costBreakdown) &&
        item.costBreakdown.some((e: any) => e.amount > 0)) return true;
    return false;
  };

  // Ottieni suggerimenti spese per il giorno selezionato (solo item senza costo)
  const getSuggestionsForDay = (dayId: string): ExpenseSuggestion[] => {
    if (!dayId || !tripData) return [];

    const suggestions: ExpenseSuggestion[] = [];

    // Pernottamento (solo se NON ha già un costo)
    const accKey = `${dayId}-pernottamento`;
    const accommodation = tripData[accKey];
    if (accommodation?.title?.trim() && !hasExpenseCost(accommodation)) {
      suggestions.push({
        id: `${dayId}-pernottamento`,
        title: accommodation.title,
        type: 'accommodation',
        sourceType: 'accommodation'
      });
    }

    // Attività senza costo
    const actKey = `${dayId}-attivita`;
    const actData = tripData[actKey];
    if (actData?.activities && Array.isArray(actData.activities)) {
      actData.activities
        .filter((a: any) => a.title?.trim() && !hasExpenseCost(a))
        .forEach((activity: any) => {
          suggestions.push({
            id: activity.id,
            title: activity.title,
            type: activity.type || 'generic',
            sourceType: 'activity'
          });
        });
    }

    return suggestions;
  };

  const currentSuggestions = getSuggestionsForDay(selectedDayId);

  // Applica suggerimento
  const applySuggestion = (suggestion: ExpenseSuggestion) => {
    setExpenseTitle(suggestion.title);
    setExpenseType(suggestion.type);
    setSelectedSuggestion(suggestion);
    setIsSuggestionsExpanded(false);
  };

  // Helper per convertire Firestore Timestamp in Date
  const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return null;
  };

  // Formatta data per display
  const formatDayOption = (day: TripDay) => {
    return day.date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Init state quando si apre
  useEffect(() => {
    if (isOpen) {
      // Reset titolo, giorno, tipo e stato espansione
      setExpenseTitle(categoryLabel);
      setSelectedDayId(currentDayId || '');
      setExpenseType(existingType || 'generic');
      setIsTypeExpanded(false);
      setIsSuggestionsExpanded(false);
      setSelectedSuggestion(null);

      // ====== GESTIONE PARTICIPANTS ======
      if (existingParticipants && existingParticipants.length > 0) {
        const activeParticipants = existingParticipants.filter(uid =>
          tripMembers.some(m => m.uid === uid)
        );

        const participantsUpdatedDate = toDate(existingParticipantsUpdatedAt);

        if (participantsUpdatedDate && tripSharing?.members) {
          const newMembers: string[] = [];

          tripMembers.forEach(member => {
            if (activeParticipants.includes(member.uid)) return;

            const memberInfo = tripSharing.members[member.uid];
            if (!memberInfo) return;

            const memberAddedAt = toDate(memberInfo.addedAt);
            if (!memberAddedAt) return;

            if (memberAddedAt > participantsUpdatedDate) {
              newMembers.push(member.uid);
            }
          });

          if (newMembers.length > 0) {
            setParticipants(new Set([...activeParticipants, ...newMembers]));
          } else {
            setParticipants(new Set(activeParticipants));
          }
        } else {
          setParticipants(new Set(activeParticipants));
        }
      } else {
        setParticipants(new Set(tripMembers.map(m => m.uid)));
      }

      // ====== GESTIONE BREAKDOWN ======
      if (existingBreakdown && existingBreakdown.length > 0) {
        const activeBreakdown = existingBreakdown.filter(item =>
          tripMembers.some(m => m.uid === item.userId)
        );

        if (activeBreakdown.length > 0) {
          setEntries(
            activeBreakdown.map((item, idx) => ({
              id: idx + 1,
              userId: item.userId,
              amount: item.amount.toString()
            }))
          );
          setNextId(activeBreakdown.length + 1);
        } else {
          setEntries([{ id: 1, userId: currentUserId, amount: '' }]);
          setNextId(2);
        }
      } else {
        setEntries([{ id: 1, userId: currentUserId, amount: '' }]);
        setNextId(2);
      }
    }
  }, [isOpen, existingBreakdown, existingParticipants, existingParticipantsUpdatedAt, currentUserId, tripMembers, tripSharing, categoryLabel, currentDayId]);

  // Blocca scroll body quando modal è aperto
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

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

  const toggleParticipant = (userId: string) => {
    setParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        if (newSet.size === 1) {
          alert('Almeno una persona deve usufruire di questa spesa');
          return prev;
        }
        newSet.delete(userId);

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

  const handleConfirm = () => {
    // Valida titolo per nuove spese
    if (isNewExpense && !expenseTitle.trim()) {
      alert('Inserisci un nome per la spesa');
      return;
    }

    if (participants.size === 0) {
      alert('Seleziona almeno una persona che ha usufruito di questa spesa');
      return;
    }

    const validEntries = entries.filter(e =>
      e.userId && e.amount && parseFloat(parseCost(e.amount)) > 0
    );

    // Se tutti a 0€ → Chiedi conferma
    if (validEntries.length === 0) {
      const confirmed = window.confirm(
        '⚠️  Nessun contributo inserito\n\n' +
        'I costi di questa spesa verranno azzerati.\n\n' +
        'Vuoi continuare?'
      );

      if (confirmed) {
        onConfirm([], [], expenseTitle.trim(), selectedDayId, expenseType, selectedSuggestion);
        onClose();
      }
      return;
    }

    const breakdown = validEntries.map(e => ({
      userId: e.userId,
      amount: parseFloat(parseCost(e.amount))
    }));

    onConfirm(
      breakdown,
      Array.from(participants),
      expenseTitle.trim(),
      selectedDayId,
      expenseType,
      selectedSuggestion
    );
    onClose();
  };

  // Conversione valuta
  const handleConvertClick = (entryId: number) => {
    setConvertingEntryId(entryId);
    setShowConvertModal(true);
  };

  const handleLiveAmountChange = (amountInEUR: number) => {
    if (convertingEntryId !== null && amountInEUR > 0) {
      updateEntry(convertingEntryId, 'amount', amountInEUR.toFixed(2));
    }
  };

  const handleConvertClose = () => {
    setShowConvertModal(false);
    setConvertingEntryId(null);
  };

  const hasPreferredCurrencies = Object.keys(preferredCurrencies).length > 0;

  const getMember = (userId: string) => {
    return tripMembers.find(m => m.uid === userId);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      style={animationStyles.fadeIn}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl w-full ${isDesktop ? 'max-w-md' : 'max-w-[430px]'} max-h-[85vh] overflow-hidden flex flex-col`}
        style={animationStyles.scaleIn}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Nome Spesa con pulsante tipologia */}
          <div className="mb-5">
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: colors.textMuted }}
            >
              Nome spesa
            </label>
            <div className="flex items-center gap-2.5 relative">
              {/* Pulsante circolare tipologia */}
              {(() => {
                const currentTypeConfig = getActivityTypeConfig(expenseType);
                const TypeIcon = currentTypeConfig.selectorIcon;
                return (
                  <button
                    onClick={() => setIsTypeExpanded(!isTypeExpanded)}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: currentTypeConfig.color,
                      boxShadow: `0 2px 8px ${currentTypeConfig.color}40`
                    }}
                    title={currentTypeConfig.label}
                  >
                    <TypeIcon size={18} color="white" />
                  </button>
                );
              })()}

              {/* Input nome */}
              <input
                type="text"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="Es. Cena, Biglietti museo..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  color: colors.text
                }}
              />

              {/* Overlay per chiudere la nuvoletta cliccando fuori */}
              {isTypeExpanded && (
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsTypeExpanded(false)}
                />
              )}

              {/* Chips tipologia - nuvoletta fluttuante */}
              {isTypeExpanded && (
                <div
                  className="absolute left-0 top-full mt-2 z-20 p-2.5 rounded-xl shadow-lg border"
                  style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                    minWidth: '300px',
                    ...animationStyles.bubbleIn
                  }}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_TYPES_LIST.map(typeConfig => {
                      const isSelected = expenseType === typeConfig.value;
                      const IconComponent = typeConfig.selectorIcon;
                      return (
                        <button
                          key={typeConfig.value}
                          onClick={() => {
                            setExpenseType(typeConfig.value);
                            setIsTypeExpanded(false);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border"
                          style={{
                            backgroundColor: isSelected ? typeConfig.color : colors.bgSubtle,
                            color: isSelected ? 'white' : colors.text,
                            borderColor: isSelected ? typeConfig.color : colors.border
                          }}
                        >
                          <IconComponent size={12} />
                          <span>{typeConfig.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selettore Data + Suggerimenti */}
          {tripDays.length > 0 && (
            <div className="mb-5">
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.textMuted }}
              >
                Data
              </label>
              <div className="flex items-start gap-3">
                {/* Select data */}
                <div className="relative flex-shrink-0">
                  <select
                    value={selectedDayId}
                    onChange={(e) => setSelectedDayId(e.target.value)}
                    className="w-full px-3 py-2 pr-8 rounded-lg border text-sm appearance-none cursor-pointer"
                    style={{
                      backgroundColor: colors.bgSubtle,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                  >
                    {tripDays.map(day => (
                      <option key={day.id} value={day.id}>
                        Giorno {day.number} - {formatDayOption(day)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    color={colors.textMuted}
                  />
                </div>

                {/* Suggerimenti spese */}
                {isNewExpense && currentSuggestions.length > 0 && (
                  <div className="relative flex items-center">
                    {/* Pulsante conteggio */}
                    <button
                      onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        backgroundColor: colors.accent + '15',
                        color: colors.accent
                      }}
                    >
                      <span>{currentSuggestions.length} suggerit{currentSuggestions.length === 1 ? 'a' : 'e'}</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${isSuggestionsExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Overlay per chiudere */}
                    {isSuggestionsExpanded && (
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsSuggestionsExpanded(false)}
                      />
                    )}

                    {/* Nuvoletta suggerimenti */}
                    <div
                      className={`
                        absolute right-0 top-full mt-1.5 z-20
                        bg-white rounded-xl shadow-lg border p-2
                        min-w-[220px]
                        transition-all duration-200 origin-top-right
                        ${isSuggestionsExpanded
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                        }
                      `}
                      style={{
                        borderColor: colors.border,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                      }}
                    >
                      {/* Freccia */}
                      <div
                        className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-l border-t rotate-45"
                        style={{ borderColor: colors.border }}
                      />

                      {/* Lista suggerimenti */}
                      <div className="space-y-1">
                        {currentSuggestions.map(suggestion => {
                          const typeConfig = getActivityTypeConfig(suggestion.type);
                          const IconComponent = typeConfig.selectorIcon;
                          return (
                            <button
                              key={suggestion.id}
                              onClick={() => applySuggestion(suggestion)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-gray-50"
                            >
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${typeConfig.color}20` }}
                              >
                                <IconComponent size={12} color={typeConfig.color} />
                              </div>
                              <span
                                className="text-sm truncate flex-1"
                                style={{ color: colors.text }}
                              >
                                {suggestion.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chi ha pagato quanto */}
          <div className="mb-5">
            <label className="block text-xs font-semibold mb-2" style={{ color: colors.textMuted }}>
              Chi ha pagato
            </label>

            <div className="space-y-2">
              {entries.map((entry) => {
                const member = getMember(entry.userId);
                const isParticipant = participants.has(entry.userId);

                return (
                  <div key={entry.id} className="flex gap-1.5 items-center">
                    {/* Dropdown Membro con Avatar */}
                    <div className="flex-1 relative">
                      <select
                        value={entry.userId}
                        onChange={(e) => updateEntry(entry.id, 'userId', e.target.value)}
                        className="w-full pl-10 pr-2 py-2 border rounded-lg text-sm bg-white appearance-none cursor-pointer"
                        style={{ borderColor: colors.border }}
                      >
                        {tripMembers.map(m => (
                          <option key={m.uid} value={m.uid}>
                            {m.displayName}
                          </option>
                        ))}
                      </select>
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Avatar
                          src={member?.avatar}
                          name={member?.displayName || 'Utente'}
                          size="xs"
                        />
                      </div>
                    </div>

                    {/* Input Importo + Converti */}
                    <div className="flex items-center gap-1">
                      <div className="relative" style={{ width: '88px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={entry.amount}
                          onChange={(e) => updateEntry(entry.id, 'amount', e.target.value.replace(',', '.'))}
                          placeholder="0"
                          className={`w-full px-2 py-2 pr-6 border rounded-lg text-sm text-center ${!isParticipant ? 'bg-gray-50 text-gray-400' : ''}`}
                          style={{ borderColor: colors.border }}
                          disabled={!isParticipant}
                        />
                        <span
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs pointer-events-none"
                          style={{ color: colors.textMuted }}
                        >
                          €
                        </span>
                      </div>

                      {/* Bottone Converti */}
                      {hasPreferredCurrencies && isParticipant && (
                        <button
                          onClick={() => handleConvertClick(entry.id)}
                          className="w-8 h-8 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                          title="Converti valuta"
                        >
                          <ArrowRightLeft size={14} />
                        </button>
                      )}
                    </div>

                    {/* Bottone Rimuovi */}
                    {entries.length > 1 && (
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottone Aggiungi */}
            <button
              onClick={addEntry}
              className="flex items-center justify-center gap-1 mt-2 py-1.5 w-full transition-colors"
              style={{ color: colors.accent }}
            >
              <Plus size={14} />
              <span className="text-xs font-medium">Aggiungi contributo</span>
            </button>
          </div>

          {/* Chi ha usufruito */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: colors.textMuted }}>
              Chi ha usufruito
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tripMembers.map(member => {
                const isSelected = participants.has(member.uid);
                return (
                  <button
                    key={member.uid}
                    onClick={() => toggleParticipant(member.uid)}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
                      transition-all duration-200
                      ${isSelected
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }
                    `}
                    style={{
                      backgroundColor: isSelected ? colors.accent : undefined
                    }}
                  >
                    <Avatar src={member.avatar} name={member.displayName} size="xs" />
                    <span>{member.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 pt-3 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: colors.bgSubtle,
              color: colors.textMuted
            }}
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={isNewExpense && !expenseTitle.trim()}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity"
            style={{
              backgroundColor: colors.accent,
              opacity: (isNewExpense && !expenseTitle.trim()) ? 0.5 : 1
            }}
          >
            {isNewExpense ? 'Crea' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Modal Conversione Valuta */}
      <CurrencyConvertModal
        isOpen={showConvertModal}
        onClose={handleConvertClose}
        onAmountChange={handleLiveAmountChange}
        preferredCurrencies={preferredCurrencies}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CostBreakdownModal;
