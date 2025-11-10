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
  // Safety check: se dayIndex è invalido, non renderizzare nulla
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
  
  // ✅ FIX: Flag per disabilitare auto-scroll dopo il primo trigger
  const hasScrolledRef = useRef(false);
  
  // Snapshot del layout al cambio giorno
  const [layoutSnapshot, setLayoutSnapshot] = useState(null);

  // Calcola hasData per uno snapshot specifico (non reattivo a trip.data)
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

  // Aggiorna snapshot SOLO quando cambia dayIndex (giorno)
  useEffect(() => {
    const alwaysVisible = ['base', 'note'];
    
    // Cattura trip.data al momento del cambio giorno
    const frozenData = trip.data;
    
    const snapshot = {
      categoriesWithData: CATEGORIES
        .filter(cat => cat.id !== 'otherExpenses') // 🚫 Escludi otherExpenses (ha sezione dedicata)
        .filter(cat => 
          alwaysVisible.includes(cat.id) || calculateHasData(cat.id, frozenData)
        ),
      categoriesWithoutData: CATEGORIES
        .filter(cat => cat.id !== 'otherExpenses') // 🚫 Escludi otherExpenses (ha sezione dedicata)
        .filter(cat => 
          !alwaysVisible.includes(cat.id) && !calculateHasData(cat.id, frozenData)
        )
    };
    
    setLayoutSnapshot(snapshot);
    console.log('📸 Snapshot layout aggiornato per giorno', dayIndex);
  }, [dayIndex, calculateHasData]);

  // Usa snapshot (o calcolo iniziale se non esiste)
  const alwaysVisible = ['base', 'note'];
  
  const categoriesWithData = layoutSnapshot?.categoriesWithData || [];
  const categoriesWithoutData = layoutSnapshot?.categoriesWithoutData || [];

  // Auto-espandi quando cambia giorno
  useEffect(() => {
    const hasRealData = categoriesWithData.length > alwaysVisible.length;
    
    if (!hasRealData) {
      setShowEmptyCategories(true);
    } else {
      setShowEmptyCategories(false);
    }
  }, [dayIndex, categoriesWithData.length]);

  // ✅ FIX: Reset flag quando cambiano giorno o highlightCategoryId
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [dayIndex, highlightCategoryId]);

  // ✅ FIX: SISTEMA HIGHLIGHT - Gestisce scroll SOLO UNA VOLTA
  useEffect(() => {
    // ✅ Se abbiamo già fatto lo scroll, esci subito
    if (!highlightCategoryId || hasScrolledRef.current) return;

    // Controlla se la categoria ha dati ADESSO (non usa snapshot)
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
    
    // Se categoria è vuota E non è always visible → espandi dropdown
    const needsDropdown = !categoryHasData && !isAlwaysVisible;
    
    if (needsDropdown && !showEmptyCategories) {
      console.log('📂 Espando dropdown per categoria nascosta:', highlightCategoryId);
      setShowEmptyCategories(true);
      
      setTimeout(() => {
        scrollToAndHighlight(highlightCategoryId);
        hasScrolledRef.current = true; // ✅ Marca come completato
      }, 350);
    } else {
      setTimeout(() => {
        scrollToAndHighlight(highlightCategoryId);
        hasScrolledRef.current = true; // ✅ Marca come completato
      }, 100);
    }
  }, [highlightCategoryId, currentDay.id, showEmptyCategories]); // ✅ Rimosso trip.data

  // Funzione helper per scroll + highlight con retry
  const scrollToAndHighlight = (categoryId, retryCount = 0) => {
    const element = document.getElementById(`category-${categoryId}`);
    
    if (element) {
      console.log('✅ Scrolling a categoria:', categoryId);
      // Scrolla al centro del viewport
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Attiva highlight
      setHighlightedCategory(categoryId);
      
      // Rimuovi highlight dopo 800ms
      setTimeout(() => {
        setHighlightedCategory(null);
      }, 800);
    } else {
      console.warn(`⚠️ Elemento #category-${categoryId} non trovato (tentativo ${retryCount + 1}/3)`);
      
      // Retry fino a 3 volte con delay crescente
      if (retryCount < 3) {
        setTimeout(() => {
          scrollToAndHighlight(categoryId, retryCount + 1);
        }, 200 * (retryCount + 1)); // 200ms, 400ms, 600ms
      } else {
        console.error(`❌ Impossibile trovare elemento #category-${categoryId} dopo 3 tentativi`);
      }
    }
  };

  // Calcoli costi con useMemo per performance
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

  // 🔧 FIX: Handler conferma breakdown - salva solo costBreakdown, participants gestito automaticamente
  const handleConfirmBreakdown = (breakdown, participants) => {
    console.log('🔧 [handleConfirmBreakdown] Salvataggio breakdown:', { breakdown, participants });
    
    if (costBreakdownModal.categoryId) {
      // 🔧 FIX CRITICO: Salva SOLO costBreakdown in una chiamata
      // participants viene gestito automaticamente dentro updateCategory
      updateCategory(costBreakdownModal.categoryId, 'costBreakdown', breakdown);
      
      // 🔧 NON chiamare updateCategory per participants!
      // Questo causava il bug perché leggeva dati vecchi da trip.data
    } else if (costBreakdownModal.expenseId !== null) {
      // Stessa logica per otherExpenses
      updateOtherExpense(costBreakdownModal.expenseId, 'costBreakdown', breakdown);
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
      margin: isDesktop ? '0' : '0 auto'
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
        {/* Categorie con dati - sempre visibili */}
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
            isHighlighted={highlightedCategory === category.id}
          />
        ))}

        {/* Altre Spese - sempre visibile */}
        <OtherExpensesSection
          expenses={otherExpenses}
          onUpdate={updateOtherExpense}
          onRemove={removeOtherExpense}
          onAdd={addOtherExpense}
          onOpenCostBreakdown={handleOpenExpenseBreakdown}
          currentUserId={user.uid}
        />

        {/* Sezione collassabile per categorie vuote */}
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
                      isHighlighted={highlightedCategory === category.id}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Riepilogo Costi */}
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