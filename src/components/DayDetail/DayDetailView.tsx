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
import { useAnalytics } from '../../hooks/useAnalytics';

const DayDetailView = ({
  trip,
  dayIndex,
  onUpdateTrip,
  onBack,
  onChangeDayIndex,
  isDesktop = false,
  user,
  highlightCategoryId = null,
  onClosePanel = null // 🆕 Solo desktop: callback per chiudere il pannello
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

  const mediaHandlers = useMediaHandlers(categoryData, updateCategory, trip.id);
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // Ring blu (3s)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(highlightCategoryId); // Controlli visibili
  const analytics = useAnalytics();

  // Delay per mostrare ring dopo che il layout è stabile
  useEffect(() => {
    if (highlightCategoryId) {
      const timer = setTimeout(() => {
        setActiveCategoryId(highlightCategoryId);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  // Ring blu scompare dopo 3 secondi
  useEffect(() => {
    if (!selectedCategoryId) return;
    
    const timer = setTimeout(() => {
      setSelectedCategoryId(null);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [selectedCategoryId]);

  // Handler per selezionare una categoria
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setActiveCategoryId(categoryId);
  };

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
    const alwaysVisible = ['base'];
    const frozenData = trip.data;

    const snapshot = {
      categoriesWithData: CATEGORIES
        .filter(cat => cat.id !== 'otherExpenses' && cat.id !== 'note')
        .filter(cat =>
          alwaysVisible.includes(cat.id) || calculateHasData(cat.id, frozenData)
        ),
      categoriesWithoutData: CATEGORIES
        .filter(cat => cat.id !== 'otherExpenses' && cat.id !== 'note')
        .filter(cat =>
          !alwaysVisible.includes(cat.id) && !calculateHasData(cat.id, frozenData)
        )
    };

    setLayoutSnapshot(snapshot);
    console.log('📸 Snapshot layout aggiornato per giorno', dayIndex);
  }, [dayIndex, calculateHasData]);

  const alwaysVisible = ['base'];
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

    const alwaysVisible = ['base', 'note', 'otherExpenses'];
    const isAlwaysVisible = alwaysVisible.includes(highlightCategoryId);
    const needsDropdown = !categoryHasData && !isAlwaysVisible;

    if (needsDropdown && !showEmptyCategories) {
      console.log('📂 Espando dropdown per categoria nascosta:', highlightCategoryId);
      setShowEmptyCategories(true);

      setTimeout(() => {
        scrollToAndSelect(highlightCategoryId);
        hasScrolledRef.current = true;
      }, 350);
    } else {
      setTimeout(() => {
        scrollToAndSelect(highlightCategoryId);
        hasScrolledRef.current = true;
      }, 100);
    }
  }, [highlightCategoryId, currentDay.id, showEmptyCategories]);

  const scrollToAndSelect = (categoryId: string, retryCount = 0) => {
    const element = document.getElementById(`category-${categoryId}`);

    if (element) {
      console.log('✅ Scrolling a categoria:', categoryId);
      element.scrollIntoView({
        behavior: isDesktop ? 'smooth' : 'instant',
        block: 'center'
      });

      // Seleziona la categoria (ring blu fisso)
      handleSelectCategory(categoryId);
    } else {
      console.warn(`⚠️ Elemento #category-${categoryId} non trovato (tentativo ${retryCount + 1}/3)`);

      if (retryCount < 3) {
        setTimeout(() => {
          scrollToAndSelect(categoryId, retryCount + 1);
        }, 200 * (retryCount + 1));
      } else {
        console.error(`❌ Impossibile trovare elemento #category-${categoryId} dopo 3 tentativi`);
      }
    }
  };

  // Handler per deselezionare quando si clicca fuori
  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Se il click è sul container stesso (non su una card)
    if (target.classList.contains('day-detail-container')) {
      setSelectedCategoryId(null);
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
    // 📊 Track apertura breakdown
    analytics.trackCostBreakdownOpened(trip.id, categoryId, false);
    setCostBreakdownModal({ isOpen: true, categoryId, expenseId: null });
  };

  const handleOpenExpenseBreakdown = (expenseId) => {
    // 📊 Track apertura breakdown altre spese
    analytics.trackCostBreakdownOpened(trip.id, 'other', true);
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

        const updatedData = {
          ...trip.data[key],
          costBreakdown: null,
          cost: '',
          participants: null,
          participantsUpdatedAt: null,
          hasSplitCost: false
        };

        console.log('🗑️ [Category] Reset completo:', categoryId);

        onUpdateTrip({
          ...trip,
          data: {
            ...trip.data,
            [key]: updatedData
          }
        });
      } else if (costBreakdownModal.expenseId) {
        const key = `${currentDay.id}-otherExpenses`;
        const expenses = [...(trip.data[key] || [])];
        const expenseIndex = expenses.findIndex(e => e.id === costBreakdownModal.expenseId);

        if (expenseIndex === -1) return;

        expenses[expenseIndex] = {
          ...expenses[expenseIndex],
          costBreakdown: null,
          cost: '',
          participants: null,
          participantsUpdatedAt: null,
          hasSplitCost: false
        };

        console.log('🗑️ [OtherExpense] Reset completo:', costBreakdownModal.expenseId);

        onUpdateTrip({
          ...trip,
          data: {
            ...trip.data,
            [key]: expenses
          }
        });
      }

      setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null });
      return;
    }

    // Calcola totale dal breakdown
    const total = breakdown.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

    if (costBreakdownModal.categoryId) {
      const categoryId = costBreakdownModal.categoryId;
      const category = CATEGORIES.find(c => c.id === categoryId);
      const key = `${currentDay.id}-${categoryId}`;

      const updatedData = {
        ...trip.data[key],
        participants: participants,
        participantsUpdatedAt: Date.now(),
        costBreakdown: breakdown,
        cost: total.toString(),
        hasSplitCost: breakdown.length > 1
      };

      console.log('💾 [Category] Salvataggio atomico con timestamp:', {
        categoryId,
        participants,
        participantsUpdatedAt: updatedData.participantsUpdatedAt
      });

      onUpdateTrip({
        ...trip,
        data: {
          ...trip.data,
          [key]: updatedData
        }
      });
    } else if (costBreakdownModal.expenseId) {
      const key = `${currentDay.id}-otherExpenses`;
      const expenses = [...(trip.data[key] || [])];
      const expenseIndex = expenses.findIndex(e => e.id === costBreakdownModal.expenseId);

      if (expenseIndex === -1) return;

      const updatedExpenses = [...expenses];
      updatedExpenses[expenseIndex] = {
        ...updatedExpenses[expenseIndex],
        participants: participants,
        participantsUpdatedAt: Date.now(),
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

  // 📊 Track visualizzazione dettaglio giorno
  useEffect(() => {
    if (trip?.id && currentDay?.number !== undefined) {
      analytics.trackDayDetailViewed(trip.id, currentDay.number, isDesktop);
    }
  }, [trip?.id, currentDay?.number, isDesktop]);

  console.log('🧳 trip.currency:', trip.currency);

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
    <div 
      className={`day-detail-container bg-gray-50 ${isDesktop ? 'h-full overflow-y-auto' : 'min-h-screen'}`} 
      style={{
        maxWidth: isDesktop ? '100%' : '430px',
        margin: isDesktop ? '0' : '0 auto'
      }}
      onClick={handleContainerClick}
    >
      <DayHeader
        trip={trip}
        currentDay={currentDay}
        dayIndex={dayIndex}
        onBack={onBack}
        onChangeDayIndex={onChangeDayIndex}
        isDesktop={isDesktop}
        onClosePanel={onClosePanel}
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
            isSelected={selectedCategoryId === category.id}
            isActive={activeCategoryId === category.id}
            onSelect={() => handleSelectCategory(category.id)}
          />
        ))}

        <OtherExpensesSection
          expenses={otherExpenses}
          onUpdate={updateOtherExpense}
          onRemove={removeOtherExpense}
          onOpenCostBreakdown={handleOpenExpenseBreakdown}
          currentUserId={user.uid}
          tripMembers={trip.sharing?.members}
          isHighlighted={selectedCategoryId === 'otherExpenses'}
          notes={categoryData['note']?.notes || ''}
          onUpdateNotes={(value) => updateCategory('note', 'notes', value)}
          isNoteHighlighted={selectedCategoryId === 'note'}
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
                      isSelected={selectedCategoryId === category.id}
                      isActive={activeCategoryId === category.id}
                      onSelect={() => handleSelectCategory(category.id)}
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
        isNoteEditing={mediaHandlers.isNoteEditing}
        onClose={mediaHandlers.handleMediaDialogClose}
        onLinkInputChange={mediaHandlers.setLinkInput}
        onLinkTitleChange={mediaHandlers.setLinkTitle}
        onVideoInputChange={mediaHandlers.setVideoInput}
        onVideoNoteChange={mediaHandlers.setVideoNote}
        onNoteInputChange={mediaHandlers.setNoteInput}
        onSubmit={() => mediaHandlers.handleMediaDialogSubmit(mediaHandlers.mediaDialogOpen?.categoryId)}
        onStartNoteEditing={() => mediaHandlers.setIsNoteEditing(true)}
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
        preferredCurrencies={trip.currency?.preferred || {}}
        onClose={() => setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null })}
        onConfirm={handleConfirmBreakdown}
      />
    </div>
  );
};

export default DayDetailView;