import React, { useState } from 'react';
import { ChevronUp as CollapseIcon, MapPin, ArrowRight, Pencil, Bell, ExternalLink, Users, Euro, ArrowUpFromDot, ArrowDownToDot } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { Activity } from '../sections/ActivitiesSection';
import { getActivityTypeConfig, ActivityTypeIcon, isTransportType } from '../../../utils/activityTypes';
import { BookingToggle } from '../ui';
import MediaGrid from './MediaGrid';
import ImageViewer from '../modals/ImageViewer';
import MediaDialog from '../modals/MediaDialog';
import ReminderModal from '../modals/ReminderModal';
import CostBreakdownModal from '../modals/CostBreakdownModal';
import EntityViewMode from './EntityViewMode';
import { getGoogleMapsUrl } from '../../../services/geocodingService';

// ============================================
// ALTROVE - ActivityExpanded
// Vista attività espansa (view mode, non edit)
// Usa EntityViewMode come base comune
// ============================================

interface ActivityExpandedProps {
  activity: Activity;
  index: number;
  onEdit: () => void;
  onCollapse: () => void;
  onUpdate: (updates: Partial<Activity>) => void;
  isDesktop: boolean;
}

const ActivityExpanded: React.FC<ActivityExpandedProps> = ({
  activity,
  index,
  onEdit,
  onCollapse,
  onUpdate,
  isDesktop
}) => {
  const typeConfig = getActivityTypeConfig(activity.type);

  // Booking color
  const getBookingColor = () => {
    switch (activity.bookingStatus) {
      case 'yes': return colors.success;
      case 'no': return colors.warm;
      default: return colors.textMuted;
    }
  };

  // Check orari
  const hasTime = activity.startTime || activity.endTime;

  // Costo
  const cost = parseFloat(activity.cost || '0') || 0;

  // Header content per EntityViewMode
  const headerContent = (
    <div className="flex items-center gap-2 p-3">
      {/* Booking indicator */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: getBookingColor() }}
      />

      {/* Titolo */}
      <span
        className="flex-1 text-sm font-medium truncate"
        style={{ color: activity.title ? colors.text : colors.textPlaceholder }}
      >
        {activity.title || 'Nuova attività'}
      </span>

      {/* Tipo attività */}
      <ActivityTypeIcon type={activity.type} size={16} showColor={true} />

      {/* Location indicator */}
      {activity.location?.coordinates && (
        <MapPin size={12} color="#EF4444" className="flex-shrink-0" />
      )}

      {/* Orario su 2 righe compatto */}
      {hasTime && (
        <div
          className="flex flex-col items-end flex-shrink-0"
          style={{
            color: colors.textMuted,
            fontSize: '10px',
            lineHeight: '1.1'
          }}
        >
          <span style={{ visibility: activity.startTime ? 'visible' : 'hidden' }}>
            {activity.startTime || '00:00'}
          </span>
          <span
            className="flex items-center gap-0.5"
            style={{ visibility: activity.endTime ? 'visible' : 'hidden' }}
          >
            <ArrowRight size={6} />
            {activity.endTime || '00:00'}
          </span>
        </div>
      )}

      {/* Collapse icon */}
      <CollapseIcon size={18} color={colors.textMuted} className="flex-shrink-0" />
    </div>
  );

  // Info content per EntityViewMode
  const infoContent = (activity.location?.coordinates || cost > 0) ? (
    <div className="flex flex-wrap items-center gap-3">
      {/* Location */}
      {activity.location?.coordinates && (
        <div className="flex items-center gap-1 text-sm">
          <MapPin size={14} color="#EF4444" />
          <span
            className="truncate max-w-[150px]"
            style={{ color: colors.textMuted }}
          >
            {activity.location.name || activity.location.address || 'Posizione'}
          </span>
        </div>
      )}

      {/* Costo */}
      {cost > 0 && (
        <div className="flex items-center gap-1 text-sm">
          <span style={{ color: colors.textMuted }}>💰</span>
          <span style={{ color: colors.text, fontWeight: 500 }}>{cost.toFixed(0)}€</span>
        </div>
      )}
    </div>
  ) : undefined;

  return (
    <EntityViewMode
      headerContent={headerContent}
      onCollapse={onCollapse}
      bookingStatus={activity.bookingStatus}
      onBookingChange={(val) => onUpdate({ bookingStatus: val })}
      reminderEnabled={activity.reminder?.enabled}
      onReminderClick={() => {
        // TODO: Implementare ReminderModal
        console.log('TODO: Open reminder modal for activity', activity.id);
      }}
      onEdit={onEdit}
      infoContent={infoContent}
      mediaData={activity}
      onMediaNotesUpdate={(updatedNotes) => onUpdate({ mediaNotes: updatedNotes })}
      isDesktop={isDesktop}
    />
  );
};

