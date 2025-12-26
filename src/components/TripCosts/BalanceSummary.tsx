import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { colors, rawColors } from '../../styles/theme';
import { getUserTotalInTrip, calculateTripCost } from '../../utils/costsUtils';
import { Avatar } from '../ui';

// ============================================
// ALTROVE - BalanceSummary
// Chi deve a chi - stile moderno
// ============================================

interface BalanceSummaryProps {
  trip: any;
  isDesktop?: boolean;
}

interface Transfer {
  from: { uid: string; displayName: string; avatar?: string };
  to: { uid: string; displayName: string; avatar?: string };
  amount: number;
}

const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  trip,
  isDesktop = false
}) => {
  // Calcola bilanci e trasferimenti necessari
  const { balances, transfers, isBalanced } = useMemo(() => {
    if (!trip.sharing?.members) {
      return { balances: [], transfers: [], isBalanced: true };
    }

    const members = Object.entries(trip.sharing.members)
      .filter(([_, m]: [string, any]) => m.status === 'active')
      .map(([uid, m]: [string, any]) => ({
        uid,
        displayName: m.displayName || 'Utente',
        avatar: m.avatar
      }));

    if (members.length <= 1) {
      return { balances: [], transfers: [], isBalanced: true };
    }

    // Calcola totale viaggio e quota equa
    const totalCost = calculateTripCost(trip);
    const fairShare = totalCost / members.length;

    // Calcola bilancio per ogni membro
    const memberBalances = members.map(member => {
      const paid = getUserTotalInTrip(trip, member.uid);
      const balance = paid - fairShare;

      return {
        ...member,
        paid,
        fairShare,
        balance
      };
    });

    // Ordina per bilancio (creditori prima, debitori dopo)
    memberBalances.sort((a, b) => b.balance - a.balance);

    // Calcola trasferimenti ottimali (algoritmo greedy)
    const creditors = memberBalances.filter(m => m.balance > 0.01).map(m => ({ ...m }));
    const debtors = memberBalances.filter(m => m.balance < -0.01).map(m => ({ ...m }));
    const calculatedTransfers: Transfer[] = [];

    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];

      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

      if (amount > 0.01) {
        calculatedTransfers.push({
          from: { uid: debtor.uid, displayName: debtor.displayName, avatar: debtor.avatar },
          to: { uid: creditor.uid, displayName: creditor.displayName, avatar: creditor.avatar },
          amount: Math.round(amount * 100) / 100
        });
      }

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance < 0.01) i++;
      if (debtor.balance > -0.01) j++;
    }

    const allBalanced = memberBalances.every(m => Math.abs(m.balance) < 0.01);

    return {
      balances: memberBalances,
      transfers: calculatedTransfers,
      isBalanced: allBalanced
    };
  }, [trip]);

  if (balances.length <= 1) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ backgroundColor: colors.bgCard }}
      >
        <p
          className="text-sm italic"
          style={{ color: colors.textPlaceholder }}
        >
          Aggiungi altri partecipanti per vedere i bilanci
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stato bilanci per persona */}
      <div className="space-y-3">
        {balances.map(member => {
          const isCredit = member.balance > 0.01;
          const isDebit = member.balance < -0.01;
          const statusColor = isCredit ? rawColors.success : isDebit ? rawColors.danger : colors.textMuted;

          return (
            <div
              key={member.uid}
              className="rounded-2xl p-4"
              style={{ backgroundColor: `${statusColor}10` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatar}
                    name={member.displayName}
                    size="md"
                  />
                  <div>
                    <p
                      className="text-base font-semibold"
                      style={{ color: colors.text }}
                    >
                      {member.displayName}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      Ha pagato {member.paid.toFixed(0)} €
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className="text-xl font-bold"
                    style={{ color: statusColor }}
                  >
                    {isCredit && '+'}
                    {member.balance.toFixed(0)} €
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: colors.textMuted }}
                  >
                    {isCredit ? 'da ricevere' : isDebit ? 'da dare' : 'in pari'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trasferimenti necessari */}
      {transfers.length > 0 ? (
        <div className="space-y-3">
          <p
            className="text-sm font-semibold px-1"
            style={{ color: colors.text }}
          >
            Per pareggiare i conti
          </p>

          {transfers.map((transfer, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4"
              style={{ backgroundColor: `${rawColors.accent}10` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* From */}
                  <Avatar
                    src={transfer.from.avatar}
                    name={transfer.from.displayName}
                    size="sm"
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.text }}
                  >
                    {transfer.from.displayName}
                  </span>

                  {/* Arrow */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center mx-1"
                    style={{ backgroundColor: rawColors.accent }}
                  >
                    <ArrowRight size={14} color="white" />
                  </div>

                  {/* To */}
                  <Avatar
                    src={transfer.to.avatar}
                    name={transfer.to.displayName}
                    size="sm"
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.text }}
                  >
                    {transfer.to.displayName}
                  </span>
                </div>

                {/* Amount */}
                <span
                  className="text-lg font-bold"
                  style={{ color: rawColors.accent }}
                >
                  {transfer.amount.toFixed(0)} €
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl p-6 flex items-center justify-center gap-3"
          style={{ backgroundColor: `${rawColors.success}10` }}
        >
          <CheckCircle size={24} color={rawColors.success} />
          <span
            className="text-base font-semibold"
            style={{ color: rawColors.success }}
          >
            Tutti i conti sono in pari!
          </span>
        </div>
      )}
    </div>
  );
};

export default BalanceSummary;
