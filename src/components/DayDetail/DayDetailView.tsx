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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // Ring blu (3s)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(highlightCategoryId); // Controlli visibili
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set()); // 🆕 Categorie espanse manualmente
  const analytics = useAnalytics();

  // Categorie sempre visibili (non collassabili)
  const ALWAYS_VISIBLE = ['base', 'note', 'otherExpenses'];

  // 🆕 Helper per verificare se una categoria ha dati
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

  // 🆕 Collassa le categorie vuote espanse (chiamato quando si seleziona un'altra categoria)
  const collapseEmptyExpanded = useCallback((exceptCategoryId?: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set<string>();
      prev.forEach(catId => {
        // Mantieni se ha dati O se è la categoria che stiamo per selezionare
        if (categoryHasData(catId) || catId === exceptCategoryId) {
          newSet.add(catId);
        }
      });
      return newSet;
    });
  }, [categoryHasData]);

  // Delay per mostrare ring dopo che il layout è stabile
  useEffect(() => {
    if (highlightCategoryId) {
      const timer = setTimeout(() => {
        setActiveCategoryId(highlightCategoryId);
        // Se la categoria è vuota, espandila automaticamente
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

  // 🆕 Reset expanded categories quando cambia giorno
  useEffect(() => {
    setExpandedCategories(new Set());
    setSelectedCategoryId(null);
    setActiveCategoryId(null);
  }, [dayIndex]);

  // Handler per selezionare una categoria (e collassare le altre vuote)
  const handleSelectCategory = (categoryId: string) => {
    // Prima collassa le categorie vuote espanse (tranne quella che stiamo selezionando)
    collapseEmptyExpanded(categoryId);

    setSelectedCategoryId(categoryId);
    setActiveCategoryId(categoryId);
  };

  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategories(prev => new Set(prev).add(categoryId));
    // Seleziona anche la categoria quando viene espansa
    handleSelectCategory(categoryId);
  };

  // 🆕 Reset expanded categories quando cambia giorno, MA preserva highlightCategoryId
  useEffect(() => {
    setExpandedCategories(prev => {
      const newSet = new Set<string>();

      // Mantieni espanse le categorie con dati
      prev.forEach(catId => {
        if (categoryHasData(catId)) {
          newSet.add(catId);
        }
      });

      // 🔧 FIX: Se c'è highlightCategoryId in arrivo, espandila subito
      if (highlightCategoryId && !categoryHasData(highlightCategoryId) && !ALWAYS_VISIBLE.includes(highlightCategoryId)) {
        newSet.add(highlightCategoryId);
      }

      return newSet;
    });

    setSelectedCategoryId(null);
    setActiveCategoryId(null);
  }, [dayIndex, categoryHasData, highlightCategoryId]);

  const hasScrolledRef = useRef(false);
  const scrollPositionRef = useRef(0); // 🆕 Salva posizione scroll per modal

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [dayIndex, highlightCategoryId]);

  useEffect(() => {
    if (!highlightCategoryId || hasScrolledRef.current) return;

    // Se la categoria è vuota, espandila prima
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

  // 🆕 Filtra categorie escludendo note e otherExpenses (gestite separatamente)
  // e ordina secondo trip.categoryOrder
  const mainCategories = useMemo(() => {
    const filtered = CATEGORIES.filter(cat => cat.id !== 'note' && cat.id !== 'otherExpenses');

    // Se non c'è un ordine personalizzato, usa l'ordine di default
    if (!trip.categoryOrder || trip.categoryOrder.length === 0) {
      return filtered;
    }

    // Ordina secondo categoryOrder
    // 'base' rimane sempre primo (non è in categoryOrder)
    const baseCategory = filtered.find(c => c.id === 'base');
    const otherCategories = filtered.filter(c => c.id !== 'base');

    const sortedOthers = [...otherCategories].sort((a, b) => {
      const indexA = trip.categoryOrder.indexOf(a.id);
      const indexB = trip.categoryOrder.indexOf(b.id);
      // Se non trovato nell'ordine, metti in fondo
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return baseCategory ? [baseCategory, ...sortedOthers] : sortedOthers;
  }, [trip.categoryOrder]);

  // 🆕 Raggruppa categorie in "segmenti": card normali singole o gruppi di collapsed consecutive
  const renderSegments = useMemo(() => {
    const segments: Array<{ type: 'card' | 'collapsed-group'; categories: typeof mainCategories }> = [];
    let currentCollapsedGroup: typeof mainCategories = [];

    mainCategories.forEach((category) => {
      const hasData = categoryHasData(category.id);
      const isAlwaysVisible = ALWAYS_VISIBLE.includes(category.id);
      const isExpanded = expandedCategories.has(category.id);
      const showFullCard = hasData || isAlwaysVisible || isExpanded;

      if (showFullCard) {
        // Prima chiudi eventuale gruppo collapsed aperto
        if (currentCollapsedGroup.length > 0) {
          segments.push({ type: 'collapsed-group', categories: [...currentCollapsedGroup] });
          currentCollapsedGroup = [];
        }
        // Aggiungi la card normale
        segments.push({ type: 'card', categories: [category] });
      } else {
        // Accumula nel gruppo collapsed
        currentCollapsedGroup.push(category);
      }
    });

    // Chiudi l'ultimo gruppo collapsed se presente
    if (currentCollapsedGroup.length > 0) {
      segments.push({ type: 'collapsed-group', categories: [...currentCollapsedGroup] });
    }

    return segments;
  }, [mainCategories, categoryHasData, expandedCategories]);

  const handleOpenCategoryBreakdown = (categoryId) => {
    // 🆕 Salva posizione scroll prima di aprire modal
    const container = document.querySelector('.day-detail-container');
    if (container) scrollPositionRef.current = container.scrollTop;

    // 📊 Track apertura breakdown
    analytics.trackCostBreakdownOpened(trip.id, categoryId, false);
    setCostBreakdownModal({ isOpen: true, categoryId, expenseId: null });
  };

  const handleOpenExpenseBreakdown = (expenseId) => {
    // 🆕 Salva posizione scroll prima di aprire modal
    const container = document.querySelector('.day-detail-container');
    if (container) scrollPositionRef.current = container.scrollTop;

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

        // 🔧 Reset COMPLETO - oggetto pulito SENZA spread
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
          hasSplitCost: false
        };

        console.log('🗑️ [Category] Reset COMPLETO:', categoryId);

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
          id: costBreakdownModal.expenseId,
          title: '',
          cost: '',
          costBreakdown: null,
          participants: null,
          participantsUpdatedAt: null,
          hasSplitCost: false
        };

        console.log('🗑️ [OtherExpense] Reset COMPLETO:', costBreakdownModal.expenseId);

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

    setCostBreakdownModal({ isOpen: false, categoryId: null, expenseId: null });
  };

  // 📊 Track visualizzazione dettaglio giorno
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
        {/* 🆕 Renderizza segmenti: card singole o gruppi di chips collapsed */}
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
                currentUserId={user.uid}
                tripMembers={trip.sharing?.members}
                isSelected={selectedCategoryId === category.id}
                isActive={activeCategoryId === category.id}
                onSelect={() => handleSelectCategory(category.id)}
              />
            );
          } else {
            // 🆕 Gruppo di collapsed chips in flex-wrap
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

        {/* Altre Spese + Note (sempre visibili) */}
        <OtherExpensesSection
          expenses={otherExpenses}
          onUpdate={(id, field, value) => {
            collapseEmptyExpanded(); // Collassa quando interagisci con OtherExpenses
            updateOtherExpense(id, field, value);
          }}
          onRemove={removeOtherExpense}
          onOpenCostBreakdown={handleOpenExpenseBreakdown}
          currentUserId={user.uid}
          tripMembers={trip.sharing?.members}
          isHighlighted={selectedCategoryId === 'otherExpenses'}
          notes={categoryData['note']?.notes || ''}
          onUpdateNotes={(value) => {
            collapseEmptyExpanded(); // Collassa quando interagisci con Note
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
          // 🆕 Ripristina posizione scroll dopo chiusura modal
          setTimeout(() => {
            const container = document.querySelector('.day-detail-container');
            if (container) container.scrollTop = scrollPositionRef.current;
          }, 50);
        }}
        onConfirm={handleConfirmBreakdown}
      />
    </div>
  );
};

// 🆕 Componente chip per categoria collassata
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