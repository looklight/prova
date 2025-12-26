import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Plus, Lightbulb, ArrowUpDown, Check } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { durations, easings } from '../../../styles/animations';
import ActivityRow from '../components/ActivityRow';
import { ActivityExpandedContent } from '../components/ActivityExpanded';
import ActivityEditMode from '../components/ActivityEditMode';
import AnimatedCollapse from '../components/AnimatedCollapse';
import AnimatedContentSwitch from '../components/AnimatedContentSwitch';
import ReorderableList from '../components/ReorderableList';
import { ActivityType } from '../../../utils/activityTypes';
import { deleteImage } from '../../../services/storageService';

// ============================================
// ALTROVE - ActivitiesSection
// Lista attività con accordion + edit mode
// ============================================

// Location type per attività
export interface ActivityLocation {
  name?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

// Tipo attività
export interface Activity {
  id: string;
  title: string;
  type: ActivityType;
  bookingStatus: 'na' | 'no' | 'yes';
  startTime?: string;
  endTime?: string;
  cost?: string;
  costBreakdown?: Array<{ userId: string; amount: number }>;
  participants?: string[];
  participantsUpdatedAt?: Date;
  hasSplitCost?: boolean;
  location?: ActivityLocation;
  // Campi per tipologie trasporto (flight, transport, car)
  departure?: {
    location?: ActivityLocation;
    time?: string;
  };
  arrival?: {
    location?: ActivityLocation;
    time?: string;
  };
  // Notifica unica per attività
  reminder?: {
    enabled: boolean;
    minutesBefore?: number;
  };
  links?: Array<{ id: number; url: string; title?: string }>;
  images?: Array<{ id: number; url: string; path?: string }>;
  videos?: Array<{ id: number; url: string; note?: string }>;
  mediaNotes?: Array<{ id: number; text: string }>;
  showInCalendar?: boolean; // Per le prime 3 visibili nel calendario
}

interface ActivitiesSectionProps {
  activities: Activity[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateActivities: (activities: Activity[]) => void;
  currentUserId: string;
  tripMembers: any;
  activeMembers: Array<{ uid: string; displayName: string; avatar?: string }>;
  isDesktop: boolean;
  tripId: string;
  tripName: string;
  dayId: number;
  dayNumber: number;
  trip: any;
}


const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  activities,
  isExpanded,
  onToggle,
  onUpdateActivities,
  currentUserId,
  tripMembers,
  activeMembers,
  isDesktop,
  tripId,
  tripName,
  dayId,
  dayNumber,
  trip
}) => {
  // State
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [closingActivityId, setClosingActivityId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Ref per scroll automatico all'edit mode
  const editContainerRef = useRef<HTMLDivElement>(null);

  // Le attività sono sempre visibili nella sezione Attività
  // (il costo è un attributo, non un motivo per nasconderle)

  // Esci automaticamente dalla modalità riordino per qualsiasi cambio di contesto
  // (sezione chiusa, cambio giorno, ecc.) - il salvataggio avviene già ad ogni drop
  useEffect(() => {
    setIsReordering(false);
  }, [isExpanded, dayId]);

  // Scroll automatico quando si entra in edit mode
  // Trova il contenitore scrollabile (div con overflow-y: auto) e scrolla quello
  useEffect(() => {
    if (editingActivityId && editContainerRef.current) {
      setTimeout(() => {
        const element = editContainerRef.current;
        if (!element) return;

        // Trova il contenitore scrollabile (parent con overflow-y: auto/scroll)
        let scrollContainer: HTMLElement | null = element.parentElement;
        while (scrollContainer) {
          const style = window.getComputedStyle(scrollContainer);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            break;
          }
          scrollContainer = scrollContainer.parentElement;
        }

        const offset = 60; // Distanza dal top in pixel

        if (scrollContainer) {
          const elementRect = element.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          scrollContainer.scrollTo({
            top: scrollContainer.scrollTop + elementRect.top - containerRect.top - offset,
            behavior: 'smooth'
          });
        } else {
          // Fallback a window se non trova contenitore
          const elementRect = element.getBoundingClientRect();
          window.scrollTo({
            top: window.scrollY + elementRect.top - offset,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [editingActivityId]);

  // Conteggio attività
  const activityCount = activities.length;

  // Conteggio attività visibili nel calendario (max 3)
  const calendarVisibleCount = activities.filter(a => a.showInCalendar === true).length;
  const calendarSlotsRemaining = 3 - calendarVisibleCount;

  // Aggiungi nuova attività
  const handleAddActivity = () => {
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      title: '',
      type: 'generic',
      bookingStatus: 'na',
      showInCalendar: calendarSlotsRemaining > 0 // Auto-mostra nel calendario se ci sono slot
    };
    onUpdateActivities([...activities, newActivity]);
    setExpandedActivityId(newActivity.id);
    setEditingActivityId(newActivity.id);
  };

  // Aggiorna singola attività
  const handleUpdateActivity = (activityId: string, updates: Partial<Activity>) => {
    onUpdateActivities(
      activities.map(a => a.id === activityId ? { ...a, ...updates } : a)
    );
  };

  // Elimina attività (con cleanup immagini dallo storage)
  const handleDeleteActivity = async (activityId: string) => {
    if (window.confirm('Eliminare questa attività? Tutti i dati verranno rimossi.')) {
      // Trova l'attività da eliminare
      const activityToDelete = activities.find(a => a.id === activityId);

      // Elimina tutte le immagini dallo storage
      if (activityToDelete?.images && activityToDelete.images.length > 0) {
        console.log(`🧹 Eliminazione ${activityToDelete.images.length} immagini dell'attività...`);
        for (const image of activityToDelete.images) {
          if (image.path) {
            try {
              await deleteImage(image.path);
              console.log(`🗑️ Immagine eliminata: ${image.path}`);
            } catch (error: any) {
              if (error.code === 'storage/object-not-found') {
                console.warn(`⚠️ Immagine già eliminata: ${image.path}`);
              } else {
                console.error(`❌ Errore eliminazione immagine:`, error);
              }
            }
          }
        }
      }

      // Rimuovi l'attività dalla lista
      onUpdateActivities(activities.filter(a => a.id !== activityId));
      setExpandedActivityId(null);
      setEditingActivityId(null);
    }
  };

  // Toggle espansione singola attività
  const handleToggleActivity = (activityId: string) => {
    if (editingActivityId) return; // Non chiudere se in edit mode
    setExpandedActivityId(prev => prev === activityId ? null : activityId);
  };

  // Entra in edit mode
  const handleStartEdit = (activityId: string) => {
    setExpandedActivityId(activityId);
    setEditingActivityId(activityId);
  };

  // Verifica se un'attività è vuota (nessun dato significativo)
  const isActivityEmpty = (activity: Activity): boolean => {
    const hasTitle = activity.title && activity.title.trim() !== '';
    const hasImages = activity.images && activity.images.length > 0;
    const hasLinks = activity.links && activity.links.length > 0;
    const hasVideos = activity.videos && activity.videos.length > 0;
    const hasNotes = activity.mediaNotes && activity.mediaNotes.length > 0;
    const hasLocation = activity.location?.coordinates;
    const hasTime = activity.startTime || activity.endTime;
    const hasCost = activity.cost && parseFloat(activity.cost) > 0;

    // L'attività è vuota se non ha nessuno di questi dati
    return !hasTitle && !hasImages && !hasLinks && !hasVideos &&
           !hasNotes && !hasLocation && !hasTime && !hasCost;
  };

  // Esci da edit mode (rimuove attività vuote) con animazione
  const handleEndEdit = useCallback(() => {
    if (!editingActivityId || closingActivityId) return;

    // Avvia animazione di chiusura
    setClosingActivityId(editingActivityId);

    // Dopo l'animazione, rimuovi effettivamente
    setTimeout(() => {
      // Verifica se l'attività è vuota
      const editingActivity = activities.find(a => a.id === editingActivityId);
      if (editingActivity && isActivityEmpty(editingActivity)) {
        // Rimuovi l'attività vuota senza chiedere conferma
        onUpdateActivities(activities.filter(a => a.id !== editingActivityId));
        setExpandedActivityId(null);
      }
      setEditingActivityId(null);
      setClosingActivityId(null);
    }, durations.normal);
  }, [editingActivityId, closingActivityId, activities, onUpdateActivities]);

  return (
    <div
      className="rounded-2xl"
      style={{ backgroundColor: colors.warmSoft }}
    >
      {/* Header - cliccabile per espandere/comprimere */}
      <div
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 cursor-pointer"
        style={{ height: '64px' }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={20} color={colors.warm} />
          <span
            className="text-base font-semibold"
            style={{ color: colors.text }}
          >
            Attività
          </span>
          {activityCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: colors.warm,
                color: 'white'
              }}
            >
              {activityCount}
            </span>
          )}
          {/* Pulsante riordino (solo se espansa e ci sono almeno 2 attività) */}
          {isExpanded && activities.length >= 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsReordering(!isReordering);
                // Chiudi attività espanse quando entri in riordino
                if (!isReordering) {
                  setExpandedActivityId(null);
                  setEditingActivityId(null);
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full"
              style={isReordering ? {
                backgroundColor: colors.accent,
              } : undefined}
              title={isReordering ? 'Conferma riordino' : 'Riordina attività'}
            >
              {isReordering ? (
                <Check size={16} color="white" strokeWidth={2.5} />
              ) : (
                <ArrowUpDown size={16} color={colors.textMuted} />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Freccia espandi/comprimi */}
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textMuted} />
          ) : (
            <ChevronDown size={20} color={colors.textMuted} />
          )}
        </div>
      </div>

      {/* Lista attività (se espansa) */}
      <AnimatedCollapse isOpen={isExpanded}>
        <div className="px-2 pb-3 space-y-3">
          {/* Placeholder se vuoto */}
          {activities.length === 0 && (
            <p
              className="text-sm italic text-left px-2"
              style={{ color: colors.textPlaceholder }}
            >
              Qualche attività in programma?
            </p>
          )}

          {/* Lista attività - Modalità riordino */}
          {activities.length > 0 && isReordering && (
            <ReorderableList
              items={activities}
              keyExtractor={(activity) => activity.id}
              onReorder={(reorderedActivities) => {
                onUpdateActivities(reorderedActivities);
              }}
              enabled={isReordering}
              renderItem={(activity, index, isDragging) => (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: colors.bgCard }}
                >
                  <ActivityRow
                    activity={activity}
                    index={index}
                    onClick={() => {}}
                  />
                </div>
              )}
            />
          )}

          {/* Lista attività - Struttura unificata con animazioni fluide */}
          {activities.length > 0 && !isReordering && (
            <div className="relative">
              {/* Linea verticale continua per tutte le attività */}
              {activities.length > 1 && (
                <div
                  className="absolute w-0.5 rounded-full"
                  style={{
                    backgroundColor: colors.border,
                    left: '11px',
                    top: '34px',
                    bottom: '22px'
                  }}
                />
              )}

              {activities.map((activity, index) => {
                const isLast = index === activities.length - 1;
                const isEditing = editingActivityId === activity.id || closingActivityId === activity.id;
                const isExpanded = expandedActivityId === activity.id;

                return (
                  <div
                    key={activity.id}
                    ref={isEditing ? editContainerRef : undefined}
                    className="flex gap-3 items-stretch"
                  >
                    {/* Colonna sinistra: numero toggle */}
                    <div
                      className="relative flex flex-col items-center flex-shrink-0"
                      style={{
                        width: isEditing ? 0 : 24,
                        opacity: isEditing ? 0 : 1,
                        transition: `all ${durations.slow}ms ${easings.smooth}`,
                        transitionDelay: isEditing ? '0ms' : `${durations.normal}ms`,
                      }}
                    >
                      {/* Numero ordinale - cliccabile per toggle showInCalendar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!activity.showInCalendar && calendarSlotsRemaining <= 0) return;
                          handleUpdateActivity(activity.id, { showInCalendar: !activity.showInCalendar });
                        }}
                        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mt-2.5 border-2 transition-all ${
                          !activity.showInCalendar && calendarSlotsRemaining <= 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:scale-110'
                        }`}
                        style={activity.showInCalendar ? {
                          borderColor: colors.accent,
                          color: 'white',
                          backgroundColor: colors.accent
                        } : {
                          borderColor: colors.border,
                          color: colors.textMuted,
                          backgroundColor: colors.warmSoft
                        }}
                        title={activity.showInCalendar
                          ? 'Visibile nel calendario - clicca per nascondere'
                          : calendarSlotsRemaining > 0
                            ? 'Clicca per mostrare nel calendario'
                            : 'Max 3 attività nel calendario'
                        }
                      >
                        {index + 1}
                      </button>

                      {/* Copertura linea sotto l'ultimo numero */}
                      {isLast && activities.length > 1 && (
                        <div
                          className="flex-1 w-2 z-10"
                          style={{ backgroundColor: colors.warmSoft }}
                        />
                      )}
                    </div>

                  {/* Card attività con transizione fluida */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{ backgroundColor: colors.bgCard }}
                    >
                      {/* Header (ActivityRow) - nascosto in edit mode */}
                      <div
                        className="overflow-hidden"
                        style={{
                          maxHeight: isEditing ? 0 : 200,
                          opacity: isEditing ? 0 : 1,
                          transition: `all ${durations.slow}ms ${easings.smooth}`,
                          transitionDelay: isEditing ? '0ms' : `${durations.normal}ms`,
                        }}
                      >
                        <ActivityRow
                          activity={activity}
                          index={index}
                          onClick={() => !isEditing && handleToggleActivity(activity.id)}
                        />
                      </div>

                      {/* Contenuto: cross-fade tra Expanded e Edit */}
                      <AnimatedContentSwitch
                        showSecond={isEditing}
                        isOpen={isExpanded || isEditing}
                        first={
                          <ActivityExpandedContent
                            activity={activity}
                            onEdit={() => handleStartEdit(activity.id)}
                            onUpdate={(updates) => handleUpdateActivity(activity.id, updates)}
                            isDesktop={isDesktop}
                            tripId={tripId}
                            tripName={tripName}
                            dayId={dayId}
                            dayNumber={dayNumber}
                            currentUserId={currentUserId}
                            tripMembers={Object.keys(tripMembers || {})}
                            trip={trip}
                          />
                        }
                        second={
                          <ActivityEditMode
                            activity={activity}
                            index={index}
                            onUpdate={(updates) => handleUpdateActivity(activity.id, updates)}
                            onDelete={() => handleDeleteActivity(activity.id)}
                            onClose={handleEndEdit}
                            currentUserId={currentUserId}
                            tripMembers={tripMembers}
                            activeMembers={activeMembers}
                            isDesktop={isDesktop}
                            tripId={tripId}
                            dayId={dayId}
                            isClosing={closingActivityId === activity.id}
                            trip={trip}
                          />
                        }
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Bottone aggiungi attività (nascosto in riordino) */}
          {!isReordering && (
            <div className="px-2">
              <button
                onClick={handleAddActivity}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                style={{
                  backgroundColor: colors.bgCard,
                  color: colors.textMuted
                }}
              >
                <Plus size={14} />
                <span className="text-sm">Aggiungi attività</span>
              </button>
            </div>
          )}
        </div>
      </AnimatedCollapse>
    </div>
  );
};

export default ActivitiesSection;