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
import { deleteImage } from '../../services/storageService';
import LocationModal from './LocationModal';
import type { LocationData } from '../../services/geocodingService';

const DayDetailView = ({
  trip,
  dayIndex,
  onUpdateTrip,
  onBack,
  onChangeDayIndex,
  isDesktop = false,
  user,
  highlightCategoryId = null,
  onClosePanel = null
}) => {

  const currentDay = trip.days[dayIndex] || trip.days[0];

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(highlightCategoryId);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 🆕 Stato per LocationModal
  const [locationModal, setLocationModal] = useState<{
    isOpen: boolean;
    categoryId: string | null;
  }>({ isOpen: false, categoryId: null });

  const analytics = useAnalytics();

  // Categorie sempre visibili (non collassabili)
  const ALWAYS_VISIBLE = ['base', 'note', 'otherExpenses'];

  // Helper per verificare se una categoria ha dati
  const categoryHasData = useCallback((catId: string) => {
    const data = categoryData[catId];
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
  }, [categoryData]);

  // Collassa le categorie vuote espanse
  const collapseEmptyExpanded = useCallback((exceptCategoryId?: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set<string>();
      prev.forEach(catId => {
        if (categoryHasData(catId) || catId === exceptCategoryId) {
          newSet.add(catId);
        }
      });
      return newSet;
    });
  }, [categoryHasData]);

  // 🆕 Reset completo di una categoria (riusabile)
  const resetCategory = useCallback((categoryId: string) => {
    const key = `${currentDay.id}-${categoryId}`;
    const currentData = trip.data[key] || {};

    // 🧹 Elimina immagini da Storage (non bloccante)
    if (currentData.images?.length > 0) {
      currentData.images.forEach(img => {
        if (img.path) {
          deleteImage(img.path).catch(err =>
            console.warn('⚠️ Errore eliminazione immagine:', err)
          );
        }
      });
    }

    // Reset completo
    const updatedData = {
      title: '',
      cost: '',
      bookingStatus: 'na',
      ...(categoryId.startsWith('spostamenti') && { transportMode: 'funivia' }),
      links: [],
      images: [],
      videos: [],
      mediaNotes: [],
      notes: '',
      costBreakdown: null,
      participants: null,
      participantsUpdatedAt: null,
      hasSplitCost: false,
      location: null  // 🆕 Reset anche location
    };

    console.log('🗑️ [resetCategory] Reset completo:', categoryId);

    onUpdateTrip({
      ...trip,
      data: {
        ...trip.data,
        [key]: updatedData
      }
    });
  }, [currentDay.id, trip, onUpdateTrip]);

  // 🆕 Reset completo di una spesa (riusabile)
  const resetExpense = useCallback((expenseId: string) => {
    const key = `${currentDay.id}-otherExpenses`;
    const expenses = [...(trip.data[key] || [])];
    const expenseIndex = expenses.findIndex(e => e.id === expenseId);

    if (expenseIndex === -1) return;

    expenses[expenseIndex] = {
      id: expenseId,
      title: '',
      cost: '',
      costBreakdown: null,
      participants: null,
      participantsUpdatedAt: null,
      hasSplitCost: false
    };

    console.log('🗑️ [resetExpense] Reset completo:', expenseId);

    onUpdateTrip({
      ...trip,
      data: {
        ...trip.data,
        [key]: expenses
      }
    });
  }, [currentDay.id, trip, onUpdateTrip]);

  // 🆕 Handler per salvare location
  const handleLocationConfirm = (location: LocationData, useAsTitle: boolean) => {
    if (!locationModal.categoryId) return;

    updateCategory(locationModal.categoryId, 'location', location);

    if (useAsTitle) {
      updateCategory(locationModal.categoryId, 'title', location.name);
    }

    console.log('📍 [Location] Salvata:', { categoryId: locationModal.categoryId, location, useAsTitle });
    setLocationModal({ isOpen: false, categoryId: null });
  };

  // 🆕 Handler per rimuovere location
  const handleLocationRemove = () => {
    if (!locationModal.categoryId) return;

    updateCategory(locationModal.categoryId, 'location', null);
    console.log('📍 [Location] Rimossa:', locationModal.categoryId);
    setLocationModal({ isOpen: false, categoryId: null });
  };

  // 🆕 Shortcut Delete per reset categoria (solo desktop)
  useEffect(() => {
    if (!isDesktop || !activeCategoryId) return;
    if (['base', 'note', 'otherExpenses'].includes(activeCategoryId)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key === 'Delete') {
        e.preventDefault();
        if (window.confirm('Eliminare tutti i dati di questa categoria?')) {
          resetCategory(activeCategoryId);
          setActiveCategoryId(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, activeCategoryId, resetCategory]);

  // Delay per mostrare ring dopo che il layout è stabile
  useEffect(() => {
    if (highlightCategoryId) {
      const timer = setTimeout(() => {
        setActiveCategoryId(highlightCategoryId);
        if (!categoryHasData(highlightCategoryId) && !ALWAYS_VISIBLE.includes(highlightCategoryId)) {
          setExpandedCategories(prev => new Set(prev).add(highlightCategoryId));
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightCategoryId]);

  // Ring blu scompare dopo 3 secondi
  useEffect(() => {
    if (!selectedCategoryId) return;

    const timer = setTimeout(() => {
      setSelectedCategoryId(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [selectedCategoryId]);

  // Reset expanded categories quando cambia giorno
  useEffect(() => {
    setExpandedCategories(new Set());
    setSelectedCategoryId(null);
    setActiveCategoryId(null);
  }, [dayIndex]);

  // Handler per selezionare una categoria
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setActiveCategoryId(categoryId);
  };

  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategories(prev => new Set(prev).add(categoryId));
    handleSelectCategory(categoryId);
  };

  // Reset expanded categories quando cambia giorno, MA preserva highlightCategoryId
  useEffect(() => {
    setExpandedCategories(prev => {
      const newSet = new Set<string>();

      prev.forEach(catId => {
        if (categoryHasData(catId)) {
          newSet.add(catId);
        }
      });

      if (highlightCategoryId && !categoryHasData(highlightCategoryId) && !ALWAYS_VISIBLE.includes(highlightCategoryId)) {
        newSet.add(highlightCategoryId);
      }

      return newSet;
    });

    setSelectedCategoryId(null);
    setActiveCategoryId(null);
  }, [dayIndex, highlightCategoryId]);

  const hasScrolledRef = useRef(false);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    hasScrolledRef.current = false;
 }, [dayIndex, highlightCategoryId, currentDay.id]);

  useEffect(() => {
    if (!highlightCategoryId || hasScrolledRef.current) return;

    if (!categoryHasData(highlightCategoryId) && !ALWAYS_VISIBLE.includes(highlightCategoryId)) {
      setExpandedCategories(prev => new Set(prev).add(highlightCategoryId));
    }

    setTimeout(() => {
      scrollToAndSelect(highlightCategoryId);
      hasScrolledRef.current = true;
    }, 150);
  }, [highlightCategoryId, currentDay.id]);

  const scrollToAndSelect = (categoryId: string, retryCount = 0) => {
    const element = document.getElementById(`category-${categoryId}`);

    if (element) {
      console.log('✅ Scrolling a categoria:', categoryId);
      element.scrollIntoView({
        behavior: isDesktop ? 'smooth' : 'instant',
        block: 'center'
      });
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

  const mainCategories = useMemo(() => {
    const filtered = CATEGORIES.filter(cat => cat.id !== 'note' && cat.id !== 'otherExpenses');

    if (!trip.categoryOrder || trip.categoryOrder.length === 0) {
      return filtered;
    }

    const baseCategory = filtered.find(c => c.id === 'base');
    const otherCategories = filtered.filter(c => c.id !== 'base');

    const sortedOthers = [...otherCategories].sort((a, b) => {
      const indexA = trip.categoryOrder.indexOf(a.id);
      const indexB = trip.categoryOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return baseCategory ? [baseCategory, ...sortedOthers] : sortedOthers;
  }, [trip.categoryOrder]);

  const renderSegments = useMemo(() => {
    const segments: Array<{ type: 'card' | 'collapsed-group'; categories: typeof mainCategories }> = [];
    let currentCollapsedGroup: typeof mainCategories = [];

    mainCategories.forEach((category) => {
      const hasData = categoryHasData(category.id);
      const isAlwaysVisible = ALWAYS_VISIBLE.includes(category.id);
      const isExpanded = expandedCategories.has(category.id);
      const showFullCard = hasData || isAlwaysVisible || isExpanded;

      if (showFullCard) {
        if (currentCollapsedGroup.length > 0) {
          segments.push({ type: 'collapsed-group', categories: [...currentCollapsedGroup] });
          currentCollapsedGroup = [];
        }
        segments.push({ type: 'card', categories: [category] });
      } else {
        currentCollapsedGroup.push(category);
      }
    });

    if (currentCollapsedGroup.length > 0) {
      segments.push({ type: 'collapsed-group', categories: [...currentCollapsedGroup] });
    }

    return segments;
  }, [mainCategories, categoryHasData, expandedCategories]);

  const handleOpenCategoryBreakdown = (categoryId) => {
    const container = document.querySelector('.day-detail-container');
    if (container) scrollPositionRef.current = container.scrollTop;

    analytics.trackCostBreakdownOpened(trip.id, categoryId, false);
    setCostBreakdownModal({ isOpen: true, categoryId, expenseId: null });
  };

  const handleOpenExpenseBreakdown = (expenseId) => {
    const container = document.querySelector('.day-detail-container');
    if (container) scrollPositionRef.current = container.scrollTop;

    analytics.trackCostBreakdownOpened(trip.id, 'other', true);
    setCostBreakdownModal({ isOpen: true, categoryId: null, expenseId });
  };

  // Gestione conferma breakdown (include RESET_ALL)
  const handleConfirmBreakdown = (breakdown, participants) => {
    console.log('✅ [handleConfirmBreakdown] Ricevuto:', { breakdown, participants });

    // Gestisci RESET_ALL
    if (breakdown === 'RESET_ALL') {
      if (costBreakdownModal.categoryId) {
        resetCategory(costBreakdownModal.categoryId);
      } else if (costBreakdownModal.expenseId) {
        resetExpense(costBreakdownModal.expenseId);
      }

      setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null });
      return;
    }

    // Calcola totale dal breakdown
    const total = breakdown.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

    if (costBreakdownModal.categoryId) {
      const categoryId = costBreakdownModal.categoryId;
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

    setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null });
  };

  // Track visualizzazione dettaglio giorno
  useEffect(() => {
    if (trip?.id && currentDay?.number !== undefined) {
      analytics.trackDayDetailViewed(trip.id, currentDay.number, isDesktop);
    }
  }, [trip?.id, currentDay?.number, isDesktop]);

  console.log('🧳 trip.currency:', trip.currency);

  // Safety check
  if (dayIndex === null || dayIndex === undefined || dayIndex >= trip.days.length || dayIndex < 0) {
    console.warn('⚠️ DayDetailView: dayIndex invalido', dayIndex);
    return null;
  }

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
      className="day-detail-container bg-gray-50"
      style={{
        maxWidth: isDesktop ? '100%' : '430px',
        margin: isDesktop ? '0' : '0 auto',
        minHeight: isDesktop ? '100%' : '100vh',
        height: isDesktop ? '100%' : 'auto',
        overflowY: isDesktop ? 'auto' : 'visible'
      }}
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
        {renderSegments.map((segment, segmentIndex) => {
          if (segment.type === 'card') {
            const category = segment.categories[0];
            return (
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
                onOpenLocation={() => setLocationModal({ isOpen: true, categoryId: category.id })}
                currentUserId={user.uid}
                tripMembers={trip.sharing?.members}
                isSelected={selectedCategoryId === category.id}
                isActive={activeCategoryId === category.id}
                onSelect={() => handleSelectCategory(category.id)}
              />
            );
          } else {
            return (
              <div
                key={`collapsed-group-${segmentIndex}`}
                className="flex flex-wrap gap-2 justify-center py-1"
              >
                {segment.categories.map((category) => (
                  <CollapsedCategoryChip
                    key={category.id}
                    category={category}
                    onExpand={() => handleExpandCategory(category.id)}
                  />
                ))}
              </div>
            );
          }
        })}

        <OtherExpensesSection
          expenses={otherExpenses}
          onUpdate={(id, field, value) => {
            updateOtherExpense(id, field, value);
          }}
          onRemove={removeOtherExpense}
          onOpenCostBreakdown={handleOpenExpenseBreakdown}
          currentUserId={user.uid}
          tripMembers={trip.sharing?.members}
          onSelectCategory={handleSelectCategory}    //
          selectedCategoryId={selectedCategoryId}    //
          isHighlighted={selectedCategoryId === 'otherExpenses'}
          notes={categoryData['note']?.notes || ''}
          onUpdateNotes={(value) => {
            updateCategory('note', 'notes', value);
          }}
          isNoteHighlighted={selectedCategoryId === 'note'}
        />

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
        tripSharing={trip.sharing}
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
        existingParticipantsUpdatedAt={
          costBreakdownModal.categoryId
            ? categoryData[costBreakdownModal.categoryId]?.participantsUpdatedAt || null
            : otherExpenses.find(e => e.id === costBreakdownModal.expenseId)?.participantsUpdatedAt || null
        }
        preferredCurrencies={trip.currency?.preferred || {}}
        onClose={() => {
          setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null });
          setTimeout(() => {
            const container = document.querySelector('.day-detail-container');
            if (container) container.scrollTop = scrollPositionRef.current;
          }, 50);
        }}
        onConfirm={handleConfirmBreakdown}
      />

      {/* 🆕 Location Modal */}
      <LocationModal
        isOpen={locationModal.isOpen}
        isDesktop={isDesktop}
        categoryTitle={locationModal.categoryId ? categoryData[locationModal.categoryId]?.title || '' : ''}
        baseLocation={categoryData['base']?.title || null}
        existingLocation={locationModal.categoryId ? categoryData[locationModal.categoryId]?.location || null : null}
        onClose={() => setLocationModal({ isOpen: false, categoryId: null })}
        onConfirm={handleLocationConfirm}
        onRemove={handleLocationRemove}
      />
    </div>
  );
};

// Componente chip per categoria collassata
interface CollapsedCategoryChipProps {
  category: {
    id: string;
    label: string;
    emoji: string;
  };
  onExpand: () => void;
}

const CollapsedCategoryChip: React.FC<CollapsedCategoryChipProps> = ({ category, onExpand }) => {
  return (
    <button
      id={`category-${category.id}`}
      onClick={onExpand}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full text-gray-500 hover:text-gray-600 transition-colors cursor-pointer"
      aria-label={`Espandi ${category.label}`}
    >
      <span className="text-sm">{category.emoji}</span>
      <span className="text-[11px] font-medium">{category.label}</span>
      <span className="text-[10px] opacity-50">＋</span>
    </button>
  );
};

export default DayDetailView;