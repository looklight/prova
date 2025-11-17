import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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

const DayDetailView = ({
  trip,
  dayIndex,
  onUpdateTrip,
  onBack,
  onChangeDayIndex,
  isDesktop = false,
  user,
  highlightCategoryId = null
}) => {
  // Safety check
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
  const [showEmptyCategories, setShowEmptyCategories] = useState(false);
  const [highlightedCategory, setHighlightedCategory] = useState(null);

  const hasScrolledRef = useRef(false);
  const [layoutSnapshot, setLayoutSnapshot] = useState(null);

  const calculateHasData = useCallback((catId, dataSource) => {
    const key = `${currentDay.id}-${catId}`;
    const data = dataSource[key];

    if (!data) return false;

    return Boolean(
      data.title?.trim() ||
      data.cost?.trim() ||
      data.links?.length ||
      data.images?.length ||
      data.videos?.length ||
      data.mediaNotes?.length ||
      data.notes?.trim()
    );
  }, [currentDay.id]);

  useEffect(() => {
    const alwaysVisible = ['base', 'note'];
    const frozenData = trip.data;

    const snapshot = {
      categoriesWithData: CATEGORIES
        .filter(cat => cat.id !== 'otherExpenses')
        .filter(cat =>
          alwaysVisible.includes(cat.id) || calculateHasData(cat.id, frozenData)
        ),
      categoriesWithoutData: CATEGORIES
        .filter(cat => cat.id !== 'otherExpenses')
        .filter(cat =>
          !alwaysVisible.includes(cat.id) && !calculateHasData(cat.id, frozenData)
        )
    };

    setLayoutSnapshot(snapshot);
    console.log('📸 Snapshot layout aggiornato per giorno', dayIndex);
  }, [dayIndex, calculateHasData]);

  const alwaysVisible = ['base', 'note'];
  const categoriesWithData = layoutSnapshot?.categoriesWithData || [];
  const categoriesWithoutData = layoutSnapshot?.categoriesWithoutData || [];

  useEffect(() => {
    const hasRealData = categoriesWithData.length > alwaysVisible.length;

    if (!hasRealData) {
      setShowEmptyCategories(true);
    } else {
      setShowEmptyCategories(false);
    }
  }, [dayIndex, categoriesWithData.length]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [dayIndex, highlightCategoryId]);

  useEffect(() => {
    if (!highlightCategoryId || hasScrolledRef.current) return;

    const key = `${currentDay.id}-${highlightCategoryId}`;
    const data = trip.data[key];

    const categoryHasData = Boolean(
      data?.title?.trim() ||
      data?.cost?.trim() ||
      data?.links?.length ||
      data?.images?.length ||
      data?.videos?.length ||
      data?.mediaNotes?.length ||
      data?.notes?.trim()
    );

    const alwaysVisible = ['base', 'note'];
    const isAlwaysVisible = alwaysVisible.includes(highlightCategoryId);
    const needsDropdown = !categoryHasData && !isAlwaysVisible;

    if (needsDropdown && !showEmptyCategories) {
      console.log('📂 Espando dropdown per categoria nascosta:', highlightCategoryId);
      setShowEmptyCategories(true);

      setTimeout(() => {
        scrollToAndHighlight(highlightCategoryId);
        hasScrolledRef.current = true;
      }, 350);
    } else {
      setTimeout(() => {
        scrollToAndHighlight(highlightCategoryId);
        hasScrolledRef.current = true;
      }, 100);
    }
  }, [highlightCategoryId, currentDay.id, showEmptyCategories]);

  const scrollToAndHighlight = (categoryId, retryCount = 0) => {
    const element = document.getElementById(`category-${categoryId}`);

    if (element) {
      console.log('✅ Scrolling a categoria:', categoryId);
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      setHighlightedCategory(categoryId);

      setTimeout(() => {
        setHighlightedCategory(null);
      }, 800);
    } else {
      console.warn(`⚠️ Elemento #category-${categoryId} non trovato (tentativo ${retryCount + 1}/3)`);

      if (retryCount < 3) {
        setTimeout(() => {
          scrollToAndHighlight(categoryId, retryCount + 1);
        }, 200 * (retryCount + 1));
      } else {
        console.error(`❌ Impossibile trovare elemento #category-${categoryId} dopo 3 tentativi`);
      }
    }
  };

  const dayCost = useMemo(() => {
    return calculateDayCost(currentDay, trip.data, trip.sharing?.members);
  }, [currentDay.id, trip.data, trip.sharing?.members]);

  const tripCost = useMemo(() => {
    return calculateTripCost(trip);
  }, [trip.data, trip.days, trip.sharing?.members]);

  const activeMembers = useMemo(() => {
    return Object.entries(trip.sharing.members)
      .filter(([_, member]) => member.status === 'active')
      .map(([uid, member]) => ({
        uid,
        displayName: member.displayName,
        avatar: member.avatar
      }));
  }, [trip.sharing.members]);

  const handleOpenCategoryBreakdown = (categoryId) => {
    setCostBreakdownModal({ isOpen: true, categoryId, expenseId: null });
  };

  const handleOpenExpenseBreakdown = (expenseId) => {
    setCostBreakdownModal({ isOpen: true, categoryId: null, expenseId });
  };

  // 🔧 FIX CRITICO: Salvataggio atomico di breakdown + participants + timestamp
  const handleConfirmBreakdown = (breakdown, participants) => {
    console.log('✅ [handleConfirmBreakdown] Ricevuto:', { breakdown, participants });

    // 🆕 Gestisci RESET_ALL
    if (breakdown === 'RESET_ALL') {
      if (costBreakdownModal.categoryId) {
        const categoryId = costBreakdownModal.categoryId;
        const category = CATEGORIES.find(c => c.id === categoryId);
        const key = `${currentDay.id}-${categoryId}`;

        // Reset completo a stato vergine
        const emptyData = {
          title: '',
          cost: '',
          costBreakdown: null,
          participants: null,
          participantsUpdatedAt: null,  // 🆕 Reset anche timestamp
          hasSplitCost: false,
          bookingStatus: 'na',
          transportMode: categoryId.startsWith('spostamenti') ? 'treno' : 'none',
          links: [],
          images: [],
          videos: [],
          mediaNotes: [],
          notes: ''
        };

        console.log(`🧹 Reset categoria: ${category?.label}`);

        onUpdateTrip({
          ...trip,
          data: {
            ...trip.data,
            [key]: emptyData
          }
        });
      }
      return;
    }

    // ✅ FIX: Salvataggio ATOMICO per categorie normali CON TIMESTAMP
    if (costBreakdownModal.categoryId) {
      const categoryId = costBreakdownModal.categoryId;
      const key = `${currentDay.id}-${categoryId}`;
      const currentData = trip.data[key] || {};

      // Calcola totale
      const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0);

      // ✅ AGGIORNA TUTTO INSIEME in un'unica operazione
      const updatedData = {
        ...currentData,
        participants: participants,
        participantsUpdatedAt: new Date(),  // 🆕 Timestamp aggiornamento
        costBreakdown: breakdown,
        cost: total.toString(),
        hasSplitCost: breakdown.length > 1
      };

      console.log('💾 [Categoria] Salvataggio atomico con timestamp:', {
        categoryId,
        participants,
        participantsUpdatedAt: updatedData.participantsUpdatedAt,
        breakdown: breakdown.length,
        total
      });

      onUpdateTrip({
        ...trip,
        data: {
          ...trip.data,
          [key]: updatedData
        }
      });

    }
    // ✅ FIX: Salvataggio ATOMICO per altre spese CON TIMESTAMP
    else if (costBreakdownModal.expenseId !== null) {
      const key = `${currentDay.id}-otherExpenses`;
      const expensesArray = trip.data[key] || [];

      const expenseIndex = expensesArray.findIndex(e => e.id === costBreakdownModal.expenseId);
      if (expenseIndex === -1) {
        console.warn('⚠️ Spesa non trovata:', costBreakdownModal.expenseId);
        return;
      }

      const total = breakdown.reduce((sum, entry) => sum + entry.amount, 0);

      // ✅ AGGIORNA TUTTO INSIEME in un'unica operazione
      const updatedExpenses = [...expensesArray];
      updatedExpenses[expenseIndex] = {
        ...updatedExpenses[expenseIndex],
        participants: participants,
        participantsUpdatedAt: new Date(),  // 🆕 Timestamp aggiornamento
        costBreakdown: breakdown,
        cost: total.toString(),
        hasSplitCost: breakdown.length > 1
      };

      console.log('💾 [OtherExpense] Salvataggio atomico con timestamp:', {
        expenseId: costBreakdownModal.expenseId,
        participants,
        participantsUpdatedAt: updatedExpenses[expenseIndex].participantsUpdatedAt
      });

      onUpdateTrip({
        ...trip,
        data: {
          ...trip.data,
          [key]: updatedExpenses
        }
      });
    }
  };

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
      margin: isDesktop ? '0' : '0 auto'
    }}>
      <DayHeader
        trip={trip}
        currentDay={currentDay}
        dayIndex={dayIndex}
        onBack={onBack}
        onChangeDayIndex={onChangeDayIndex}
        isDesktop={isDesktop}
      />

      <div className="p-4 space-y-3">
        {categoriesWithData.map((category) => (
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
            tripMembers={trip.sharing?.members}
            isHighlighted={highlightedCategory === category.id}
          />
        ))}

        <OtherExpensesSection
          expenses={otherExpenses}
          onUpdate={updateOtherExpense}
          onRemove={removeOtherExpense}
          onOpenCostBreakdown={handleOpenExpenseBreakdown}
          currentUserId={user.uid}
          tripMembers={trip.sharing?.members}
          isHighlighted={highlightedCategory === 'otherExpenses'}
        />

        {categoriesWithoutData.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowEmptyCategories(!showEmptyCategories)}
              className="w-full py-3 px-4 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {showEmptyCategories ? (
                <>
                  <span>▼</span>
                  <span>Nascondi altre categorie</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>Mostra altre categorie</span>
                  <span className="text-xs text-gray-500">({categoriesWithoutData.length})</span>
                </>
              )}
            </button>

            {showEmptyCategories && (
              <div className="space-y-3 mt-3">
                {categoriesWithoutData.map((category) => {
                  const suggestion = getSuggestion(category.id);

                  return (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      categoryData={categoryData[category.id]}
                      suggestion={suggestion}
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
                      tripMembers={trip.sharing?.members}
                      isHighlighted={highlightedCategory === category.id}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        <CostSummary
          dayCost={dayCost}
          tripCost={tripCost}
          currentDayNumber={currentDay.number}
          onOpenFullSummary={() => setShowFullSummary(true)}
        />
      </div>

      <MediaDialog
        isOpen={!!mediaHandlers.mediaDialogOpen}
        type={mediaHandlers.mediaDialogOpen?.type || null}
        isDesktop={isDesktop}
        linkInput={mediaHandlers.linkInput}
        linkTitle={mediaHandlers.linkTitle}
        videoInput={mediaHandlers.videoInput}
        videoNote={mediaHandlers.videoNote}
        noteInput={mediaHandlers.noteInput}
        editingNote={mediaHandlers.editingNote}
        onClose={mediaHandlers.handleMediaDialogClose}
        onLinkInputChange={mediaHandlers.setLinkInput}
        onLinkTitleChange={mediaHandlers.setLinkTitle}
        onVideoInputChange={mediaHandlers.setVideoInput}
        onVideoNoteChange={mediaHandlers.setVideoNote}
        onNoteInputChange={mediaHandlers.setNoteInput}
        onSubmit={() => mediaHandlers.handleMediaDialogSubmit(mediaHandlers.mediaDialogOpen?.categoryId)}
      />

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
        tripSharing={trip.sharing} // 🆕 Passa trip.sharing
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
        existingParticipantsUpdatedAt={  // 🆕 Passa timestamp
          costBreakdownModal.categoryId
            ? categoryData[costBreakdownModal.categoryId]?.participantsUpdatedAt || null
            : otherExpenses.find(e => e.id === costBreakdownModal.expenseId)?.participantsUpdatedAt || null
        }
        onClose={() => setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null })}
        onConfirm={handleConfirmBreakdown}
      />
    </div>
  );
};

export default DayDetailView;