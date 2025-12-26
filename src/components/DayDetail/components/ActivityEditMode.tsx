import React, { useRef, useEffect, useState } from 'react';
import { colors, rawColors } from '../../../styles/theme';
import { animationStyles } from '../../../styles/animations';
import { Activity } from '../sections/ActivitiesSection';
import {
  isTransportType,
  ActivityType,
  ACTIVITY_TYPES_FOR_SELECTOR,
  getActivityTypeConfig
} from '../../../utils/activityTypes';
import { OfflineDisabled } from '../../ui';

// Hooks
import { useActivityLocation, useActivityMedia, useGenericImageUpload } from '../hooks';
import { useDebouncedInput } from '../../../hooks/useDebouncedInput';

// Components
import TransportFields from './TransportFields';
import TimeInput from './TimeInput';
import MediaSection from './MediaSection';
import ActivityEditFooter from './ActivityEditFooter';

// Modals
import MediaDialog from '../modals/MediaDialog';
import LocationModal from '../modals/LocationModal';
import ImageViewer from '../modals/ImageViewer';
import CostBreakdownModal from '../modals/CostBreakdownModal';

// Icons
import { Euro, Pencil, Plus, Users, MapPin } from 'lucide-react';

// ============================================
// ALTROVE - ActivityEditMode
// Orchestratore per editing attività (semplificato)
// ============================================

interface ActivityEditModeProps {
  activity: Activity;
  index: number;
  onUpdate: (updates: Partial<Activity>) => void;
  onDelete: () => void;
  onClose: () => void;
  currentUserId: string;
  tripMembers: any;
  activeMembers: Array<{ uid: string; displayName: string; avatar?: string }>;
  isDesktop: boolean;
  tripId: string;
  dayId: number;
  isClosing?: boolean;
  trip: any;
}

