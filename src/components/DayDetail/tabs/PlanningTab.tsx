import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { colors } from '../../../styles/theme';
import DestinationsSection from '../sections/DestinationsSection';
import ActivitiesSection from '../sections/ActivitiesSection';
import AccommodationSection from '../sections/AccommodationSection';

// ============================================
// ALTROVE - PlanningTab
// Tab pianificazione - Destinazioni + Attività + Pernottamento
// ============================================

interface PlanningTabProps {
  trip: any;
  currentDay: any;
  categoryData: Record<string, any>;
  updateCategory: (catId: string, field: string, value: any) => void;
  updateCategoryMultiple: (catId: string, fields: Record<string, any>) => void;
  onUpdateTrip: (updates: any) => void;
  currentUserId: string;
  tripMembers: any;
  activeMembers: Array<{ uid: string; displayName: string; avatar?: string }>;
  isDesktop: boolean;
  highlightCategoryId?: string | null;
  dayNumber?: number;
  dateString?: string;
  dayIndex?: number;
  totalDays?: number;
  onChangeDayIndex?: (index: number) => void;
}

const PlanningTab: React.FC<PlanningTabProps> = ({
  trip,
  currentDay,
  categoryData,
  updateCategory,
  updateCategoryMultiple,
  onUpdateTrip,
  currentUserId,
  tripMembers,
  activeMembers,
  isDesktop,
  highlightCategoryId,
  dayNumber,
  dateString,
  dayIndex = 0,
  totalDays = 1,
  onChangeDayIndex
}) => {
  // Refs per scroll alle sezioni
  const destinationsRef = useRef<HTMLDivElement>(null);
  const activitiesRef = useRef<HTMLDivElement>(null);
  const accommodationRef = useRef<HTMLDivElement>(null);

  // Quali sezioni sono espanse (possono essere multiple)
  const [expandedSections, setExpandedSections] = useState<{
    destinations: boolean;
    activities: boolean;
    accommodation: boolean;
  }>({
    destinations: highlightCategoryId === 'destinazione',
    activities: highlightCategoryId === 'attivita',
    accommodation: highlightCategoryId === 'pernottamento'
  });

  // Reagisci ai cambiamenti di highlightCategoryId
  useEffect(() => {
    if (!highlightCategoryId) return;

    // Espandi la sezione corretta (senza chiudere le altre)
    if (highlightCategoryId === 'destinazione') {
      setExpandedSections(prev => ({ ...prev, destinations: true }));
    } else if (highlightCategoryId === 'attivita') {
      setExpandedSections(prev => ({ ...prev, activities: true }));
    } else if (highlightCategoryId === 'pernottamento') {
      setExpandedSections(prev => ({ ...prev, accommodation: true }));
    }

    // Scroll alla sezione con piccolo delay per permettere l'espansione
    setTimeout(() => {
      let targetRef: React.RefObject<HTMLDivElement> | null = null;

      switch (highlightCategoryId) {
        case 'destinazione':
          targetRef = destinationsRef;
          break;
        case 'attivita':
          targetRef = activitiesRef;
          break;
        case 'pernottamento':
          targetRef = accommodationRef;
          break;
      }

      if (targetRef?.current) {
        targetRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  }, [highlightCategoryId]);

  // Toggle sezione (ora le altre restano aperte)
  const toggleSection = (section: 'destinations' | 'activities' | 'accommodation') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header giorno con navigazione */}
      {(dayNumber || dateString) && (
        <div className="flex items-center justify-between pb-1">
          {/* Freccia sinistra */}
          <button
            onClick={() => onChangeDayIndex?.(dayIndex - 1)}
            disabled={dayIndex === 0}
            className="p-1.5 rounded-full transition-colors disabled:opacity-30"
            style={{ color: colors.textMuted }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Giorno e data */}
          <div className="text-center flex-1">
            {dayNumber && (
              <span
                className="text-xs"
                style={{ color: colors.textMuted }}
              >
                Giorno {dayNumber}
              </span>
            )}
            {dayNumber && dateString && (
              <span
                className="text-xs mx-1"
                style={{ color: colors.textMuted }}
              >
                •
              </span>
            )}
            {dateString && (
              <span
                className="text-xs capitalize"
                style={{ color: colors.textMuted }}
              >
                {dateString}
              </span>
            )}
          </div>

          {/* Freccia destra */}
          <button
            onClick={() => onChangeDayIndex?.(dayIndex + 1)}
            disabled={dayIndex >= totalDays - 1}
            className="p-1.5 rounded-full transition-colors disabled:opacity-30"
            style={{ color: colors.textMuted }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Destinazioni */}
      <div ref={destinationsRef}>
        <DestinationsSection
          destinations={currentDay.destinations || []}
          isExpanded={expandedSections.destinations}
          onToggle={() => toggleSection('destinations')}
          onUpdateDestinations={(destinations) => {
            // Aggiorna le destinazioni in trip.days
            const updatedDays = trip.days.map((day: any) => {
              if (day.id === currentDay.id) {
                return { ...day, destinations: destinations };
              }
              return day;
            });

            // Salva in trip.days E in trip.data per retrocompatibilità
            onUpdateTrip({
              days: updatedDays,
              data: {
                ...trip.data,
                [`${currentDay.id}-destinazione`]: {
                  ...trip.data[`${currentDay.id}-destinazione`],
                  title: destinations.join(' → ')
                }
              }
            });
          }}
          onUpdateTripMetadata={(metadata) => {
            onUpdateTrip({ metadata });
          }}
          trip={trip}
          dayIndex={trip.days.findIndex((d: any) => d.id === currentDay.id)}
          categoryData={categoryData}
        />
      </div>

      {/* Attività */}
      <div ref={activitiesRef}>
        <ActivitiesSection
          activities={categoryData?.attivita?.activities || []}
          isExpanded={expandedSections.activities}
          onToggle={() => toggleSection('activities')}
          onUpdateActivities={(activities) => {
            updateCategory('attivita', 'activities', activities);
          }}
          currentUserId={currentUserId}
          tripMembers={tripMembers}
          activeMembers={activeMembers}
          isDesktop={isDesktop}
          tripId={trip.id}
          tripName={trip.metadata?.name || trip.name || 'Viaggio'}
          dayId={currentDay.id}
          dayNumber={currentDay.number || (dayIndex + 1)}
          trip={trip}
        />
      </div>

      {/* Pernottamento */}
      <div ref={accommodationRef}>
        <AccommodationSection
          accommodation={categoryData?.pernottamento || {}}
          isExpanded={expandedSections.accommodation}
          onToggle={() => toggleSection('accommodation')}
          onUpdateAccommodation={(field, value) => {
            updateCategory('pernottamento', field, value);
          }}
          onUpdateAccommodationMultiple={(fields) => {
            updateCategoryMultiple('pernottamento', fields);
          }}
          currentUserId={currentUserId}
          tripMembers={tripMembers}
          activeMembers={activeMembers}
          isDesktop={isDesktop}
          tripId={trip.id}
          tripName={trip.metadata?.name || trip.name || 'Viaggio'}
          dayId={currentDay.id}
          dayNumber={currentDay.number || (dayIndex + 1)}
          trip={trip}
          dayIndex={trip.days.findIndex((d: any) => d.id === currentDay.id)}
          categoryData={categoryData}
        />
      </div>
    </div>
  );
};

export default PlanningTab;