import React from 'react';
import { Video, MapPin } from 'lucide-react';
import { BookingToggle, CostInput, MediaButton, TransportSelector } from './ui';
import { LinkCard, ImageCard, NoteCard, VideoEmbed, LinkIcon, ImageIcon, FileTextIcon } from './MediaCards';
import OfflineDisabled from '../OfflineDisabled';
import ActivitySchedule from './ui/ActivitySchedule';

const BOOKING_COLORS = {
  na: 'bg-gray-400',
  no: 'bg-orange-400',
  yes: 'bg-green-400'
};

const slideInStyle = `
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(8px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.slide-in-right {
  animation: slideInRight 0.25s ease-out forwards;
}
`;

interface CategoryCardProps {
  category: any;
  categoryData: any;
  suggestion: any;
  transportSelectorOpen: boolean;
  onToggleTransportSelector: () => void;
  onUpdateCategory: (catId: string, field: string, value: any) => void;
  onUpdateCategoryMultiple?: (catId: string, fields: Record<string, any>) => void;
  onMediaDialogOpen: (type: string) => void;
  onImageUpload: (file: File) => void;
  onRemoveMedia: (mediaType: string, itemId: number) => void;
  onEditNote: (note: any) => void;
  onOpenCostBreakdown?: () => void;
  onOpenLocation?: () => void;
  currentUserId?: string;
  tripMembers?: Record<string, { status: string; displayName: string; avatar?: string }>;
  isSelected?: boolean;
  isActive?: boolean;
  onSelect?: () => void;
  tripId?: string;
  tripName?: string;
  dayId?: string;
  dayNumber?: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  categoryData,
  suggestion,
  transportSelectorOpen,
  onToggleTransportSelector,
  onUpdateCategory,
  onUpdateCategoryMultiple,
  onMediaDialogOpen,
  onImageUpload,
  onRemoveMedia,
  onEditNote,
  onOpenCostBreakdown,
  onOpenLocation,
  currentUserId,
  tripMembers,
  isSelected = false,
  isActive = false,
  onSelect,
  tripId,
  tripName,
  dayId,
  dayNumber
}) => {
  const [showBookingToggle, setShowBookingToggle] = React.useState(false);

  // Chiudi booking toggle quando la card non è più attiva
  React.useEffect(() => {
    if (!isActive) {
      setShowBookingToggle(false);
    }
  }, [isActive]);

  const isBaseSuggestions = category.id === 'base' && Array.isArray(suggestion);
  const showSuggestion = suggestion && !categoryData.title;

  // Contenuto presente (per mostrare pallino booking)
  const hasContent = categoryData.title?.trim() !== '' || categoryData.cost?.trim() !== '';

  // Location presente
  const hasLocation = categoryData.location?.coordinates != null;

  // Categorie che possono avere location (escludi base, note, otherExpenses)
  const canHaveLocation = !['base', 'note', 'otherExpenses'].includes(category.id);

  // Mostra pulsante location: quando attivo OPPURE quando ha location
  const showLocationButton = canHaveLocation &&
    onOpenLocation &&
    (isActive || hasLocation);

  // Media presenti
  const hasMedia = categoryData.links?.length > 0 ||
    categoryData.images?.length > 0 ||
    categoryData.videos?.length > 0 ||
    categoryData.mediaNotes?.length > 0;

  // Orario presente
  const hasTime = categoryData.startTime || categoryData.endTime;

  // Handler click sulla card
  const handleCardClick = (e: React.MouseEvent) => {
    // Non selezionare se si sta interagendo con input/button/select
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('input, button, select, textarea, a');

    if (!isInteractive && onSelect) {
      onSelect();
    }
  };

  return (
    <>
      <style>{slideInStyle}</style>
      <div
        className={`bg-white rounded-lg shadow p-4 transition-all duration-200 cursor-pointer ${isSelected
          ? 'ring-2 ring-blue-500'
          : 'ring-2 ring-transparent hover:shadow-md'
          }`}
        id={`category-${category.id}`}
        onClick={handleCardClick}
      >
        {/* Category Header */}
        <div className="flex items-center justify-between mb-3 h-9">
          <h2 className="text-base font-semibold flex items-center gap-2">
            {(category.id === 'spostamenti1' || category.id === 'spostamenti2') ? (
              <TransportSelector
                categoryId={category.id}
                currentMode={categoryData.transportMode}
                isOpen={transportSelectorOpen}
                onToggle={onToggleTransportSelector}
                onSelect={(mode) => onUpdateCategory(category.id, 'transportMode', mode)}
              />
            ) : (
              <span>{category.emoji}</span>
            )}
            <span>{category.label}</span>
          </h2>

          {/* Gruppo pulsanti a destra */}
          <div className="flex items-center gap-1">
            {/* Pulsante Location */}
            {showLocationButton && (
              <OfflineDisabled>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLocation();
                  }}
                  className={`slide-in-right w-11 h-9 flex items-center justify-center rounded-full 
                    active:scale-90 transition-transform ${hasLocation
                      ? isActive
                        ? 'text-red-500 active:text-red-700'
                        : 'text-red-300'
                      : 'text-gray-400 active:text-gray-600'
                    }`}
                  title={hasLocation ? 'Modifica posizione' : 'Aggiungi posizione'}
                >
                  <MapPin size={24} strokeWidth={hasLocation ? 2 : 1.5} />
                </button>
              </OfflineDisabled>
            )}

            {/* Gestisci spesa - sempre visibile */}
            {category.id !== 'note' && category.id !== 'base' && onOpenCostBreakdown && (
              <OfflineDisabled>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCostBreakdown();
                  }}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full font-medium transition-colors flex-shrink-0"
                >
                  Gestisci spesa
                </button>
              </OfflineDisabled>
            )}
          </div>
        </div>

        {/* Suggerimenti Base (multipli) */}
        {showSuggestion && isBaseSuggestions && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-2">💡 Suggerimenti:</div>
            <div className="flex flex-wrap gap-2">
              {suggestion.map((sugg, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCategory('base', 'title', sugg.value);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full text-sm font-medium transition-colors"
                >
                  <span>{sugg.icon}</span>
                  <span>{sugg.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggerimenti altre categorie (singolo) */}
        {showSuggestion && !isBaseSuggestions && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onUpdateCategory(category.id, 'title', suggestion);
            }}
            className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-blue-600 font-medium mb-1">Suggerimento</div>
                <div className="text-sm font-semibold text-blue-900">{suggestion}</div>
              </div>
              <div className="ml-3 px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
                Usa
              </div>
            </div>
          </div>
        )}

        {/* Input Fields */}
        <div className="flex gap-2 mb-3">
          {category.id !== 'note' && (
            <div className="flex-1 min-w-0 relative">
              {/* Pallino booking - sempre visibile se c'è contenuto */}
              {category.id !== 'base' && category.id !== 'note' && hasContent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBookingToggle(!showBookingToggle);
                  }}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 w-11 h-9 flex items-center justify-center cursor-pointer group"
                  title="Gestisci prenotazione"
                >
                  {/* Pallino visivo piccolo, area touch grande - con centro bianco se ha orario */}
                  <span
                    className={`w-3 h-3 rounded-full transition-all group-hover:scale-125 ${BOOKING_COLORS[categoryData.bookingStatus]} ${hasTime ? 'flex items-center justify-center' : ''}`}
                  >
                    {hasTime && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              )}
              <OfflineDisabled>
                <input
                  type="text"
                  value={categoryData.title}
                  onChange={(e) => onUpdateCategory(category.id, 'title', e.target.value)}
                  onFocus={() => onSelect?.()}
                  placeholder={`Nome ${category.label.toLowerCase()}`}
                  className={`w-full px-4 py-2.5 border rounded-full text-sm ${category.id !== 'base' && category.id !== 'note' && hasContent
                    ? 'pl-10'
                    : ''
                    }`}
                />
              </OfflineDisabled>
            </div>
          )}

          {/* Campo costo - sempre visibile */}
          {category.id !== 'note' && category.id !== 'base' && (
            <div className="flex-shrink-0" onClickCapture={() => onSelect?.()}>
              <OfflineDisabled>
                <CostInput
                  value={categoryData.cost || ''}
                  onChange={(e) => onUpdateCategory(category.id, 'cost', e.target.value)}
                  hasSplitCost={categoryData.hasSplitCost || false}
                  currentUserId={currentUserId}
                  costBreakdown={categoryData.costBreakdown || null}
                  tripMembers={tripMembers}
                  onClearBreakdown={() => {
                    onUpdateCategory(category.id, 'costBreakdown', null);
                    onUpdateCategory(category.id, 'hasSplitCost', false);
                  }}
                  onOpenManageBreakdown={onOpenCostBreakdown}
                />
              </OfflineDisabled>
            </div>
          )}
        </div>

        {/* Booking Toggle + ActivitySchedule */}
        {category.id !== 'base' && category.id !== 'note' && (
          <div className={`transition-all duration-200 ease-out overflow-hidden ${showBookingToggle
            ? 'opacity-100 max-h-20 translate-y-0 mb-3'
            : 'opacity-0 max-h-0 -translate-y-2'
            }`}>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <BookingToggle
                value={categoryData.bookingStatus}
                onChange={(val) => onUpdateCategory(category.id, 'bookingStatus', val)}
              />
              <ActivitySchedule
                startTime={categoryData.startTime || null}
                endTime={categoryData.endTime || null}
                reminder={categoryData.reminder || null}
                reminderId={categoryData.reminderId || null}
                onSave={(data) => {
                  if (onUpdateCategoryMultiple) {
                    onUpdateCategoryMultiple(category.id, {
                      startTime: data.startTime,
                      endTime: data.endTime,
                      reminder: data.reminder,
                      reminderId: data.reminderId
                    });
                  }
                }}
                tripId={tripId}
                tripName={tripName}
                dayId={dayId}
                dayNumber={dayNumber}
                categoryId={category.id}
                categoryLabel={category.label}
                activityTitle={categoryData.title || ''}
                participants={categoryData.participants || null}
                tripMembers={Object.keys(tripMembers || {}).filter(uid => tripMembers[uid]?.status === 'active')}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        )}

        {/* Media Buttons - visibili direttamente quando isActive */}
        {category.id !== 'base' && category.id !== 'note' && (
          <div className={`transition-all duration-200 ease-out overflow-hidden ${isActive
            ? 'opacity-100 max-h-20 translate-y-0 mt-1 mb-2'
            : 'opacity-0 max-h-0 -translate-y-2 pointer-events-none'
            }`}>
            <OfflineDisabled>
              <div className="flex justify-around">
                <MediaButton
                  icon={LinkIcon}
                  label="Link"
                  color="blue"
                  onClick={() => onMediaDialogOpen('link')}
                />

                <MediaButton
                  icon={ImageIcon}
                  label="Foto"
                  color="green"
                  isLabel={true}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])}
                  />
                </MediaButton>

                <MediaButton
                  icon={Video}
                  label="Social"
                  color="purple"
                  onClick={() => onMediaDialogOpen('video')}
                />

                <MediaButton
                  icon={FileTextIcon}
                  label="Nota"
                  color="amber"
                  onClick={() => onMediaDialogOpen('note')}
                />
              </div>
            </OfflineDisabled>
          </div>
        )}

        {/* Note Category (textarea) */}
        {category.id === 'note' && (
          <OfflineDisabled>
            <textarea
              value={categoryData.notes}
              onChange={(e) => onUpdateCategory(category.id, 'notes', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Aggiungi commento personale"
              className="w-full px-4 py-2.5 border rounded-lg h-24 resize-none text-sm"
            />
          </OfflineDisabled>
        )}

        {/* Media Grid - sempre visibile se ci sono media */}
        {category.id !== 'note' && category.id !== 'base' && hasMedia && (
          <div className="grid grid-cols-3 gap-2 mt-1">
            {categoryData.links.map(link => (
              <LinkCard
                key={link.id}
                link={link}
                onRemove={() => onRemoveMedia('links', link.id)}
              />
            ))}
            {categoryData.images.map(image => (
              <ImageCard
                key={image.id}
                image={image}
                onRemove={() => onRemoveMedia('images', image.id)}
              />
            ))}
            {categoryData.videos.map(video => (
              <VideoEmbed
                key={video.id}
                video={video}
                onRemove={() => onRemoveMedia('videos', video.id)}
              />
            ))}
            {categoryData.mediaNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onRemove={() => onRemoveMedia('mediaNotes', note.id)}
                onClick={() => onEditNote(note)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default CategoryCard;