const ActivityEditMode: React.FC<ActivityEditModeProps> = ({
  activity,
  index,
  onUpdate,
  onDelete,
  onClose,
  currentUserId,
  tripMembers,
  activeMembers,
  isDesktop,
  tripId,
  dayId,
  isClosing = false,
  trip
}) => {
  // ========== REFS ==========
  const containerRef = useRef<HTMLDivElement>(null);
  const typeBubbleRef = useRef<HTMLDivElement>(null);

  // ========== STATE ==========
  const [isTypeExpanded, setIsTypeExpanded] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);

  // ========== HOOKS ==========
  const location = useActivityLocation({ activity, onUpdate });
  const media = useActivityMedia({ activity, onUpdate });

  // Debounce per il titolo (evita scritture Firebase ad ogni carattere)
  const titleInput = useDebouncedInput(
    activity.title,
    (value) => onUpdate({ title: value }),
    { delay: 800 }
  );

  const imageUpload = useGenericImageUpload({
    tripId,
    entityId: activity.id,
    onImageUploaded: (imageData) => {
      onUpdate({ images: [...(activity.images || []), imageData] });
    }
  });

  // ========== TYPE CHANGE HANDLER ==========
  const handleTypeChange = (newType: ActivityType) => {
    const wasTransport = isTransportType(activity.type);
    const willBeTransport = isTransportType(newType);

    if (wasTransport && !willBeTransport) {
      const migratedLocation = activity.departure?.location || activity.arrival?.location;
      const updates: Partial<Activity> = { type: newType };
      if (migratedLocation) updates.location = migratedLocation;
      location.setLocationInputText(migratedLocation?.name || '');
      onUpdate(updates);
    } else if (!wasTransport && willBeTransport) {
      const updates: Partial<Activity> = { type: newType };
      if (activity.location) {
        updates.departure = { location: activity.location };
      }
      location.setDepartureInputText(activity.location?.name || '');
      location.setArrivalInputText('');
      onUpdate(updates);
    } else {
      onUpdate({ type: newType });
    }

    setIsTypeExpanded(false);
  };

  // ========== CLICK OUTSIDE ==========
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Chiudi bubble tipologie se click fuori
      if (isTypeExpanded && typeBubbleRef.current &&
          !typeBubbleRef.current.contains(e.target as Node)) {
        setIsTypeExpanded(false);
      }

      // Non chiudere edit mode se un modal è aperto o già in chiusura
      if (location.locationModalTarget !== null ||
          media.mediaDialogType !== null ||
          media.viewerImageUrl !== null ||
          isTypeExpanded ||
          showCostModal ||
          isClosing) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, location.locationModalTarget, media.mediaDialogType, media.viewerImageUrl, isTypeExpanded, showCostModal, isClosing]);

  // ========== TYPE CONFIG ==========
  const typeConfig = getActivityTypeConfig(activity.type);
  const TypeIcon = typeConfig.selectorIcon || typeConfig.icon;

  // ========== COST HELPERS ==========
  const cost = parseFloat(activity.cost || '0') || 0;
  const hasCost = cost > 0;
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

  // ========== RENDER ==========
  return (
    <>
      <div ref={containerRef}>
        {/* Form Content */}
        <div className="p-3 space-y-3">

          {/* ROW 1: Tipo (pallino) + Nome attività + MapPin (se non trasporto) */}
          <div className="flex items-center gap-2">
            {/* Pallino tipo con bubble */}
            <div className="relative" ref={typeBubbleRef}>
              <button
                onClick={() => setIsTypeExpanded(!isTypeExpanded)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  backgroundColor: `${typeConfig.color}15`,
                  border: `1.5px solid ${typeConfig.color}40`,
                  ...animationStyles.subtlePulse
                }}
              >
                <TypeIcon size={20} color={typeConfig.color} strokeWidth={2} />
              </button>

              {/* Bubble tipologie */}
              {isTypeExpanded && (
                <div
                  className="absolute left-0 top-full mt-2 z-50 p-2.5 rounded-xl shadow-lg border"
                  style={{
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                    minWidth: '300px',
                    ...animationStyles.bubbleIn
                  }}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_TYPES_FOR_SELECTOR.map((type) => {
                      const Icon = type.selectorIcon || type.icon;
                      const isSelected = activity.type === type.value;

                      return (
                        <button
                          key={type.value}
                          onClick={() => handleTypeChange(type.value)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border"
                          style={{
                            backgroundColor: isSelected ? type.color : colors.bgSubtle,
                            color: isSelected ? 'white' : colors.text,
                            borderColor: isSelected ? type.color : colors.border
                          }}
                        >
                          <Icon size={12} />
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Input nome (con debounce) */}
            <div className="flex-1">
              <OfflineDisabled>
                <input
                  type="text"
                  value={titleInput.localValue}
                  onChange={titleInput.handleChange}
                  onBlur={titleInput.flush}
                  placeholder="Nome attività..."
                  className="w-full text-base bg-transparent border-none outline-none py-2"
                  style={{ color: colors.text }}
                />
              </OfflineDisabled>
            </div>

            {/* MapPin button - solo per attività non-trasporto */}
            {!isTransportType(activity.type) && (
              <button
                onClick={() => location.openLocationModal('main')}
                className={`p-2.5 rounded-lg border transition-colors flex-shrink-0 ${
                  activity.location?.coordinates
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                title={activity.location?.coordinates
                  ? `📍 ${activity.location.name || activity.location.address}`
                  : 'Aggiungi posizione'
                }
              >
                <MapPin
                  size={18}
                  color={activity.location?.coordinates ? '#EF4444' : colors.textMuted}
                />
              </button>
            )}
          </div>

          {/* Location preview - solo se non trasporto e ha location */}
          {!isTransportType(activity.type) && activity.location?.coordinates && (
            <p
              className="text-xs truncate ml-12 -mt-1 flex items-center gap-1"
              style={{ color: colors.textMuted }}
            >
              <MapPin size={12} className="text-red-500 flex-shrink-0" />
              {activity.location.name || activity.location.address}
            </p>
          )}

          {/* Divider sottile */}
          <div
            className="h-px mx-1"
            style={{ backgroundColor: colors.border }}
          />

          {/* LAYOUT CONDIZIONALE: Trasporti vs Orari semplici */}
          {isTransportType(activity.type) ? (
            <TransportFields
              activity={activity}
              departureInputText={location.departureInputText}
              arrivalInputText={location.arrivalInputText}
              onUpdate={onUpdate}
              onLocationTextChange={location.handleLocationTextChange}
              onLocationSelect={location.handleLocationSelect}
              onOpenLocationModal={location.openLocationModal}
            />
          ) : (
            /* Solo orari per attività normali (il MapPin è già nella riga del titolo) */
            <div className="flex items-end gap-3 flex-wrap">
              <TimeInput
                value={activity.startTime}
                onChange={(value) => onUpdate({ startTime: value })}
                label="Inizio"
              />
              <TimeInput
                value={activity.endTime}
                onChange={(value) => onUpdate({ endTime: value })}
                label="Fine"
              />
            </div>
          )}

          {/* Cost Section */}
          <div>
            <label
              className="text-xs font-medium mb-2 block"
              style={{ color: colors.textMuted }}
            >
              Costo
            </label>
            <button
              onClick={() => setShowCostModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors hover:border-gray-300"
              style={{
                backgroundColor: hasCost
                  ? isSharedCost
                    ? 'rgba(251, 146, 60, 0.1)' // arancione per condiviso
                    : 'rgba(59, 130, 246, 0.1)' // blu per personale
                  : colors.bgSubtle,
                borderColor: hasCost
                  ? isSharedCost
                    ? 'rgba(251, 146, 60, 0.3)'
                    : 'rgba(59, 130, 246, 0.3)'
                  : colors.border
              }}
            >
              <div className="flex items-center gap-2">
                <Euro size={16} color={hasCost ? colors.accent : colors.textMuted} />
                {hasCost ? (
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.text }}
                  >
                    {cost.toFixed(2)} €
                  </span>
                ) : (
                  <span
                    className="text-sm"
                    style={{ color: colors.textPlaceholder }}
                  >
                    Nessun costo inserito
                  </span>
                )}
                {isSharedCost && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100">
                    <Users size={10} color="#f97316" />
                    <span className="text-xs text-orange-600">Condiviso</span>
                  </div>
                )}
              </div>
              {hasCost ? (
                <Pencil size={14} color={colors.textMuted} />
              ) : (
                <Plus size={14} color={colors.accent} />
              )}
            </button>
          </div>

          {/* Media Section */}
          <MediaSection
            data={activity}
            isUploadingImage={imageUpload.isUploadingImage}
            fileInputRef={imageUpload.fileInputRef}
            onRemoveMedia={media.handleRemoveMedia}
            onImageClick={(url) => media.setViewerImageUrl(url)}
            onNoteClick={media.handleNoteClick}
            onOpenMediaDialog={media.openMediaDialog}
            onImageButtonClick={imageUpload.handleImageClick}
            onImageUpload={imageUpload.handleImageUpload}
          />
        </div>

        {/* Footer */}
        <ActivityEditFooter
          onDelete={onDelete}
          onClose={onClose}
        />
      </div>

      {/* ========== MODALS ========== */}

      {/* Location Modal */}
      <LocationModal
        isOpen={location.locationModalTarget !== null}
        isDesktop={isDesktop}
        categoryTitle={
          location.locationModalTarget === 'departure' ? 'Partenza' :
          location.locationModalTarget === 'arrival' ? 'Arrivo' :
          activity.title
        }
        baseLocation={null}
        existingLocation={(() => {
          const loc = location.locationModalTarget === 'departure'
            ? activity.departure?.location
            : location.locationModalTarget === 'arrival'
              ? activity.arrival?.location
              : activity.location;
          return loc?.coordinates ? {
            name: loc.name || '',
            address: loc.address || '',
            coordinates: loc.coordinates
          } : null;
        })()}
        onClose={location.closeLocationModal}
        onConfirm={location.handleLocationConfirm}
        onRemove={location.handleLocationRemove}
      />

      {/* Image Viewer */}
      <ImageViewer
        isOpen={media.viewerImageUrl !== null}
        imageUrl={media.viewerImageUrl || ''}
        onClose={() => media.setViewerImageUrl(null)}
      />

      {/* Media Dialog */}
      <MediaDialog
        isOpen={media.mediaDialogType !== null}
        type={media.mediaDialogType}
        isDesktop={isDesktop}
        linkInput={media.linkInput}
        linkTitle={media.linkTitle}
        videoInput={media.videoInput}
        videoNote={media.videoNote}
        noteInput={media.noteInput}
        editingNote={media.editingNote}
        isNoteEditing={media.isNoteEditing}
        onClose={media.closeMediaDialog}
        onLinkInputChange={media.setLinkInput}
        onLinkTitleChange={media.setLinkTitle}
        onVideoInputChange={media.setVideoInput}
        onVideoNoteChange={media.setVideoNote}
        onNoteInputChange={media.setNoteInput}
        onSubmit={media.handleMediaSubmit}
        onStartNoteEditing={() => media.setIsNoteEditing(true)}
      />

      {/* Cost Breakdown Modal */}
      <CostBreakdownModal
        isOpen={showCostModal}
        isDesktop={isDesktop}
        categoryLabel={activity.title || 'Attività'}
        currentUserId={currentUserId}
        tripMembers={activeMembers}
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

export default ActivityEditMode;
