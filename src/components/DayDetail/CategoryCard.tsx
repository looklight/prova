import React from 'react';
import { Video } from 'lucide-react';
import { BookingToggle, CostInput, MediaButton, TransportSelector } from './ui';
import { LinkCard, ImageCard, NoteCard, VideoEmbed, LinkIcon, ImageIcon, FileTextIcon } from '../MediaCards';

const BOOKING_COLORS = {
  na: 'bg-gray-400',
  no: 'bg-orange-400',
  yes: 'bg-green-400'
};

interface CategoryCardProps {
  category: any;
  categoryData: any;
  suggestion: any;
  transportSelectorOpen: boolean;
  onToggleTransportSelector: () => void;
  onUpdateCategory: (catId: string, field: string, value: any) => void;
  onMediaDialogOpen: (type: string) => void;
  onImageUpload: (file: File) => void;
  onRemoveMedia: (mediaType: string, itemId: number) => void;
  onEditNote: (note: any) => void;
  onOpenCostBreakdown?: () => void;
  currentUserId?: string;
  isHighlighted?: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  categoryData,
  suggestion,
  transportSelectorOpen,
  onToggleTransportSelector,
  onUpdateCategory,
  onMediaDialogOpen,
  onImageUpload,
  onRemoveMedia,
  onEditNote,
  onOpenCostBreakdown,
  currentUserId,
  isHighlighted = false
}) => {
  const isBaseSuggestions = category.id === 'base' && Array.isArray(suggestion);
  const showSuggestion = suggestion && !categoryData.title;

  return (
    <div 
      className={`bg-white rounded-lg shadow p-4 transition-all duration-500 ${
        isHighlighted 
          ? 'ring-2 ring-blue-500' 
          : 'ring-0 ring-transparent'
      }`}
      id={`category-${category.id}`}
    >
      {/* Category Header */}
      <div className="flex items-start justify-between mb-3">
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

        {/* ✅ GESTISCI SPESA in alto a destra - sempre visibile */}
        {category.id !== 'note' && category.id !== 'base' && onOpenCostBreakdown && (
          <button
            onClick={onOpenCostBreakdown}
            className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full font-medium transition-colors flex-shrink-0"
          >
            Gestisci spesa
          </button>
        )}
      </div>

      {/* Suggerimenti Base (multipli) */}
      {showSuggestion && isBaseSuggestions && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-2">💡 Suggerimenti:</div>
          <div className="flex flex-wrap gap-2">
            {suggestion.map((sugg, idx) => (
              <button
                key={idx}
                onClick={() => onUpdateCategory('base', 'title', sugg.value)}
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
          onClick={() => onUpdateCategory(category.id, 'title', suggestion)}
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
            {/* Pallino booking - sempre visibile */}
            {category.id !== 'base' && category.id !== 'note' && (
              <div
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full transition-colors ${BOOKING_COLORS[categoryData.bookingStatus]}`}
              />
            )}
            <input
              type="text"
              value={categoryData.title}
              onChange={(e) => onUpdateCategory(category.id, 'title', e.target.value)}
              placeholder={`Nome ${category.label.toLowerCase()}`}
              className={`w-full py-2.5 border rounded-full text-sm ${
                category.id !== 'base' && category.id !== 'note' 
                  ? 'pl-8 pr-4' 
                  : 'px-4'
              }`}
            />
          </div>
        )}

        {/* Campo costo - sempre visibile */}
        {category.id !== 'note' && category.id !== 'base' && (
          <div className="flex-shrink-0">
            <CostInput
              value={categoryData.cost || ''}
              onChange={(e) => onUpdateCategory(category.id, 'cost', e.target.value)}
              hasSplitCost={categoryData.hasSplitCost || false}
              currentUserId={currentUserId}
              costBreakdown={categoryData.costBreakdown || null}
              onClearBreakdown={() => {
                onUpdateCategory(category.id, 'costBreakdown', null);
                onUpdateCategory(category.id, 'hasSplitCost', false);
              }}
            />
          </div>
        )}
      </div>

      {/* Booking Toggle + Media Buttons - sempre visibili */}
      {category.id !== 'base' && category.id !== 'note' && (
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex-shrink-0">
            <BookingToggle
              value={categoryData.bookingStatus}
              onChange={(val) => onUpdateCategory(category.id, 'bookingStatus', val)}
            />
          </div>

          <div className="flex gap-2 flex-shrink-0">
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
              label="Video"
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
        </div>
      )}

      {/* Note Category (textarea) */}
      {category.id === 'note' && (
        <textarea
          value={categoryData.notes}
          onChange={(e) => onUpdateCategory(category.id, 'notes', e.target.value)}
          placeholder="Aggiungi commento personale"
          className="w-full px-4 py-2.5 border rounded-lg h-24 resize-none text-sm"
        />
      )}

      {/* Media Grid */}
      {category.id !== 'note' && category.id !== 'base' && (
        <>
          {(categoryData.links.length > 0 ||
            categoryData.images.length > 0 ||
            categoryData.videos.length > 0 ||
            categoryData.mediaNotes.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
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
        </>
      )}
    </div>
  );
};

export default CategoryCard;