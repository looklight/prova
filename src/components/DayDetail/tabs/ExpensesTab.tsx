import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Plus, BarChart3, X, Trash2, Receipt } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { animationStyles } from '../../../styles/animations';
import { calculateDayCost, calculateTripCost } from '../../../utils/costsUtils';
import { Avatar, SwipeToDelete } from '../../ui';
import CostBreakdownModal from '../modals/CostBreakdownModal';
import { TripCostsView } from '../../TripCosts';
import { getActivityTypeConfig } from '../../../utils/activityTypes';
import {
  useExpenseOperations,
  ExpenseItem,
  formatDayHeader,
  isToday,
  getItemStyle
} from '../hooks';

// ============================================
// ALTROVE - ExpensesTab
// Vista multi-giorno stile Tricount
// Mostra tutte le spese del viaggio con separatori data
// ============================================

interface ExpensesTabProps {
  trip: any;
  currentDay: any;
  currentUserId: string;
  activeMembers: Array<{ uid: string; displayName: string; avatar?: string }>;
  isDesktop: boolean;
  onUpdateTrip: (updates: any) => void;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({
  trip,
  currentDay,
  currentUserId,
  activeMembers,
  isDesktop,
  onUpdateTrip
}) => {
  // Refs per auto-scroll
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // State per modal breakdown (unificato per nuove spese e modifica)
  const [breakdownModal, setBreakdownModal] = useState<{
    isOpen: boolean;
    item: ExpenseItem | null;
    isNewExpense: boolean;
    initialDayId: string | null;
  }>({ isOpen: false, item: null, isNewExpense: false, initialDayId: null });

  // State per vista riepilogo spese
  const [showCostsView, setShowCostsView] = useState(false);

  // State per dialog conferma eliminazione
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ExpenseItem | null>(null);

  // Hook per operazioni sulle spese
  const {
    getDayExpenses,
    getSuggestionsCount,
    getPayerInfo,
    deleteExpense,
    clearExpenseCostOnly,
    handleConfirmBreakdown
  } = useExpenseOperations({
    trip,
    currentUserId,
    activeMembers,
    onUpdateTrip
  });

  // Handler per richiesta eliminazione (mostra dialog per attività)
  const handleDeleteRequest = (item: ExpenseItem) => {
    if (item.type === 'activity') {
      // Per attività: mostra dialog di conferma
      setDeleteConfirmItem(item);
    } else {
      // Per pernottamento: elimina direttamente (resetta solo costi)
      deleteExpense(item);
    }
  };

  // Handler per conferma eliminazione solo costo
  const handleClearCostOnly = () => {
    if (deleteConfirmItem) {
      clearExpenseCostOnly(deleteConfirmItem);
      setDeleteConfirmItem(null);
    }
  };

  // Handler per conferma eliminazione attività completa
  const handleDeleteActivity = () => {
    if (deleteConfirmItem) {
      deleteExpense(deleteConfirmItem);
      setDeleteConfirmItem(null);
    }
  };

  // Auto-scroll al giorno corrente al mount
  useEffect(() => {
    if (currentDay?.id && dayRefs.current[currentDay.id]) {
      setTimeout(() => {
        dayRefs.current[currentDay.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, []); // Solo al mount

  // Calcolo totale viaggio
  const tripCost = useMemo(() => calculateTripCost(trip), [trip]);

  // Handler conferma breakdown (wrapper per il modal)
  const onConfirmBreakdown = (
    breakdown: Array<{ userId: string; amount: number }> | 'RESET_ALL',
    participants: string[] | null,
    expenseTitle?: string,
    targetDayId?: string,
    expenseType?: any,
    selectedSuggestion?: { id: string; sourceType: 'accommodation' | 'activity' } | null
  ) => {
    handleConfirmBreakdown(
      breakdown,
      participants,
      expenseTitle,
      targetDayId,
      expenseType,
      selectedSuggestion,
      breakdownModal.item,
      breakdownModal.isNewExpense
    );
    setBreakdownModal({ isOpen: false, item: null, isNewExpense: false, initialDayId: null });
  };

  // Apri modal per modifica spesa esistente
  const openBreakdownModal = (item: ExpenseItem) => {
    setBreakdownModal({ isOpen: true, item, isNewExpense: false, initialDayId: item.dayId });
  };

  // Apri modal per nuova spesa
  const openAddExpenseModal = (dayId: string) => {
    setBreakdownModal({
      isOpen: true,
      item: null,
      isNewExpense: true,
      initialDayId: dayId
    });
  };

  // Render singola spesa
  const renderExpenseItem = (item: ExpenseItem) => {
    const cost = parseFloat(item.cost || '0') || 0;
    const payerInfo = getPayerInfo(item);
    const typeConfig = getActivityTypeConfig(item.activityType);
    const IconComponent = typeConfig.selectorIcon;
    const itemHasCost = cost > 0;

    return (
      <SwipeToDelete
        key={item.id}
        onDelete={() => handleDeleteRequest(item)}
        disabled={!itemHasCost}
      >
        <button
          onClick={() => openBreakdownModal(item)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
          style={getItemStyle(typeConfig.color)}
        >
          {/* Icona circolare con sfondo neutro */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
          >
            <IconComponent size={18} color={typeConfig.color} strokeWidth={2} />
          </div>

          {/* Titolo e info pagatore */}
          <div className="flex-1 min-w-0 text-left">
            <p
              className="text-sm font-medium truncate"
              style={{ color: colors.text }}
            >
              {item.title}
            </p>

            {/* Chi ha pagato */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {payerInfo.type === 'shared' ? (
                <>
                  <div className="flex -space-x-1">
                    {payerInfo.payers?.slice(0, 3).map((p) => (
                      <Avatar
                        key={p.uid}
                        src={p.avatar}
                        name={p.displayName}
                        size="xs"
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    Condiviso
                  </span>
                </>
              ) : payerInfo.type !== 'none' ? (
                <>
                  <Avatar
                    src={payerInfo.avatar}
                    name={payerInfo.label}
                    size="xs"
                  />
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    {payerInfo.type === 'me' ? 'Pagato da te' : `Pagato da ${payerInfo.label}`}
                  </span>
                </>
              ) : (
                <span className="text-xs" style={{ color: colors.textMuted }}>
                  Nessun costo inserito
                </span>
              )}
            </div>
          </div>

          {/* Costo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-base font-semibold"
              style={{ color: cost > 0 ? colors.text : colors.textMuted }}
            >
              {cost > 0 ? `${cost.toFixed(2)} €` : '—'}
            </span>
            <ChevronRight size={16} color={colors.textMuted} />
          </div>
        </button>
      </SwipeToDelete>
    );
  };

  // Render pulsante aggiungi spesa (più visibile se oggi)
  const renderAddExpenseButton = (dayId: string, isTodayFlag: boolean) => {
    const suggestionsCount = getSuggestionsCount(dayId);

    return (
      <button
        onClick={() => openAddExpenseModal(dayId)}
        className={`flex items-center justify-center gap-1.5 mx-auto transition-all opacity-50 hover:opacity-100 ${isTodayFlag ? 'py-2.5 px-3' : 'py-2'}`}
        style={{ color: colors.textMuted }}
      >
        <Plus size={isTodayFlag ? 16 : 14} />
        <span className={isTodayFlag ? 'text-sm' : 'text-xs'}>
          Aggiungi spesa{suggestionsCount > 0 ? ` (${suggestionsCount})` : ''}
        </span>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Totale - sticky + cliccabile */}
      <button
        onClick={() => setShowCostsView(true)}
        className="sticky top-0 z-10 w-full p-4 border-b text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.border
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} color={colors.accent} />
            <span
              className="text-sm font-medium"
              style={{ color: colors.textMuted }}
            >
              Totale Viaggio
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-bold"
              style={{ color: colors.accent }}
            >
              {tripCost.toFixed(2)} €
            </span>
            <ChevronRight size={18} color={colors.textMuted} />
          </div>
        </div>
      </button>

      {/* Lista Giorni */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {trip.days.map((day: any) => {
          const expenses = getDayExpenses(day);
          const dayCost = calculateDayCost(day, trip.data, trip.sharing?.members);
          const isTodayFlag = isToday(day);

          return (
            <div
              key={day.id}
              ref={el => { dayRefs.current[day.id] = el; }}
            >
              {/* Separatore Data */}
              <div className="flex items-center gap-3 py-3">
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: colors.border }}
                />
                {isTodayFlag && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: colors.accent,
                      color: 'white'
                    }}
                  >
                    oggi
                  </span>
                )}
                <span
                  className="text-sm font-medium capitalize"
                  style={{ color: colors.textMuted }}
                >
                  {formatDayHeader(day)}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: colors.text }}
                >
                  {dayCost.toFixed(2)} €
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: colors.border }}
                />
              </div>

              {/* Spese del giorno */}
              <div className="space-y-2">
                {expenses.map(item => renderExpenseItem(item))}
                {renderAddExpenseButton(day.id, isTodayFlag)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Breakdown (unificato) */}
      <CostBreakdownModal
        isOpen={breakdownModal.isOpen}
        isDesktop={isDesktop}
        categoryLabel={breakdownModal.item?.title || ''}
        currentUserId={currentUserId}
        tripMembers={activeMembers}
        tripSharing={trip.sharing}
        existingBreakdown={breakdownModal.item?.costBreakdown || null}
        existingParticipants={breakdownModal.item?.participants || null}
        existingParticipantsUpdatedAt={breakdownModal.item?.participantsUpdatedAt || null}
        preferredCurrencies={trip.currency?.preferred || {}}
        tripDays={trip.days}
        tripData={trip.data}
        currentDayId={breakdownModal.initialDayId || currentDay?.id}
        existingType={breakdownModal.item?.activityType}
        isNewExpense={breakdownModal.isNewExpense}
        onClose={() => setBreakdownModal({ isOpen: false, item: null, isNewExpense: false, initialDayId: null })}
        onConfirm={onConfirmBreakdown}
      />

      {/* Vista Riepilogo Spese (fullscreen portal) */}
      {showCostsView && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            backgroundColor: colors.bg,
            ...animationStyles.slideUp
          }}
        >
          <TripCostsView
            trip={trip}
            onBack={() => setShowCostsView(false)}
            isDesktop={isDesktop}
          />
        </div>,
        document.body
      )}

      {/* Dialog conferma eliminazione spesa attività */}
      {deleteConfirmItem && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDeleteConfirmItem(null)}
        >
          <div
            className="w-full max-w-lg mx-4 mb-4 rounded-2xl overflow-hidden shadow-xl"
            style={{
              backgroundColor: colors.bgCard,
              ...animationStyles.slideUp
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: colors.border }}
            >
              <h3
                className="text-base font-semibold"
                style={{ color: colors.text }}
              >
                Rimuovi spesa
              </h3>
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} color={colors.textMuted} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p
                className="text-sm mb-4"
                style={{ color: colors.textMuted }}
              >
                Questa spesa è collegata all'attività "{deleteConfirmItem.title}".
                Cosa vuoi fare?
              </p>

              {/* Opzioni */}
              <div className="space-y-2">
                {/* Opzione 1: Solo costo */}
                <button
                  onClick={handleClearCostOnly}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-gray-50"
                  style={{ borderColor: colors.border }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                  >
                    <Receipt size={18} color="#3B82F6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="text-sm font-medium"
                      style={{ color: colors.text }}
                    >
                      Rimuovi solo il costo
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.textMuted }}
                    >
                      L'attività rimane nella pianificazione
                    </p>
                  </div>
                </button>

                {/* Opzione 2: Elimina attività */}
                <button
                  onClick={handleDeleteActivity}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-red-50"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="text-sm font-medium"
                      style={{ color: '#EF4444' }}
                    >
                      Elimina l'attività
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.textMuted }}
                    >
                      Rimuove anche l'attività dalla pianificazione
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div
              className="p-4 border-t"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="w-full py-2.5 text-sm font-medium rounded-xl transition-colors"
                style={{
                  backgroundColor: colors.bgSubtle,
                  color: colors.textMuted
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExpensesTab;
