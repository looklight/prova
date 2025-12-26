import React, { useMemo, useState } from 'react';
import { ChevronDown, X, UserMinus } from 'lucide-react';
import { colors, rawColors } from '../../styles/theme';
import { getUserTotalInTrip } from '../../utils/costsUtils';
import { Avatar } from '../ui';
import { ActivityType, getActivityTypeConfig, ACTIVITY_TYPE_CONFIG } from '../../utils/activityTypes';

// ============================================
// ALTROVE - CostsByUser
// Breakdown spese per utente - stile moderno
// Con dettaglio espandibile per tipologia
// ============================================

interface ExpenseDetail {
  dayNumber: number;
  title: string;
  amount: number;
  activityType: ActivityType;
}

interface UserExpensesByType {
  [key: string]: {
    config: typeof ACTIVITY_TYPE_CONFIG[ActivityType];
    expenses: ExpenseDetail[];
    total: number;
  };
}

interface NonParticipation {
  dayNumber: number;
  title: string;
  activityType: ActivityType;
}

interface CostsByUserProps {
  trip: any;
  isDesktop?: boolean;
}

// Colori coerenti con il tema app
const USER_COLORS = [
  rawColors.accent,      // #4ECDC4 - turchese
  rawColors.action,      // #3B82F6 - blu
  '#8B5CF6',             // viola
  rawColors.warning,     // #F1C40F - giallo
  rawColors.success,     // #2ECC71 - verde
  rawColors.warm,        // #FF6B6B - corallo
];