// ============================================
// ActivityExpandedContent
// Solo il contenuto espanso (senza header)
// Per uso con AnimatedCollapse
// ============================================

interface ActivityExpandedContentProps {
  activity: Activity;
  onEdit: () => void;
  onUpdate: (updates: Partial<Activity>) => void;
  isDesktop: boolean;
  // Props per ReminderModal
  tripId: string;
  tripName: string;
  dayId: string | number;
  dayNumber: number;
  currentUserId: string;
  tripMembers?: string[];
  trip: any;
}

export const ActivityExpandedContent: React.FC<ActivityExpandedContentProps> = ({
  activity,
  onEdit,
  onUpdate,
  isDesktop,
  tripId,
  tripName,
  dayId,
  dayNumber,
  currentUserId,
  tripMembers = [],
  trip
}) => {
  // State per visualizzatori media
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<{ id: number; text: string } | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [isNoteEditing, setIsNoteEditing] = useState(false);

  // State per ReminderModal
  const [showReminderModal, setShowReminderModal] = useState(false);

  // State per CostBreakdownModal
  const [showCostModal, setShowCostModal] = useState(false);

  // Costo
  const cost = parseFloat(activity.cost || '0') || 0;
  const isSharedCost = activity.costBreakdown && activity.costBreakdown.length > 1;

  // Handler per conferma costo dal modal
  const handleCostConfirm = (
    breakdown: Array<{ userId: string; amount: number }>,
    participants: string[] | null
  ) => {
    const total = breakdown.reduce((sum, e) => sum + e.amount, 0);

    onUpdate({
      costBreakdown: breakdown.length > 0 ? breakdown : undefined,
      cost: total > 0 ? total.toString() : '',
      participants: participants || undefined,
      participantsUpdatedAt: participants ? new Date() : undefined,
      hasSplitCost: breakdown.length > 1
    });

    setShowCostModal(false);
  };

  // Media presenti
  const hasMedia = (activity.links?.length || 0) +
    (activity.images?.length || 0) +
    (activity.videos?.length || 0) +
    (activity.mediaNotes?.length || 0) > 0;

  // Handler per nota
  const handleNoteClick = (note: { id: number; text: string }) => {
    setViewingNote(note);
    setNoteInput(note.text);
    setIsNoteEditing(false);
  };

  const handleCloseNote = () => {
    setViewingNote(null);
    setNoteInput('');
    setIsNoteEditing(false);
  };

  const handleSaveNote = () => {
    if (viewingNote && noteInput.trim()) {
      onUpdate({
        mediaNotes: (activity.mediaNotes || []).map(n =>
          n.id === viewingNote.id ? { ...n, text: noteInput.trim() } : n
        )
      });
    }
    handleCloseNote();
  };

  // Per trasporti: departure e arrival separati
  // Per attività normali: singola location
  const isTransport = isTransportType(activity.type);
  const departureLocation = activity.departure?.location;
  const arrivalLocation = activity.arrival?.location;
  const normalLocation = activity.location;

  // Handler per aprire Google Maps
  const handleOpenGoogleMaps = (location: { coordinates?: { lat: number; lng: number }; name?: string; address?: string } | undefined) => {
    if (location?.coordinates) {
      const url = getGoogleMapsUrl(
        location.coordinates.lat,
        location.coordinates.lng,
        location.name
      );
      window.open(url, '_blank');
    }
  };

  // Cost badge - sempre visibile, altezza 40px (come booking toggle), sfondo senza bordo
  const costBadge = (
    <button
      onClick={() => setShowCostModal(true)}
      className="h-10 flex items-center gap-1.5 text-sm px-3 rounded-full hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: cost > 0
          ? (isSharedCost ? 'rgba(251, 146, 60, 0.15)' : 'rgba(59, 130, 246, 0.1)')
          : colors.bgSubtle
      }}
    >
      <Euro size={14} color={cost > 0 ? (isSharedCost ? '#f97316' : colors.accent) : colors.textMuted} />
      <span style={{ color: cost > 0 ? colors.text : colors.textMuted, fontWeight: cost > 0 ? 500 : 400 }}>
        {cost > 0 ? `${cost.toFixed(0)}€` : '---'}
      </span>
      {isSharedCost && (
        <Users size={12} color="#f97316" />
      )}
    </button>
  );

  // Info content - location (doppia per trasporti)
  const infoContent = (() => {
    // Trasporti: mostra partenza e/o arrivo
    if (isTransport && (departureLocation?.coordinates || arrivalLocation?.coordinates)) {
      return (
        <div className="flex flex-col gap-1">
          {departureLocation?.coordinates && (
            <button
              onClick={() => handleOpenGoogleMaps(departureLocation)}
              className="flex items-center gap-2 text-base hover:opacity-70 transition-opacity py-1"
            >
              <ArrowUpFromDot size={14} color={colors.accent} style={{ transform: 'rotate(90deg)' }} />
              <MapPin size={16} color="#EF4444" />
              <span className="truncate max-w-[180px]" style={{ color: colors.textMuted }}>
                {departureLocation.name || departureLocation.address || 'Partenza'}
              </span>
              <ExternalLink size={14} color={colors.textMuted} />
            </button>
          )}
          {arrivalLocation?.coordinates && (
            <button
              onClick={() => handleOpenGoogleMaps(arrivalLocation)}
              className="flex items-center gap-2 text-base hover:opacity-70 transition-opacity py-1"
            >
              <ArrowDownToDot size={14} color={colors.accent} style={{ transform: 'rotate(-90deg)' }} />
              <MapPin size={16} color="#EF4444" />
              <span className="truncate max-w-[180px]" style={{ color: colors.textMuted }}>
                {arrivalLocation.name || arrivalLocation.address || 'Arrivo'}
              </span>
              <ExternalLink size={14} color={colors.textMuted} />
            </button>
          )}
        </div>
      );
    }

    // Attività normali: singola location
    if (normalLocation?.coordinates) {
      return (
        <button
          onClick={() => handleOpenGoogleMaps(normalLocation)}
          className="flex items-center gap-2 text-base hover:opacity-70 transition-opacity py-1"
        >
          <MapPin size={16} color="#EF4444" />
          <span className="truncate max-w-[220px]" style={{ color: colors.textMuted }}>
            {normalLocation.name || normalLocation.address || 'Posizione'}
          </span>
          <ExternalLink size={14} color={colors.textMuted} />
        </button>
      );
    }

    return null;
  })();

  return (
    <>
      <div className="px-3 pb-3 pt-0 space-y-3 border-t" style={{ borderColor: colors.border }}>
        {/* Riga azioni: BookingToggle + Campanella a sx | Costi a dx */}
        <div className="flex items-center justify-between pt-3">
          {/* Booking Toggle + Campanella a sinistra */}
          <div className="flex items-center gap-2">
            <BookingToggle
              value={activity.bookingStatus}
              onChange={(val) => onUpdate({ bookingStatus: val })}
            />

            {/* Notifica - altezza allineata al booking toggle (40px) */}
            <button
              onClick={() => setShowReminderModal(true)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                activity.reminder?.enabled
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
              }`}
              title="Imposta promemoria"
            >
              <Bell size={18} />
            </button>
          </div>

          {/* Badge costi a destra */}
          {costBadge}
        </div>

        {/* Info row - location */}
        {infoContent}

        {/* Media grid */}
        {hasMedia && (
          <MediaGrid
            links={activity.links || []}
            images={activity.images || []}
            videos={activity.videos || []}
            mediaNotes={activity.mediaNotes || []}
            isEditMode={false}
            onImageClick={(url) => setViewerImageUrl(url)}
            onNoteClick={handleNoteClick}
          />
        )}

        {/* Pulsante Modifica centrato in fondo - senza sfondo */}
        <div className="flex justify-center pt-1">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-sm px-4 py-2 transition-opacity hover:opacity-60"
            style={{ color: colors.textMuted }}
          >
            <Pencil size={14} />
            <span>Modifica</span>
          </button>
        </div>
      </div>

      {/* Image Viewer */}
      <ImageViewer
        isOpen={viewerImageUrl !== null}
        imageUrl={viewerImageUrl || ''}
        onClose={() => setViewerImageUrl(null)}
      />

      {/* Note Dialog */}
      <MediaDialog
        isOpen={viewingNote !== null}
        type="note"
        isDesktop={isDesktop}
        linkInput=""
        linkTitle=""
        videoInput=""
        videoNote=""
        noteInput={noteInput}
        editingNote={viewingNote}
        isNoteEditing={isNoteEditing}
        onClose={handleCloseNote}
        onLinkInputChange={() => {}}
        onLinkTitleChange={() => {}}
        onVideoInputChange={() => {}}
        onVideoNoteChange={() => {}}
        onNoteInputChange={setNoteInput}
        onSubmit={handleSaveNote}
        onStartNoteEditing={() => setIsNoteEditing(true)}
      />

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={showReminderModal}
        isDesktop={isDesktop}
        onClose={() => setShowReminderModal(false)}
        tripId={tripId}
        tripName={tripName}
        dayId={dayId}
        dayNumber={dayNumber}
        categoryId={`activity-${activity.id}`}
        categoryLabel="Attività"
        activityTitle={activity.title || 'Attività'}
        tripMembers={tripMembers}
        currentUserId={currentUserId}
        onReminderChange={(enabled) => {
          onUpdate({ reminder: { enabled } });
        }}
      />

      {/* Cost Breakdown Modal */}
      <CostBreakdownModal
        isOpen={showCostModal}
        isDesktop={isDesktop}
        categoryLabel={activity.title || 'Attività'}
        currentUserId={currentUserId}
        tripMembers={trip?.sharing?.members ? Object.entries(trip.sharing.members)
          .filter(([_, m]: [string, any]) => m.status === 'active')
          .map(([uid, m]: [string, any]) => ({ uid, displayName: m.displayName || 'Utente', avatar: m.avatar }))
          : []}
        tripSharing={trip?.sharing}
        existingBreakdown={activity.costBreakdown || null}
        existingParticipants={activity.participants || null}
        existingParticipantsUpdatedAt={activity.participantsUpdatedAt || null}
        preferredCurrencies={trip?.currency?.preferred || {}}
        tripDays={trip?.days || []}
        tripData={trip?.data || {}}
        currentDayId={dayId.toString()}
        existingType={activity.type}
        isNewExpense={false}
        onClose={() => setShowCostModal(false)}
        onConfirm={(breakdown, participants) => handleCostConfirm(breakdown as Array<{ userId: string; amount: number }>, participants)}
      />
    </>
  );
};

export default ActivityExpanded;
