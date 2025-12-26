import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Bed, MapPin, X, LogIn, LogOut, Loader2, Trash2, Plus, Paperclip, Bell, ExternalLink, Euro, Users, Pencil } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { OfflineDisabled } from '../../ui';
import MediaSection from '../components/MediaSection';
import EntityViewMode from '../components/EntityViewMode';
import AnimatedCollapse from '../components/AnimatedCollapse';
import { useSuggestions } from '../../../hooks/useSuggestions';
import { useMedia, useAccommodationSearch, useGenericImageUpload } from '../hooks';
import LocationModal from '../modals/LocationModal';
import MediaDialog from '../modals/MediaDialog';
import ImageViewer from '../modals/ImageViewer';
import ReminderModal from '../modals/ReminderModal';
import CostBreakdownModal from '../modals/CostBreakdownModal';
import { getGoogleMapsUrl } from '../../../services/geocodingService';

// ============================================
// ALTROVE - AccommodationSection
// Sezione pernottamento con autocomplete
// ============================================

interface AccommodationData {
  title?: string;
  bookingStatus?: 'na' | 'no' | 'yes';
  cost?: string;
  costBreakdown?: Array<{ userId: string; amount: number }>;
  participants?: string[];
  hasSplitCost?: boolean;
  location?: {
    name?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  links?: Array<{ id: number; url: string; title?: string }>;
  images?: Array<{ id: number; url: string; path?: string }>;
  videos?: Array<{ id: number; url: string; note?: string }>;
  mediaNotes?: Array<{ id: number; text: string }>;
  startTime?: string;  // Check-in (unificato)
  endTime?: string;    // Check-out (unificato)
  reminder?: {
    enabled: boolean;
    minutesBefore?: number;
  };
}

interface AccommodationSectionProps {
  accommodation: AccommodationData;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateAccommodation: (field: string, value: any) => void;
  onUpdateAccommodationMultiple: (fields: Record<string, any>) => void;
  currentUserId: string;
  tripMembers: any;
  activeMembers: Array<{ uid: string; displayName: string; avatar?: string }>;
  isDesktop: boolean;
  tripId: string;
  tripName: string;
  dayId: number;
  dayNumber: number;
  trip?: any;
  dayIndex?: number;
  categoryData?: Record<string, any>;
}

const AccommodationSection: React.FC<AccommodationSectionProps> = ({
  accommodation,
  isExpanded,
  onToggle,
  onUpdateAccommodation,
  onUpdateAccommodationMultiple,
  currentUserId,
  tripMembers,
  isDesktop,
  tripId,
  tripName,
  dayId,
  dayNumber,
  trip,
  dayIndex = 0,
  categoryData = {}
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const editContainerRef = useRef<HTMLDivElement>(null);

  // Scroll automatico quando si entra in edit mode
  useEffect(() => {
    if (isEditMode && editContainerRef.current) {
      setTimeout(() => {
        editContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isEditMode]);

  // ========== HOOKS ==========

  // Suggerimenti dal giorno precedente
  const { getSuggestion } = useSuggestions(trip, dayIndex, categoryData);
  const accommodationSuggestion = trip ? getSuggestion('pernottamento') : null;

  // Autocomplete search
  const search = useAccommodationSearch({
    initialValue: accommodation.title || '',
    onSelect: (name, location) => {
      onUpdateAccommodationMultiple({
        title: name,
        location
      });
    },
    onInputChange: (value) => {
      onUpdateAccommodation('title', value);
    }
  });

  // Media management
  const media = useMedia({
    data: accommodation,
    onUpdate: onUpdateAccommodation
  });

  // Image upload
  const imageUpload = useGenericImageUpload({
    tripId,
    entityId: `accommodation-${dayId}`,
    onImageUploaded: (imageData) => {
      const currentImages = accommodation.images || [];
      onUpdateAccommodation('images', [...currentImages, imageData]);
    }
  });

  // ========== COMPUTED ==========
  const hasContent = accommodation.title?.trim();
  const hasLocation = accommodation.location?.coordinates;

  // Costo
  const cost = parseFloat(accommodation.cost || '0') || 0;
  const hasCost = cost > 0;
  const isSharedCost = accommodation.costBreakdown && accommodation.costBreakdown.length > 1;

  // Handler per conferma costo dal modal
  const handleCostConfirm = (
    breakdown: Array<{ userId: string; amount: number }>,
    participants: string[] | null
  ) => {
    const total = breakdown.reduce((sum, e) => sum + e.amount, 0);

    onUpdateAccommodationMultiple({
      costBreakdown: breakdown.length > 0 ? breakdown : null,
      cost: total > 0 ? total.toString() : '',
      participants: participants || undefined,
      participantsUpdatedAt: participants ? new Date() : undefined,
      hasSplitCost: breakdown.length > 1
    });

    setShowCostModal(false);
  };

  // ========== EFFECTS ==========

  // Sync inputValue when entering edit mode
  useEffect(() => {
    if (isEditMode && accommodation.title) {
      search.setInputValue(accommodation.title);
    }
  }, [isEditMode]);

  // Click outside per uscire da edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (showLocationModal || showCostModal || media.mediaDialogType !== null || media.viewerImageUrl !== null) {
        return;
      }

      if (editContainerRef.current && !editContainerRef.current.contains(e.target as Node)) {
        setIsEditMode(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditMode, showLocationModal, showCostModal, media.mediaDialogType, media.viewerImageUrl]);

  // ========== HANDLERS ==========

  const handleLocationConfirm = (location: any, useAsTitle: boolean) => {
    const updates: any = {
      location: {
        name: location.name,
        address: location.address,
        coordinates: location.coordinates
      }
    };
    if (useAsTitle) {
      updates.title = location.name;
      search.setInputValue(location.name);
    }
    onUpdateAccommodationMultiple(updates);
    setShowLocationModal(false);
  };

  const handleLocationRemove = () => {
    onUpdateAccommodation('location', null);
    setShowLocationModal(false);
  };

  const handleDeleteAll = () => {
    if (window.confirm('Eliminare tutti i dati del pernottamento?')) {
      onUpdateAccommodationMultiple({
        title: '',
        bookingStatus: 'na',
        cost: '',
        costBreakdown: null,
        participants: null,
        hasSplitCost: false,
        location: null,
        startTime: '',
        endTime: '',
        links: [],
        images: [],
        videos: [],
        mediaNotes: []
      });
      search.setInputValue('');
      setIsEditMode(false);
    }
  };

  const getBookingColor = () => {
    switch (accommodation.bookingStatus) {
      case 'yes': return colors.success;
      case 'no': return colors.warm;
      default: return colors.textMuted;
    }
  };

  // ========== RENDER ==========
  return (
    <>
      <div
        className="rounded-2xl"
        style={{ backgroundColor: colors.successSoft }}
      >
        {/* Header */}
        <div
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 cursor-pointer"
          style={{ height: '64px' }}
        >
          <div className="flex items-center gap-2">
            <Bed size={20} color={colors.success} />
            <span className="text-base font-semibold" style={{ color: colors.text }}>
              Pernottamento
            </span>
          </div>

          {/* Preview + Freccia */}
          <div className="flex items-center gap-2">
            {!isExpanded && hasContent && (
              <>
                {/* Pallino booking (solo se verde o arancione) */}
                {accommodation.bookingStatus !== 'na' && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getBookingColor() }}
                  />
                )}
                <span
                  className="text-xs text-right truncate"
                  style={{ color: colors.textMuted, maxWidth: '140px' }}
                >
                  {accommodation.title}
                </span>
              </>
            )}
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textMuted} />
            ) : (
              <ChevronDown size={20} color={colors.textMuted} />
            )}
          </div>
        </div>

        {/* Contenuto espanso */}
        <AnimatedCollapse isOpen={isExpanded}>
          <div className="px-4 pb-4">
            {isEditMode ? (
              // === EDIT MODE ===
              <div
                ref={editContainerRef}
                className="rounded-lg p-4 space-y-4"
                style={{ backgroundColor: colors.bgCard }}
              >
                {/* Nome struttura con autocomplete */}
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                    Nome struttura
                  </label>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <OfflineDisabled>
                          <input
                            ref={search.inputRef}
                            type="text"
                            value={search.inputValue}
                            onChange={search.handleInputChange}
                            onKeyDown={search.handleKeyDown}
                            onFocus={() => {
                              if (search.suggestions.length > 0) {
                                search.setShowDropdown(true);
                              }
                            }}
                            placeholder="es. Hotel Roma, Airbnb Centro..."
                            className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2"
                            style={{ borderColor: colors.border, color: colors.text }}
                          />
                        </OfflineDisabled>

                        {search.isLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setShowLocationModal(true)}
                        className={`p-2.5 rounded-lg border transition-colors ${
                          hasLocation ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        title={hasLocation ? 'Modifica posizione' : 'Aggiungi posizione'}
                      >
                        <MapPin size={18} color={hasLocation ? '#EF4444' : colors.textMuted} />
                      </button>
                    </div>

                    {/* Dropdown suggerimenti */}
                    {search.showDropdown && search.suggestions.length > 0 && (
                      <div
                        ref={search.dropdownRef}
                        className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                        style={{ minWidth: '100%', width: 'max-content', maxWidth: '90vw', left: 0 }}
                      >
                        {search.suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => search.handleSelectSuggestion(suggestion)}
                            className="w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-gray-50"
                          >
                            <span className="text-lg flex-shrink-0">{suggestion.type}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">{suggestion.name}</p>
                              <p className="text-xs text-gray-500 truncate">{suggestion.address}</p>
                            </div>
                            <MapPin size={14} className="text-red-500 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {hasLocation && (
                    <div className="flex items-center gap-1 mt-2">
                      <MapPin size={12} color="#EF4444" />
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        {accommodation.location?.address || accommodation.location?.name}
                      </span>
                      <button
                        onClick={() => onUpdateAccommodation('location', null)}
                        className="ml-1 p-0.5 hover:bg-gray-100 rounded"
                      >
                        <X size={12} color={colors.textMuted} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Check-in / Check-out */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                      style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}
                    >
                      <LogIn size={16} color={colors.success} />
                      <div className="flex-1">
                        <span className="text-[10px] uppercase tracking-wide block" style={{ color: colors.textMuted }}>
                          Check-in
                        </span>
                        <OfflineDisabled>
                          <input
                            type="time"
                            value={accommodation.startTime || ''}
                            onChange={(e) => onUpdateAccommodation('startTime', e.target.value)}
                            className="w-full text-sm bg-transparent border-none outline-none p-0"
                            style={{ color: colors.text }}
                          />
                        </OfflineDisabled>
                      </div>
                      {accommodation.startTime && (
                        <button onClick={() => onUpdateAccommodation('startTime', '')} className="p-0.5 hover:bg-gray-100 rounded">
                          <X size={14} color={colors.textMuted} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                      style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}
                    >
                      <LogOut size={16} color={colors.warm} />
                      <div className="flex-1">
                        <span className="text-[10px] uppercase tracking-wide block" style={{ color: colors.textMuted }}>
                          Check-out
                        </span>
                        <OfflineDisabled>
                          <input
                            type="time"
                            value={accommodation.endTime || ''}
                            onChange={(e) => onUpdateAccommodation('endTime', e.target.value)}
                            className="w-full text-sm bg-transparent border-none outline-none p-0"
                            style={{ color: colors.text }}
                          />
                        </OfflineDisabled>
                      </div>
                      {accommodation.endTime && (
                        <button onClick={() => onUpdateAccommodation('endTime', '')} className="p-0.5 hover:bg-gray-100 rounded">
                          <X size={14} color={colors.textMuted} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

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
                          ? 'rgba(251, 146, 60, 0.1)'
                          : 'rgba(59, 130, 246, 0.1)'
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
                  data={accommodation}
                  isUploadingImage={imageUpload.isUploadingImage}
                  fileInputRef={imageUpload.fileInputRef}
                  onRemoveMedia={media.handleRemoveMedia}
                  onImageClick={(url) => media.setViewerImageUrl(url)}
                  onNoteClick={media.handleNoteClick}
                  onOpenMediaDialog={media.openMediaDialog}
                  onImageButtonClick={imageUpload.handleImageClick}
                  onImageUpload={imageUpload.handleImageUpload}
                />

                {/* Footer */}
                <div className="flex justify-between pt-2">
                  <button
                    onClick={handleDeleteAll}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors hover:bg-red-50"
                    style={{ color: colors.warm }}
                  >
                    <Trash2 size={16} />
                    <span>Elimina</span>
                  </button>

                  <button
                    onClick={() => setIsEditMode(false)}
                    className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: colors.success, color: 'white' }}
                  >
                    Fine
                  </button>
                </div>
              </div>
            ) : (
              // === VIEW MODE ===
              hasContent ? (
                <EntityViewMode
                  headerContent={
                    <div className="flex items-center gap-2 p-3">
                      {/* Booking indicator - solo se verde o arancione */}
                      {accommodation.bookingStatus !== 'na' && (
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getBookingColor() }}
                        />
                      )}

                      {/* Titolo */}
                      <span
                        className="flex-1 text-base font-medium truncate"
                        style={{ color: colors.text }}
                      >
                        {accommodation.title}
                      </span>

                      {/* Location indicator */}
                      {hasLocation && (
                        <MapPin size={12} color="#EF4444" className="flex-shrink-0" />
                      )}

                      {/* Media indicator */}
                      {!!(accommodation.images?.length || accommodation.videos?.length || accommodation.links?.length || accommodation.mediaNotes?.length) && (
                        <Paperclip size={12} color={colors.textMuted} className="flex-shrink-0" />
                      )}

                      {/* Reminder indicator */}
                      {accommodation.reminder?.enabled && (
                        <Bell size={12} color={colors.warm} className="flex-shrink-0" />
                      )}

                      {/* Check-in/out compatto */}
                      {(accommodation.startTime || accommodation.endTime) && (
                        <div
                          className="flex flex-col items-end flex-shrink-0"
                          style={{
                            color: colors.textMuted,
                            fontSize: '11px',
                            lineHeight: '1.1'
                          }}
                        >
                          {accommodation.startTime && (
                            <span className="flex items-center gap-0.5">
                              <LogIn size={8} color={colors.success} />
                              {accommodation.startTime}
                            </span>
                          )}
                          {accommodation.endTime && (
                            <span className="flex items-center gap-0.5">
                              <LogOut size={8} color={colors.warm} />
                              {accommodation.endTime}
                            </span>
                          )}
                        </div>
                      )}

                    </div>
                  }
                  onCollapse={() => {}}
                  bookingStatus={accommodation.bookingStatus || 'na'}
                  onBookingChange={(val) => onUpdateAccommodation('bookingStatus', val)}
                  reminderEnabled={accommodation.reminder?.enabled}
                  onReminderClick={() => setShowReminderModal(true)}
                  onEdit={() => setIsEditMode(true)}
                  costBadge={
                    <button
                      onClick={() => setShowCostModal(true)}
                      className="h-10 flex items-center gap-1.5 text-sm px-3 rounded-full hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: hasCost
                          ? (isSharedCost ? 'rgba(251, 146, 60, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                          : colors.bgSubtle
                      }}
                    >
                      <Euro size={14} color={hasCost ? (isSharedCost ? '#f97316' : colors.accent) : colors.textMuted} />
                      <span style={{ color: hasCost ? colors.text : colors.textMuted, fontWeight: hasCost ? 500 : 400 }}>
                        {hasCost ? `${cost.toFixed(0)}€` : '---'}
                      </span>
                      {isSharedCost && (
                        <Users size={12} color="#f97316" />
                      )}
                    </button>
                  }
                  infoContent={
                    hasLocation ? (
                      <button
                        onClick={() => {
                          if (accommodation.location?.coordinates) {
                            const url = getGoogleMapsUrl(
                              accommodation.location.coordinates.lat,
                              accommodation.location.coordinates.lng,
                              accommodation.location.name
                            );
                            window.open(url, '_blank');
                          }
                        }}
                        className="flex items-center gap-2 text-base hover:opacity-70 transition-opacity py-1"
                      >
                        <MapPin size={16} color="#EF4444" />
                        <span
                          className="truncate max-w-[220px]"
                          style={{ color: colors.textMuted }}
                        >
                          {accommodation.location?.name || accommodation.location?.address}
                        </span>
                        <ExternalLink size={14} color={colors.textMuted} />
                      </button>
                    ) : undefined
                  }
                  mediaData={accommodation}
                  onMediaNotesUpdate={(updatedNotes) => onUpdateAccommodation('mediaNotes', updatedNotes)}
                  isDesktop={isDesktop}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm italic text-left" style={{ color: colors.textPlaceholder }}>
                    Dove poserai la testa?
                  </p>

                  {accommodationSuggestion && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px]" style={{ color: colors.textMuted }}>
                        Suggerimento:
                      </span>
                      <button
                        onClick={() => {
                          onUpdateAccommodationMultiple({
                            title: (accommodationSuggestion as any).title,
                            location: (accommodationSuggestion as any).location
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all hover:scale-105"
                        style={{
                          backgroundColor: colors.successSoft,
                          color: colors.text,
                          border: `1px solid ${colors.success}`
                        }}
                      >
                        <Bed size={10} color={colors.success} />
                        <span>{(accommodationSuggestion as any).title}</span>
                        <span
                          className="text-[9px] opacity-70"
                          style={{ color: colors.success }}
                        >
                          ({(accommodationSuggestion as any).sameCity ? 'stessa città' : 'ieri'})
                        </span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: colors.bgCard,
                      color: colors.textMuted
                    }}
                  >
                    <Plus size={14} />
                    <span className="text-sm">Aggiungi pernottamento</span>
                  </button>
                </div>
              )
            )}
          </div>
        </AnimatedCollapse>
      </div>

      {/* Modals */}
      <LocationModal
        isOpen={showLocationModal}
        isDesktop={isDesktop}
        categoryTitle={accommodation.title || 'Pernottamento'}
        baseLocation={null}
        existingLocation={accommodation.location?.coordinates ? {
          name: accommodation.location.name || '',
          address: accommodation.location.address || '',
          coordinates: accommodation.location.coordinates
        } : null}
        onClose={() => setShowLocationModal(false)}
        onConfirm={handleLocationConfirm}
        onRemove={handleLocationRemove}
      />

      <ImageViewer
        isOpen={media.viewerImageUrl !== null}
        imageUrl={media.viewerImageUrl || ''}
        onClose={() => media.setViewerImageUrl(null)}
      />

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

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={showReminderModal}
        isDesktop={isDesktop}
        onClose={() => setShowReminderModal(false)}
        tripId={tripId}
        tripName={tripName}
        dayId={dayId}
        dayNumber={dayNumber}
        categoryId="pernottamento"
        categoryLabel="Pernottamento"
        activityTitle={accommodation.title || 'Pernottamento'}
        tripMembers={Object.keys(tripMembers || {})}
        currentUserId={currentUserId}
        onReminderChange={(enabled) => {
          onUpdateAccommodation('reminder', { enabled });
        }}
      />

      {/* Cost Breakdown Modal */}
      <CostBreakdownModal
        isOpen={showCostModal}
        isDesktop={isDesktop}
        categoryLabel={accommodation.title || 'Pernottamento'}
        currentUserId={currentUserId}
        tripMembers={trip?.sharing?.members ? Object.entries(trip.sharing.members)
          .filter(([_, m]: [string, any]) => m.status === 'active')
          .map(([uid, m]: [string, any]) => ({ uid, displayName: m.displayName || 'Utente', avatar: m.avatar }))
          : []}
        tripSharing={trip?.sharing}
        existingBreakdown={accommodation.costBreakdown || null}
        existingParticipants={accommodation.participants || null}
        existingParticipantsUpdatedAt={null}
        preferredCurrencies={trip?.currency?.preferred || {}}
        tripDays={trip?.days || []}
        tripData={trip?.data || {}}
        currentDayId={dayId.toString()}
        isNewExpense={false}
        onClose={() => setShowCostModal(false)}
        onConfirm={(breakdown, participants) => handleCostConfirm(breakdown as Array<{ userId: string; amount: number }>, participants)}
      />
    </>
  );
};

export default AccommodationSection;
