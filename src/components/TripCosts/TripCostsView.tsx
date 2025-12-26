import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronDown, Users, Scale, TrendingUp, Download } from 'lucide-react';
import { exportExpensesAsCSV } from '../../services/expenseExportService';
import { colors, rawColors } from '../../styles/theme';
import { getCostStats } from '../../utils/costsUtils';
import { ActivityType, getActivityTypeConfig, ACTIVITY_TYPE_CONFIG } from '../../utils/activityTypes';
import CostsByUser from './CostsByUser';
import BalanceSummary from './BalanceSummary';

// ============================================
// ALTROVE - TripCostsView
// Vista riepilogo spese unificata
// ============================================

type TabId = 'overview' | 'user' | 'balance';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  requiresMultipleMembers?: boolean;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Riepilogo', icon: TrendingUp },
  { id: 'user', label: 'Persone', icon: Users },
  { id: 'balance', label: 'Bilanci', icon: Scale, requiresMultipleMembers: true },
];

// Interfacce per spese per tipologia
interface ExpenseDetail {
  dayNumber: number;
  destination: string;
  title: string;
  amount: number;
}

interface ExpensesByType {
  [key: string]: {
    config: typeof ACTIVITY_TYPE_CONFIG[ActivityType];
    expenses: ExpenseDetail[];
    total: number;
  };
}

interface TripCostsViewProps {
  trip: any;
  onBack: () => void;
  isDesktop?: boolean;
}

