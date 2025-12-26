import React, { useState } from 'react';
import { Pencil, Bell } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { BookingToggle } from '../ui';
import MediaGrid from './MediaGrid';
import ImageViewer from '../modals/ImageViewer';
import MediaDialog from '../modals/MediaDialog';

// ============================================
// ALTROVE - EntityViewMode
// Componente generico per view mode espansa
// Usato da ActivityExpanded e AccommodationSection
// ============================================

interface MediaData {
  links?: Array<{ id: number; url: string; title?: string }>;
  images?: Array<{ id: number; url: string; path?: string }>;
  videos?: Array<{ id: number; url: string; note?: string }>;
  mediaNotes?: Array<{ id: number; text: string }>;
}

interface EntityViewModeProps {
  // Header - contenuto variabile passato come slot
  headerContent: React.ReactNode;
  onCollapse: () => void;

  // Booking
  bookingStatus: 'na' | 'no' | 'yes';
  onBookingChange: (val: 'na' | 'no' | 'yes') => void;

  // Reminder
  reminderEnabled?: boolean;
  onReminderClick?: () => void;

  // Edit
  onEdit: () => void;

  // Cost badge - badge costi con icona Lucide (posizionato nella riga azioni)
  costBadge?: React.ReactNode;

  // Info row - contenuto variabile (location, orari, ecc.)
  infoContent?: React.ReactNode;

  // Media
  mediaData: MediaData;
  onMediaNotesUpdate?: (updatedNotes: Array<{ id: number; text: string }>) => void;

  // Layout
  isDesktop: boolean;
  backgroundColor?: string;
}

const EntityViewMode: React.FC<EntityViewModeProps> = ({
  headerContent,
  onCollapse,
  bookingStatus,
  onBookingChange,
  reminderEnabled = false,
  onReminderClick,
  onEdit,
  costBadge,
  infoContent,
  mediaData,
  onMediaNotesUpdate,
  isDesktop,
  backgroundColor = colors.bgCard
}) => {
  // State per visualizzatori media
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<{ id: number; text: string } | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [isNoteEditing, setIsNoteEditing] = useState(false);

  // Media presenti
  const hasMedia = (mediaData.links?.length || 0) +
    (mediaData.images?.length || 0) +
    (mediaData.videos?.length || 0) +
    (mediaData.mediaNotes?.length || 0) > 0;

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
    if (viewingNote && noteInput.trim() && onMediaNotesUpdate) {
      onMediaNotesUpdate(
        (mediaData.mediaNotes || []).map(n =>
          n.id === viewingNote.id ? { ...n, text: noteInput.trim() } : n
        )
      );
    }
    handleCloseNote();
  };

  return (
    <div
      className="rounded-2xl"
      style={{ backgroundColor }}
    >
      {/* Header - slot con onClick per collapse */}
      <div
        className="cursor-pointer"
        onClick={onCollapse}
      >
        {headerContent}
      </div>

      {/* Contenuto */}
      <div className="px-3 pb-3 pt-0 space-y-3 border-t" style={{ borderColor: colors.border }}>
        {/* Riga azioni: BookingToggle + Campanella a sx | Costi a dx */}
        <div className="flex items-center justify-between pt-3">
          {/* Booking Toggle + Campanella a sinistra */}
          <div className="flex items-center gap-2">
            <BookingToggle
              value={bookingStatus}
              onChange={onBookingChange}
            />

            {/* Notifica - altezza allineata al booking toggle (40px) */}
            {onReminderClick && (
              <button
                onClick={onReminderClick}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  reminderEnabled
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                }`}
                title="Imposta promemoria"
              >
                <Bell size={18} />
              </button>
            )}
          </div>

          {/* Costi a destra */}
          {costBadge}
        </div>

        {/* Info row - slot per contenuto variabile */}
        {infoContent}

        {/* Media grid */}
        {hasMedia && (
          <MediaGrid
            links={mediaData.links || []}
            images={mediaData.images || []}
            videos={mediaData.videos || []}
            mediaNotes={mediaData.mediaNotes || []}
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
    </div>
  );
};

export default EntityViewMode;