const CostsByUser: React.FC<CostsByUserProps> = ({
  trip,
  isDesktop = false
}) => {
  // State per utente espanso
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Ottiene tutte le spese del viaggio (per calcolare partecipazioni)
  const allTripExpenses = useMemo(() => {
    const expenses: Array<{
      dayNumber: number;
      title: string;
      activityType: ActivityType;
      participants: string[] | null;
      hasParticipants: boolean;
    }> = [];

    trip.days.forEach((day: any) => {
      // Attività
      const actKey = `${day.id}-attivita`;
      const actData = trip.data[actKey];
      if (actData?.activities && Array.isArray(actData.activities)) {
        actData.activities.forEach((activity: any) => {
          if (activity.costBreakdown && activity.costBreakdown.length > 0) {
            expenses.push({
              dayNumber: day.number,
              title: activity.title || 'Attività',
              activityType: activity.type || 'generic',
              participants: activity.participants || null,
              hasParticipants: !!activity.participants && activity.participants.length > 0
            });
          }
        });
      }

      // Pernottamento
      const accKey = `${day.id}-pernottamento`;
      const accData = trip.data[accKey];
      if (accData?.costBreakdown && accData.costBreakdown.length > 0) {
        expenses.push({
          dayNumber: day.number,
          title: accData.title || 'Pernottamento',
          activityType: 'accommodation',
          participants: accData.participants || null,
          hasParticipants: !!accData.participants && accData.participants.length > 0
        });
      }
    });

    return expenses;
  }, [trip]);

  // Calcola le spese dettagliate per un utente raggruppate per tipo
  const getUserExpensesByType = (userId: string): UserExpensesByType => {
    const byType: UserExpensesByType = {};

    trip.days.forEach((day: any) => {
      // Attività
      const actKey = `${day.id}-attivita`;
      const actData = trip.data[actKey];
      if (actData?.activities && Array.isArray(actData.activities)) {
        actData.activities.forEach((activity: any) => {
          if (activity.costBreakdown && Array.isArray(activity.costBreakdown)) {
            const userEntry = activity.costBreakdown.find((e: any) => e.userId === userId);
            if (userEntry && userEntry.amount > 0) {
              const actType: ActivityType = activity.type || 'generic';
              if (!byType[actType]) {
                byType[actType] = {
                  config: getActivityTypeConfig(actType),
                  expenses: [],
                  total: 0
                };
              }
              byType[actType].expenses.push({
                dayNumber: day.number,
                title: activity.title || 'Attività',
                amount: userEntry.amount,
                activityType: actType
              });
              byType[actType].total += userEntry.amount;
            }
          }
        });
      }

      // Pernottamento
      const accKey = `${day.id}-pernottamento`;
      const accData = trip.data[accKey];
      if (accData?.costBreakdown && Array.isArray(accData.costBreakdown)) {
        const userEntry = accData.costBreakdown.find((e: any) => e.userId === userId);
        if (userEntry && userEntry.amount > 0) {
          const actType: ActivityType = 'accommodation';
          if (!byType[actType]) {
            byType[actType] = {
              config: getActivityTypeConfig(actType),
              expenses: [],
              total: 0
            };
          }
          byType[actType].expenses.push({
            dayNumber: day.number,
            title: accData.title || 'Pernottamento',
            amount: userEntry.amount,
            activityType: actType
          });
          byType[actType].total += userEntry.amount;
        }
      }
    });

    return byType;
  };

  // Calcola le spese a cui l'utente NON partecipa
  const getUserNonParticipations = (userId: string): NonParticipation[] => {
    const nonParticipations: NonParticipation[] = [];

    allTripExpenses.forEach(expense => {
      // Se la spesa ha partecipanti definiti e l'utente non è incluso
      if (expense.hasParticipants && expense.participants && !expense.participants.includes(userId)) {
        nonParticipations.push({
          dayNumber: expense.dayNumber,
          title: expense.title,
          activityType: expense.activityType
        });
      }
    });

    return nonParticipations;
  };

  // Calcola totale per ogni membro attivo
  const userTotals = useMemo(() => {
    if (!trip.sharing?.members) return [];

    const totals: Array<{
      uid: string;
      displayName: string;
      avatar?: string;
      total: number;
    }> = [];

    Object.entries(trip.sharing.members).forEach(([uid, member]: [string, any]) => {
      if (member.status !== 'active') return;

      const total = getUserTotalInTrip(trip, uid);

      totals.push({
        uid,
        displayName: member.displayName || 'Utente',
        avatar: member.avatar,
        total
      });
    });

    // Ordina per totale decrescente
    return totals.sort((a, b) => b.total - a.total);
  }, [trip]);

  // Totale complessivo (per percentuali)
  const grandTotal = useMemo(() => {
    return userTotals.reduce((sum, u) => sum + u.total, 0) || 1;
  }, [userTotals]);

  // Membri usciti (left/removed) con snapshot delle spese
  // I dati dello snapshot sono in trip.history.removedMembers
  const leftMembers = useMemo(() => {
    const members: Array<{
      uid: string;
      displayName: string;
      avatar?: string;
      status: 'left' | 'removed';
      totalPaid: number;
      byCategory?: Record<string, { total: number; count: number; items: any[] }>;
    }> = [];

    // Leggi gli snapshot da history.removedMembers
    const removedMembersHistory = trip.history?.removedMembers || [];

    // Trova i membri con status left/removed in sharing.members
    if (trip.sharing?.members) {
      Object.entries(trip.sharing.members).forEach(([uid, member]: [string, any]) => {
        if (member.status === 'left' || member.status === 'removed') {
          // Cerca lo snapshot corrispondente in history
          const snapshot = removedMembersHistory.find((s: any) => s.userId === uid);

          members.push({
            uid,
            displayName: member.displayName || snapshot?.displayName || 'Utente',
            avatar: member.avatar || snapshot?.avatar,
            status: member.status,
            totalPaid: snapshot?.totalPaid || 0,
            byCategory: snapshot?.byCategory
          });
        }
      });
    }

    return members;
  }, [trip.sharing?.members, trip.history?.removedMembers]);

  if (userTotals.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ backgroundColor: colors.bgCard }}
      >
        <p
          className="text-sm italic"
          style={{ color: colors.textPlaceholder }}
        >
          Nessun partecipante
        </p>
      </div>
    );
  }

  // Render dettaglio spese per tipologia
  const renderExpenseDetails = (userId: string) => {
    const expensesByType = getUserExpensesByType(userId);
    const nonParticipations = getUserNonParticipations(userId);
    const totalExpenses = allTripExpenses.length;
    const participatedExpenses = totalExpenses - nonParticipations.length;
    const participationPercentage = totalExpenses > 0 ? (participatedExpenses / totalExpenses) * 100 : 100;

    const typeEntries = Object.entries(expensesByType);

    return (
      <div className="mt-3 space-y-3">
        {/* Spese per tipologia */}
        {typeEntries.map(([typeKey, typeData]) => {
          const IconComponent = typeData.config.selectorIcon;
          return (
            <div key={typeKey} className="rounded-xl p-3" style={{ backgroundColor: `${typeData.config.color}15` }}>
              {/* Header tipologia */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${typeData.config.color}25` }}
                  >
                    <IconComponent size={14} color={typeData.config.color} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                    {typeData.config.label}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${typeData.config.color}30`, color: typeData.config.color }}
                  >
                    {typeData.expenses.length}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: typeData.config.color }}>
                  {typeData.total.toFixed(2)} €
                </span>
              </div>

              {/* Lista spese */}
              <div className="space-y-1 ml-9">
                {typeData.expenses.map((expense, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className="text-xs font-medium shrink-0"
                        style={{ color: colors.textMuted }}
                      >
                        G{expense.dayNumber}
                      </span>
                      <span className="truncate" style={{ color: colors.text }}>
                        {expense.title}
                      </span>
                    </div>
                    <span className="text-sm shrink-0 ml-2" style={{ color: colors.textMuted }}>
                      {expense.amount.toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Sezione Partecipazioni (solo se non partecipa a tutte) */}
        {nonParticipations.length > 0 && (
          <div
            className="rounded-xl p-3 border"
            style={{ backgroundColor: `${rawColors.warm}08`, borderColor: `${rawColors.warm}30` }}
          >
            {/* Header partecipazione */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                Partecipazione: {participatedExpenses}/{totalExpenses} spese
              </span>
              <span className="text-sm font-semibold" style={{ color: rawColors.warm }}>
                {participationPercentage.toFixed(0)}%
              </span>
            </div>

            {/* Barra percentuale */}
            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: `${rawColors.warm}20` }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${participationPercentage}%`,
                  backgroundColor: participationPercentage === 100 ? rawColors.success : rawColors.accent
                }}
              />
            </div>

            {/* Lista spese non partecipate */}
            <div className="space-y-1">
              <p className="text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>
                Non partecipa a:
              </p>
              {nonParticipations.map((np, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm py-1"
                  >
                    <X size={12} color={rawColors.warm} />
                    <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
                      G{np.dayNumber}
                    </span>
                    <span className="truncate" style={{ color: colors.text }}>
                      {np.title}
                    </span>
                  </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Numero di giorni del viaggio
  const numDays = trip.days?.length || 0;
  const numPeople = userTotals.length;

  return (
    <div className="space-y-4">
      {/* Header riepilogo: Totale + Media */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: colors.bgCard }}
      >
        {/* Totale e Media */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Totale spese
            </p>
            <p className="text-2xl font-bold" style={{ color: colors.accent }}>
              {grandTotal.toFixed(0)} €
            </p>
          </div>
          {numPeople > 1 && (
            <div className="text-right">
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Media per persona
              </p>
              <p className="text-xl font-bold" style={{ color: colors.text }}>
                {(grandTotal / numPeople).toFixed(0)} €
              </p>
            </div>
          )}
        </div>

        {/* Info giorni e persone */}
        <p className="text-xs" style={{ color: colors.textMuted }}>
          {numDays} {numDays === 1 ? 'giorno' : 'giorni'} · {numPeople} {numPeople === 1 ? 'persona' : 'persone'}
        </p>
      </div>

      {/* Barra stacked (solo se >1 utente) */}
      {userTotals.length > 1 && (
        <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
          {userTotals.map((user, idx) => {
            const percentage = (user.total / grandTotal) * 100;

            if (percentage === 0) return null;

            return (
              <div
                key={user.uid}
                className="transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: USER_COLORS[idx % USER_COLORS.length]
                }}
              />
            );
          })}
        </div>
      )}

      {/* Cards per utente */}
      <div className="space-y-3">
        {userTotals.map((user, idx) => {
          const percentage = grandTotal > 0 ? (user.total / grandTotal) * 100 : 0;
          const userColor = USER_COLORS[idx % USER_COLORS.length];
          const isExpanded = expandedUserId === user.uid;

          return (
            <div
              key={user.uid}
              className="py-2 transition-all"
            >
              {/* Header cliccabile */}
              <button
                onClick={() => setExpandedUserId(isExpanded ? null : user.uid)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar senza ring */}
                  <Avatar
                    src={user.avatar}
                    name={user.displayName}
                    size="md"
                  />

                  {/* Nome + percentage */}
                  <div className="text-left">
                    <p
                      className="text-base font-semibold"
                      style={{ color: colors.text }}
                    >
                      {user.displayName}
                    </p>
                    {userTotals.length > 1 && (
                      <p
                        className="text-sm"
                        style={{ color: colors.textMuted }}
                      >
                        {percentage.toFixed(0)}% del totale
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount + chevron */}
                <div className="flex items-center gap-2">
                  <p
                    className="text-xl font-bold"
                    style={{ color: userColor }}
                  >
                    {user.total.toFixed(0)} €
                  </p>
                  <ChevronDown
                    size={18}
                    color={colors.textMuted}
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Dettaglio espandibile */}
              {isExpanded && renderExpenseDetails(user.uid)}
            </div>
          );
        })}
      </div>

      {/* Sezione Membri Usciti (solo se presenti) */}
      {leftMembers.length > 0 && (
        <div className="mt-8 pt-6 border-t" style={{ borderColor: colors.border }}>
          {/* Header sezione */}
          <div className="flex items-center gap-2 mb-4" style={{ opacity: 0.6 }}>
            <UserMinus size={16} color={colors.textMuted} />
            <span className="text-sm font-medium" style={{ color: colors.textMuted }}>
              Membri usciti
            </span>
          </div>

          {/* Lista membri usciti */}
          <div className="space-y-3" style={{ opacity: 0.5 }}>
            {leftMembers.map((member) => {
              const isExpanded = expandedUserId === member.uid;

              return (
                <div key={member.uid} className="py-2">
                  {/* Header cliccabile */}
                  <button
                    onClick={() => setExpandedUserId(isExpanded ? null : member.uid)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar con stile opaco */}
                      <div className="relative">
                        <Avatar
                          src={member.avatar}
                          name={member.displayName}
                          size="md"
                        />
                      </div>

                      {/* Nome + status */}
                      <div className="text-left">
                        <p
                          className="text-base font-medium"
                          style={{ color: colors.text }}
                        >
                          {member.displayName}
                        </p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {member.status === 'left' ? 'Ha abbandonato' : 'Rimosso'}
                        </p>
                      </div>
                    </div>

                    {/* Amount + chevron */}
                    <div className="flex items-center gap-2">
                      <p
                        className="text-lg font-semibold"
                        style={{ color: colors.textMuted }}
                      >
                        {member.totalPaid > 0 ? `${member.totalPaid.toFixed(0)} €` : '0 €'}
                      </p>
                      {(member.totalPaid > 0 || (member.byCategory && Object.keys(member.byCategory).length > 0)) && (
                        <ChevronDown
                          size={16}
                          color={colors.textMuted}
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      )}
                    </div>
                  </button>

                  {/* Dettaglio espandibile - usa i dati snapshot */}
                  {isExpanded && (member.byCategory && Object.keys(member.byCategory).length > 0) && (
                    <div className="mt-3 space-y-2 ml-12">
                      {Object.entries(member.byCategory).map(([categoryName, categoryData]) => (
                        <div
                          key={categoryName}
                          className="rounded-lg p-2"
                          style={{ backgroundColor: colors.bgCard }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm" style={{ color: colors.text }}>
                              {categoryName}
                            </span>
                            <span className="text-sm font-medium" style={{ color: colors.textMuted }}>
                              {categoryData.total.toFixed(2)} €
                            </span>
                          </div>
                          {/* Lista item */}
                          {categoryData.items && categoryData.items.length > 0 && (
                            <div className="space-y-0.5">
                              {categoryData.items.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-0.5"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ color: colors.textMuted }}>G{item.day}</span>
                                    <span style={{ color: colors.text }}>{item.title}</span>
                                  </div>
                                  <span style={{ color: colors.textMuted }}>
                                    {item.amount.toFixed(2)} €
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Nota esplicativa */}
                      <p className="text-xs italic pt-2" style={{ color: colors.textMuted }}>
                        Queste spese non sono incluse nei totali attuali
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CostsByUser;
