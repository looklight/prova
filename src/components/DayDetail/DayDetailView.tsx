import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '../../utils/constants';
import { calculateDayCost, calculateTripCost } from '../../utils/costsUtils';
import { useDayData } from '../../hooks/useDayData';
import { useMediaHandlers } from '../../hooks/useMediaHandlers';
import { useSuggestions } from '../../hooks/useSuggestions';
import DayHeader from './DayHeader';
import CategoryCard from './CategoryCard';
import OtherExpensesSection from './OtherExpensesSection';
import CostSummary from './CostSummary';
import MediaDialog from './MediaDialog';
import CostBreakdownModal from './CostBreakdownModal';
import CostSummaryByUserView from './CostSummaryByUserView';

const DayDetailView = ({ trip, dayIndex, onUpdateTrip, onBack, onChangeDayIndex, isDesktop = false, user }) => {
  // 🆕 Safety check: se dayIndex è invalido, non renderizzare nulla
  if (dayIndex === null || dayIndex === undefined || dayIndex >= trip.days.length || dayIndex < 0) {
    console.warn('⚠️ DayDetailView: dayIndex invalido', dayIndex);
    return null;
  }

  const currentDay = trip.days[dayIndex];

  // Custom Hooks
  const { categoryData, otherExpenses, updateCategory, updateOtherExpense, removeOtherExpense, addOtherExpense } =
    useDayData(trip, currentDay, onUpdateTrip, user.uid);

  const mediaHandlers = useMediaHandlers(categoryData, updateCategory);
  const { getSuggestion } = useSuggestions(trip, dayIndex, categoryData);

  // Local State
  const [transportSelectorOpen, setTransportSelectorOpen] = useState({});
  const [costBreakdownModal, setCostBreakdownModal] = useState({
    isOpen: false,
    categoryId: null,
    expenseId: null
  });
  const [showFullSummary, setShowFullSummary] = useState(false);

  // ✅ Calcoli costi con useMemo per performance
  const dayCost = useMemo(() => {
    return calculateDayCost(currentDay, trip.data);
  }, [currentDay.id, trip.data]);

  const tripCost = useMemo(() => {
    return calculateTripCost(trip);
  }, [trip.data, trip.days]);

  // Prepara membri attivi del viaggio
  const activeMembers = useMemo(() => {
    return Object.entries(trip.sharing.members)
      .filter(([_, member]) => member.status === 'active')
      .map(([uid, member]) => ({
        uid,
        displayName: member.displayName,
        avatar: member.avatar
      }));
  }, [trip.sharing.members]);

  // Handler apertura modal breakdown per categoria
  const handleOpenCategoryBreakdown = (categoryId) => {
    setCostBreakdownModal({ isOpen: true, categoryId, expenseId: null });
  };

  // Handler apertura modal breakdown per altre spese
  const handleOpenExpenseBreakdown = (expenseId) => {
    setCostBreakdownModal({ isOpen: true, categoryId: null, expenseId });
  };

  // 🆕 Handler conferma breakdown - ora gestisce anche participants
  const handleConfirmBreakdown = (breakdown, participants) => {
    if (costBreakdownModal.categoryId) {
      // Aggiorna breakdown
      updateCategory(costBreakdownModal.categoryId, 'costBreakdown', breakdown);
      // 🆕 Aggiorna participants
      updateCategory(costBreakdownModal.categoryId, 'participants', participants);
    } else if (costBreakdownModal.expenseId !== null) {
      // Aggiorna breakdown
      updateOtherExpense(costBreakdownModal.expenseId, 'costBreakdown', breakdown);
      // 🆕 Aggiorna participants
      updateOtherExpense(costBreakdownModal.expenseId, 'participants', participants);
    }
  };

  // Se mostra riepilogo completo, renderizza quella vista
  if (showFullSummary) {
    return (
      <CostSummaryByUserView
        trip={trip}
        onBack={() => setShowFullSummary(false)}
        isDesktop={isDesktop}
        origin="dayDetail"
        onUpdateTrip={onUpdateTrip}
      />
    );
  }

  return (
    <div className={`bg-gray-50 ${isDesktop ? 'h-full overflow-y-auto' : 'min-h-screen'}`} style={{
      maxWidth: isDesktop ? '100%' : '430px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <DayHeader
        trip={trip}
        currentDay={currentDay}
        dayIndex={dayIndex}
        onBack={onBack}
        onChangeDayIndex={onChangeDayIndex}
        isDesktop={isDesktop}
      />

      {/* Main Content */}
      <div className="p-4 space-y-3">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            categoryData={categoryData[category.id]}
            suggestion={getSuggestion(category.id)}
            transportSelectorOpen={transportSelectorOpen[category.id] || false}
            onToggleTransportSelector={() => setTransportSelectorOpen(prev => ({
              ...prev,
              [category.id]: !prev[category.id]
            }))}
            onUpdateCategory={updateCategory}
            onMediaDialogOpen={(type) => mediaHandlers.setMediaDialogOpen({ type, categoryId: category.id })}
            onImageUpload={(file) => mediaHandlers.addImage(category.id, file)}
            onRemoveMedia={(mediaType, itemId) => mediaHandlers.removeMedia(category.id, mediaType, itemId)}
            onEditNote={(note) => {
              mediaHandlers.setEditingNote(note);
              mediaHandlers.setNoteInput(note.text);
              mediaHandlers.setMediaDialogOpen({ type: 'note', categoryId: category.id });
            }}
            onOpenCostBreakdown={() => handleOpenCategoryBreakdown(category.id)}
            currentUserId={user.uid}
          />
        ))}

        <OtherExpensesSection
          expenses={otherExpenses}
          onUpdate={updateOtherExpense}
          onRemove={removeOtherExpense}
          onAdd={addOtherExpense}
          onOpenCostBreakdown={handleOpenExpenseBreakdown}
          currentUserId={user.uid}
        />

        <CostSummary
          dayCost={dayCost}
          tripCost={tripCost}
          currentDayNumber={currentDay.number}
          onOpenFullSummary={() => setShowFullSummary(true)}
        />
      </div>

      {/* Media Dialog */}
      <MediaDialog
        isOpen={!!mediaHandlers.mediaDialogOpen}
        type={mediaHandlers.mediaDialogOpen?.type || null}
        isDesktop={isDesktop}
        linkInput={mediaHandlers.linkInput}
        linkTitle={mediaHandlers.linkTitle}
        videoInput={mediaHandlers.videoInput}
        noteInput={mediaHandlers.noteInput}
        editingNote={mediaHandlers.editingNote}
        onClose={mediaHandlers.handleMediaDialogClose}
        onLinkInputChange={mediaHandlers.setLinkInput}
        onLinkTitleChange={mediaHandlers.setLinkTitle}
        onVideoInputChange={mediaHandlers.setVideoInput}
        onNoteInputChange={mediaHandlers.setNoteInput}
        onSubmit={() => mediaHandlers.handleMediaDialogSubmit(mediaHandlers.mediaDialogOpen?.categoryId)}
      />

      {/* Cost Breakdown Modal */}
      <CostBreakdownModal
        isOpen={costBreakdownModal.isOpen}
        isDesktop={isDesktop}
        categoryLabel={
          costBreakdownModal.categoryId
            ? CATEGORIES.find(c => c.id === costBreakdownModal.categoryId)?.label || 'Spesa'
            : otherExpenses.find(e => e.id === costBreakdownModal.expenseId)?.title || 'Altra Spesa'
        }
        currentUserId={user.uid}
        tripMembers={activeMembers}
        existingBreakdown={
          costBreakdownModal.categoryId
            ? categoryData[costBreakdownModal.categoryId]?.costBreakdown || null
            : otherExpenses.find(e => e.id === costBreakdownModal.expenseId)?.costBreakdown || null
        }
        existingParticipants={
          costBreakdownModal.categoryId
            ? categoryData[costBreakdownModal.categoryId]?.participants || null
            : otherExpenses.find(e => e.id === costBreakdownModal.expenseId)?.participants || null
        }
        onClose={() => setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null })}
        onConfirm={handleConfirmBreakdown}
      />
    </div>
  );
};

export default DayDetailView;