const TripCostsView: React.FC<TripCostsViewProps> = ({
  trip,
  onBack,
  isDesktop = false
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Calcoli
  const stats = useMemo(() => getCostStats(trip), [trip]);

  const activeMembers = useMemo(() => {
    if (!trip.sharing?.members) return 1;
    return Object.values(trip.sharing.members)
      .filter((m: any) => m.status === 'active').length || 1;
  }, [trip.sharing?.members]);

  const perPerson = stats.total / activeMembers;
  const numDays = trip.days?.length || 1;

  // Calcola spese raggruppate per tipologia (activityType)
  const expensesByType = useMemo((): ExpensesByType => {
    const byType: ExpensesByType = {};
    const tripMembers = trip.sharing?.members || null;

    trip.days.forEach((day: any) => {
      // Recupera la destinazione del giorno
      const destKey = `${day.id}-destinazione`;
      const destData = trip.data[destKey];
      const destination = destData?.title || '';

      // Attività
      const actKey = `${day.id}-attivita`;
      const actData = trip.data[actKey];
      if (actData?.activities && Array.isArray(actData.activities)) {
        actData.activities.forEach((activity: any) => {
          // Calcola il totale della spesa
          let amount = 0;
          if (activity.costBreakdown && Array.isArray(activity.costBreakdown)) {
            // Filtra solo membri attivi
            activity.costBreakdown.forEach((entry: any) => {
              if (!tripMembers || tripMembers[entry.userId]?.status === 'active') {
                amount += entry.amount || 0;
              }
            });
          } else if (activity.cost) {
            amount = parseFloat(activity.cost) || 0;
          }

          if (amount > 0) {
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
              destination,
              title: activity.title || 'Attività',
              amount
            });
            byType[actType].total += amount;
          }
        });
      }

      // Pernottamento
      const accKey = `${day.id}-pernottamento`;
      const accData = trip.data[accKey];
      if (accData) {
        let amount = 0;
        if (accData.costBreakdown && Array.isArray(accData.costBreakdown)) {
          accData.costBreakdown.forEach((entry: any) => {
            if (!tripMembers || tripMembers[entry.userId]?.status === 'active') {
              amount += entry.amount || 0;
            }
          });
        } else if (accData.cost) {
          amount = parseFloat(accData.cost) || 0;
        }

        if (amount > 0) {
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
            destination,
            title: accData.title || 'Pernottamento',
            amount
          });
          byType[actType].total += amount;
        }
      }
    });

    return byType;
  }, [trip]);

  // Tipologie ordinate per totale decrescente
  const sortedTypes = useMemo(() => {
    return Object.entries(expensesByType)
      .sort(([, a], [, b]) => b.total - a.total);
  }, [expensesByType]);

  // Filtra tab in base ai membri
  const visibleTabs = TABS.filter(tab =>
    !tab.requiresMultipleMembers || activeMembers > 1
  );

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            {/* Hero Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Totale */}
              <div
                className="col-span-2 rounded-2xl p-5 text-center"
                style={{ backgroundColor: `${rawColors.accent}15` }}
              >
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: colors.textMuted }}
                >
                  Totale Viaggio
                </p>
                <p
                  className="text-3xl font-bold"
                  style={{ color: rawColors.accent }}
                >
                  {stats.total.toFixed(2)} €
                </p>
              </div>

              {/* Per Giorno */}
              <div
                className="rounded-2xl p-4 text-center"
                style={{ backgroundColor: colors.bgCard }}
              >
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: colors.textMuted }}
                >
                  Media giornaliera
                </p>
                <p
                  className="text-xl font-bold"
                  style={{ color: colors.text }}
                >
                  {stats.avgPerDay.toFixed(0)} €
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: colors.textMuted }}
                >
                  {numDays} {numDays === 1 ? 'giorno' : 'giorni'}
                </p>
              </div>

              {/* Per Persona */}
              <div
                className="rounded-2xl p-4 text-center"
                style={{ backgroundColor: colors.bgCard }}
              >
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: colors.textMuted }}
                >
                  Per persona
                </p>
                <p
                  className="text-xl font-bold"
                  style={{ color: colors.text }}
                >
                  {perPerson.toFixed(0)} €
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: colors.textMuted }}
                >
                  {activeMembers} {activeMembers === 1 ? 'partecipante' : 'partecipanti'}
                </p>
              </div>
            </div>

            {/* Barra stacked delle tipologie */}
            {sortedTypes.length > 0 && (
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                {sortedTypes.map(([typeKey, typeData]) => {
                  const percentage = (typeData.total / (stats.total || 1)) * 100;
                  if (percentage === 0) return null;
                  return (
                    <div
                      key={typeKey}
                      className="transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: typeData.config.color
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Tipologie espandibili */}
            <div className="space-y-2">
              {sortedTypes.map(([typeKey, typeData]) => {
                const IconComponent = typeData.config.selectorIcon;
                const percentage = stats.total > 0 ? (typeData.total / stats.total) * 100 : 0;
                const isExpanded = expandedType === typeKey;

                return (
                  <div key={typeKey}>
                    {/* Header tipologia cliccabile */}
                    <button
                      onClick={() => setExpandedType(isExpanded ? null : typeKey)}
                      className="w-full flex items-center justify-between py-3 px-1"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${typeData.config.color}20` }}
                        >
                          <IconComponent size={18} color={typeData.config.color} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-medium" style={{ color: colors.text }}>
                              {typeData.config.label}
                            </span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `${typeData.config.color}20`, color: typeData.config.color }}
                            >
                              {typeData.expenses.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {/* Mini barra percentuale */}
                            <div
                              className="w-16 h-1.5 rounded-full overflow-hidden"
                              style={{ backgroundColor: `${typeData.config.color}20` }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: typeData.config.color
                                }}
                              />
                            </div>
                            <span className="text-xs" style={{ color: colors.textMuted }}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="text-lg font-bold"
                          style={{ color: typeData.config.color }}
                        >
                          {typeData.total.toFixed(0)} €
                        </span>
                        <ChevronDown
                          size={18}
                          color={colors.textMuted}
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {/* Dettaglio spese espandibile */}
                    {isExpanded && (
                      <div
                        className="rounded-xl p-3 mb-2 ml-13"
                        style={{ backgroundColor: `${typeData.config.color}08`, marginLeft: '52px' }}
                      >
                        <div className="space-y-1">
                          {[...typeData.expenses].sort((a, b) => b.amount - a.amount).map((expense, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-1.5"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span
                                  className="text-xs font-medium shrink-0"
                                  style={{ color: colors.textMuted }}
                                >
                                  G{expense.dayNumber}
                                  {expense.destination && (
                                    expense.destination.includes(' → ')
                                      ? ` · ${expense.destination.split(' → ')[0].substring(0, 3).toUpperCase()} → ${expense.destination.split(' → ')[1].substring(0, 3).toUpperCase()}`
                                      : ` · ${expense.destination}`
                                  )}
                                </span>
                                <span className="text-sm truncate" style={{ color: colors.text }}>
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
                    )}
                  </div>
                );
              })}
            </div>

            {/* Messaggio se vuoto */}
            {sortedTypes.length === 0 && (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ backgroundColor: colors.bgCard }}
              >
                <p
                  className="text-sm italic"
                  style={{ color: colors.textPlaceholder }}
                >
                  Nessuna spesa registrata
                </p>
              </div>
            )}

            {/* Pulsante Export CSV - solo in overview */}
            {stats.total > 0 && (
              <button
                onClick={() => exportExpensesAsCSV(trip)}
                className="w-full flex items-center justify-center gap-2 py-4 mt-6 transition-opacity hover:opacity-70"
                style={{ color: colors.textMuted, opacity: 0.6 }}
              >
                <Download size={16} />
                <span className="text-sm">Scarica report CSV</span>
              </button>
            )}
          </div>
        );

      case 'user':
        return (
          <CostsByUser
            trip={trip}
            isDesktop={isDesktop}
          />
        );

      case 'balance':
        return (
          <BalanceSummary
            trip={trip}
            isDesktop={isDesktop}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: colors.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: colors.bgCard }}
      >
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full transition-colors active:bg-gray-100"
        >
          <ChevronLeft size={24} color={colors.text} />
        </button>
        <h1
          className="text-lg font-semibold flex-1"
          style={{ color: colors.text }}
        >
          Riepilogo Spese
        </h1>
      </div>

      {/* Tab Bar con underline animata */}
      <div
        className="px-4 border-b"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.border
        }}
      >
        <div className="relative flex">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors duration-200"
                style={{
                  color: isActive ? rawColors.accent : colors.textMuted
                }}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}

          {/* Underline animata */}
          <div
            className="absolute bottom-0 h-0.5 rounded-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: rawColors.accent,
              width: `calc(${100 / visibleTabs.length}% - 32px)`,
              left: `calc(${(visibleTabs.findIndex(t => t.id === activeTab) / visibleTabs.length) * 100}% + 16px)`
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default TripCostsView;
