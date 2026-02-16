import React from 'react';
import { Link, FileText, X, Plus, ExternalLink, FileDown } from 'lucide-react';
import { BrandIcon, isBrandIcon } from '../../ui/BrandIcons';
import { colors } from '../../../styles/theme';
import { getDomain, getLinkPlatformInfo, getYouTubeThumbnail } from '../../../utils/linkUtils';

// ============================================
// ALTROVE - MediaGrid
// Griglia compatta per media cards
// ============================================

interface MemberInfo {
  uid: string;
  displayName: string;
  avatar?: string;
}

interface MediaGridProps {
  links: Array<{ id: number; url: string; title?: string }>;
  images: Array<{ id: number; url: string; path?: string; uploaderId?: string }>;
  videos: Array<{ id: number; url: string; note?: string }>;
  mediaNotes: Array<{ id: number; text: string }>;
  documents?: Array<{ id: number; url: string; path?: string; name: string; uploaderId?: string }>;
  isEditMode: boolean;
  members?: MemberInfo[];
  onRemoveMedia?: (type: 'links' | 'images' | 'videos' | 'mediaNotes' | 'documents', id: number) => void;
  onAddMedia?: () => void;
  onImageClick?: (imageUrl: string) => void;
  onNoteClick?: (note: { id: number; text: string }) => void;
}

