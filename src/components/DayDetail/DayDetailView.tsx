import React, { useState, useMemo, useEffect } from 'react';
import { ALTROVE_COLORS } from '../../utils/constants';
import { useDayData } from '../../hooks/useDayData';
import { calculateDayCost } from '../../utils/costsUtils';
import TabBar from './tabs/TabBar';
import PlanningTab from './tabs/PlanningTab';
import NotesTab from './tabs/NotesTab';
import ExpensesTab from './tabs/ExpensesTab';

// ============================================
// ALTROVE - DayDetailView
// Orchestrator principale - snello e pulito
// ============================================

type TabId = 'planning' | 'notes' | 'expenses';

interface DayDetailViewProps {
  trip: any;
  dayIndex: number;
  onUpdateTrip: (updates: any) => void;
  onBack?: (() => void) | null;
  onChangeDayIndex: (index: number) => void;
  isDesktop?: boolean;
  user: any;
  highlightCategoryId?: string | null;
  onClosePanel?: () => void;
  initialTab?: TabId;
}

const DayDetailView: React.FC<DayDetailViewProps> = ({
  trip,
  dayIndex,
  onUpdateTrip,
  onChangeDayIndex,
  isDesktop = false,
  user,
  highlightCategoryId = null,
  onClosePanel,
  initialTab,
}) => {
  const currentDay = trip.days[dayIndex] || trip.days[0];

  // State
  const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'planning');

  // Reagisci a cambiamenti di initialTab (navigazione esterna)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Auto-switch a tab Planning quando viene evidenziata una categoria
  useEffect(() => {
    if (highlightCategoryId) {
      const planningCategories = ['destinazione', 'attivita', 'pernottamento'];
      if (planningCategories.includes(highlightCategoryId)) {
        setActiveTab('planning');
      } else if (highlightCategoryId === 'note') {
        setActiveTab('notes');
      }
    }
  }, [highlightCategoryId]);

  // Hooks
  const {
    categoryData,
    updateCategory,
    updateCategoryMultiple,
    updateActivities
  } = useDayData(trip, currentDay, onUpdateTrip, user.uid);

  // Memoized values
  const dayCost = useMemo(() =>
    calculateDayCost(currentDay, trip.data, trip.sharing?.members),
    [currentDay, trip.data, trip.sharing?.members]
  );

  const activeMembers = useMemo(() => {
    if (!trip.sharing?.members) return [];
    return Object.entries(trip.sharing.members)
      .filter(([_, m]: [string, any]) => m.status === 'active')
      .map(([uid, m]: [string, any]) => ({
        uid,
        displayName: m.displayName,
        avatar: m.avatar
      }));
  }, [trip.sharing?.members]);

  // Formatta data per header
  const dateString = currentDay.date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: ALTROVE_COLORS.bgCard }}
    >
      {/* Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        expensesTotal={dayCost}
        hasNotes={!!categoryData?.note?.notes?.trim()}
        isDesktop={isDesktop}
        onClosePanel={onClosePanel}
      />

      {/* Tab Content */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {activeTab === 'planning' && (
          <PlanningTab
            trip={trip}
            currentDay={currentDay}
            categoryData={categoryData}
            updateCategory={updateCategory}
            updateCategoryMultiple={updateCategoryMultiple}
            onUpdateTrip={onUpdateTrip}
            currentUserId={user.uid}
            tripMembers={trip.sharing?.members}
            activeMembers={activeMembers}
            isDesktop={isDesktop}
            highlightCategoryId={highlightCategoryId}
            dayNumber={currentDay.number}
            dateString={dateString}
            dayIndex={dayIndex}
            totalDays={trip.days.length}
            onChangeDayIndex={onChangeDayIndex}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            notes={categoryData?.note?.notes || ''}
            onUpdateNotes={(value) => updateCategory('note', 'notes', value)}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            trip={trip}
            currentDay={currentDay}
            currentUserId={user.uid}
            activeMembers={activeMembers}
            isDesktop={isDesktop}
            onUpdateTrip={onUpdateTrip}
          />
        )}
      </div>
    </div>
  );
};

export default DayDetailView;