// Link Card — struttura unificata per link e video
const LinkCard: React.FC<{
  url: string;
  label?: string;
  isEditMode: boolean;
  onRemove?: () => void;
}> = ({ url, label, isEditMode, onRemove }) => {
  const platform = getLinkPlatformInfo(url);
  const thumbnail = getYouTubeThumbnail(url);
  const hasBrand = isBrandIcon(platform.icon);

  return (
    <div className="relative group">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-square rounded-lg overflow-hidden relative hover:opacity-90 transition-opacity"
        style={{ backgroundColor: `${platform.color}15` }}
      >
        {thumbnail ? (
          <>
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Banner absolute sopra la thumbnail */}
            {label && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-1.5 py-1 pointer-events-none">
                <p className="text-[9px] font-medium text-white line-clamp-2 leading-tight">
                  {label}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col">
            {/* Contenuto centrato — flex-1 si adatta allo spazio residuo */}
            <div className="flex-1 flex flex-col items-center justify-center px-1.5 pt-7 pb-2">
              {hasBrand ? (
                <BrandIcon name={platform.icon} size={32} />
              ) : (
                <Link size={32} color={platform.color} />
              )}
              <p
                className="text-[9px] font-medium text-center truncate w-full mt-1.5"
                style={{ color: platform.color }}
              >
                {getDomain(url)}
              </p>
            </div>
            {/* Banner in flow — altezza naturale, mai sovrapposto al dominio */}
            {label && (
              <div className="bg-black/55 px-1.5 py-1">
                <p className="text-[9px] font-medium text-white line-clamp-2 leading-tight">
                  {label}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Badge brand in alto a sinistra */}
        {hasBrand && (
          <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm pointer-events-none">
            <BrandIcon name={platform.icon} size={14} />
          </div>
        )}
      </a>

      {isEditMode && onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

// Card singola immagine
const ImageCard: React.FC<{
  image: { id: number; url: string; path?: string; uploaderId?: string };
  isEditMode: boolean;
  uploader?: MemberInfo;
  onRemove?: () => void;
  onClick?: () => void;
}> = ({ image, isEditMode, uploader, onRemove, onClick }) => {
  return (
    <div className="relative group">
      <div
        className="aspect-square rounded-lg overflow-hidden cursor-pointer"
        style={{ backgroundColor: colors.bgSubtle }}
        onClick={onClick}
      >
        <img
          src={image.url}
          alt=""
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      </div>

      {/* Avatar uploader - in alto a sinistra */}
      {uploader && (
        <div
          className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full border-2 border-white shadow-sm overflow-hidden"
          title={uploader.displayName}
        >
          {uploader.avatar ? (
            <img
              src={uploader.avatar}
              alt={uploader.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[10px] font-medium text-white"
              style={{ backgroundColor: colors.accent }}
            >
              {uploader.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Remove button - sempre visibile in edit mode */}
      {isEditMode && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

// Card singola nota
const NoteCard: React.FC<{
  note: { id: number; text: string };
  isEditMode: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}> = ({ note, isEditMode, onRemove, onClick }) => {
  return (
    <div className="relative group">
      <div
        className="aspect-square rounded-lg p-2 cursor-pointer transition-colors overflow-hidden"
        style={{ backgroundColor: colors.warningSoft }}
        onClick={onClick}
      >
        {/* Testo che occupa tutto lo spazio con ellipsis */}
        <p
          className="text-[11px] leading-tight w-full overflow-hidden text-ellipsis"
          style={{
            color: colors.text,
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {note.text}
        </p>

        {/* Icona piccola in basso a destra */}
        <FileText
          size={12}
          color={colors.warning}
          className="absolute bottom-1.5 right-1.5 opacity-60"
        />
      </div>

      {/* Remove button - sempre visibile in edit mode */}
      {isEditMode && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

// Card singola documento (PDF)
const DocumentCard: React.FC<{
  document: { id: number; url: string; path?: string; name: string; uploaderId?: string };
  isEditMode: boolean;
  uploader?: MemberInfo;
  onRemove?: () => void;
}> = ({ document, isEditMode, uploader, onRemove }) => {
  // Estrai nome file senza estensione per display
  const displayName = document.name.replace(/\.pdf$/i, '');

  return (
    <div className="relative group">
      <a
        href={document.url}
        target="_blank"
        rel="noopener noreferrer"
        className="aspect-square rounded-lg overflow-hidden flex flex-col items-center justify-center p-2 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#FEE2E2' }} // Rosso chiaro per PDF
      >
        <FileDown size={28} color="#DC2626" className="mb-1" />
        <p
          className="text-[10px] font-medium text-center line-clamp-2 w-full px-1"
          style={{ color: colors.text }}
        >
          {displayName}
        </p>
        <p
          className="text-[9px] text-center w-full mt-0.5"
          style={{ color: '#DC2626' }}
        >
          PDF
        </p>
        <ExternalLink size={10} color={colors.textMuted} className="absolute bottom-1.5 right-1.5" />
      </a>

      {/* Avatar uploader - in alto a sinistra */}
      {uploader && (
        <div
          className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full border-2 border-white shadow-sm overflow-hidden"
          title={uploader.displayName}
        >
          {uploader.avatar ? (
            <img
              src={uploader.avatar}
              alt={uploader.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[10px] font-medium text-white"
              style={{ backgroundColor: colors.accent }}
            >
              {uploader.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Remove button - sempre visibile in edit mode */}
      {isEditMode && onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

// Componente principale
const MediaGrid: React.FC<MediaGridProps> = ({
  links,
  images,
  videos,
  mediaNotes,
  documents = [],
  isEditMode,
  members = [],
  onRemoveMedia,
  onAddMedia,
  onImageClick,
  onNoteClick
}) => {
  // Helper per trovare l'uploader di un file
  const getUploader = (uploaderId?: string): MemberInfo | undefined => {
    if (!uploaderId || members.length === 0) return undefined;
    return members.find(m => m.uid === uploaderId);
  };
  const totalMedia = links.length + images.length + videos.length + mediaNotes.length + documents.length;
  const hasAnyMedia = totalMedia > 0;

  if (!hasAnyMedia && !isEditMode) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Grid media */}
      {hasAnyMedia && (
        <div className="grid grid-cols-3 gap-2">
          {/* Links */}
          {links.map(link => (
            <LinkCard
              key={`link-${link.id}`}
              url={link.url}
              label={link.title}
              isEditMode={isEditMode}
              onRemove={() => onRemoveMedia?.('links', link.id)}
            />
          ))}

          {/* Images */}
          {images.map(image => (
            <ImageCard
              key={`image-${image.id}`}
              image={image}
              isEditMode={isEditMode}
              uploader={getUploader(image.uploaderId)}
              onRemove={() => onRemoveMedia?.('images', image.id)}
              onClick={() => onImageClick?.(image.url)}
            />
          ))}

          {/* Videos */}
          {videos.map(video => (
            <LinkCard
              key={`video-${video.id}`}
              url={video.url}
              label={video.note}
              isEditMode={isEditMode}
              onRemove={() => onRemoveMedia?.('videos', video.id)}
            />
          ))}

          {/* Notes */}
          {mediaNotes.map(note => (
            <NoteCard
              key={`note-${note.id}`}
              note={note}
              isEditMode={isEditMode}
              onRemove={() => onRemoveMedia?.('mediaNotes', note.id)}
              onClick={() => onNoteClick?.(note)}
            />
          ))}

          {/* Documents (PDF) */}
          {documents.map(doc => (
            <DocumentCard
              key={`doc-${doc.id}`}
              document={doc}
              isEditMode={isEditMode}
              uploader={getUploader(doc.uploaderId)}
              onRemove={() => onRemoveMedia?.('documents', doc.id)}
            />
          ))}

          {/* Add button in grid (solo se < 3 media e in edit mode) */}
          {isEditMode && totalMedia > 0 && totalMedia < 6 && onAddMedia && (
            <button
              onClick={onAddMedia}
              className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center transition-colors hover:bg-gray-50"
              style={{
                borderColor: colors.border,
                color: colors.textMuted
              }}
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      )}

      {/* Placeholder se vuoto e in edit mode */}
      {!hasAnyMedia && isEditMode && onAddMedia && (
        <button
          onClick={onAddMedia}
          className="w-full py-4 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors hover:bg-gray-50"
          style={{
            borderColor: colors.border,
            color: colors.textMuted
          }}
        >
          <Plus size={16} />
          <span className="text-sm">Aggiungi media</span>
        </button>
      )}
    </div>
  );
};

export default MediaGrid;