import React from 'react';
import { Link, Image, Video, FileText, X, Plus, ExternalLink } from 'lucide-react';
import { colors } from '../../../styles/theme';

// ============================================
// ALTROVE - MediaGrid
// Griglia compatta per media cards
// Da espandere/riprogettare in futuro
// ============================================

interface MediaGridProps {
  links: Array<{ id: number; url: string; title?: string }>;
  images: Array<{ id: number; url: string; path?: string }>;
  videos: Array<{ id: number; url: string; note?: string }>;
  mediaNotes: Array<{ id: number; text: string }>;
  isEditMode: boolean;
  onRemoveMedia?: (type: 'links' | 'images' | 'videos' | 'mediaNotes', id: number) => void;
  onAddMedia?: () => void;
  onImageClick?: (imageUrl: string) => void;
  onNoteClick?: (note: { id: number; text: string }) => void;
}

// Card singola link
const LinkCard: React.FC<{
  link: { id: number; url: string; title?: string };
  isEditMode: boolean;
  onRemove?: () => void;
}> = ({ link, isEditMode, onRemove }) => {
  // Estrai dominio per display
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="relative group">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="aspect-square rounded-lg overflow-hidden flex flex-col items-center justify-center p-2 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: colors.accentSoft }}
      >
        <Link size={24} color={colors.accent} className="mb-2" />
        <p
          className="text-[11px] font-medium text-center line-clamp-2 w-full px-1"
          style={{ color: colors.text }}
        >
          {link.title || getDomain(link.url)}
        </p>
        <p
          className="text-[9px] text-center truncate w-full px-1 mt-0.5"
          style={{ color: colors.textMuted }}
        >
          {getDomain(link.url)}
        </p>
        <ExternalLink size={10} color={colors.textMuted} className="absolute bottom-1.5 right-1.5" />
      </a>

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

// Card singola immagine
const ImageCard: React.FC<{
  image: { id: number; url: string; path?: string };
  isEditMode: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}> = ({ image, isEditMode, onRemove, onClick }) => {
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

// Card singola video
const VideoCard: React.FC<{
  video: { id: number; url: string; note?: string };
  isEditMode: boolean;
  onRemove?: () => void;
}> = ({ video, isEditMode, onRemove }) => {
  // Estrai thumbnail YouTube se possibile
  const getYouTubeThumbnail = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return null;
  };

  // Detecta piattaforma per icona/colore
  const getPlatformInfo = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return { name: 'YouTube', color: '#FF0000' };
    }
    if (url.includes('instagram.com')) {
      return { name: 'Instagram', color: '#E4405F' };
    }
    if (url.includes('tiktok.com')) {
      return { name: 'TikTok', color: '#000000' };
    }
    return { name: 'Video', color: colors.textMuted };
  };

  const thumbnail = getYouTubeThumbnail(video.url);
  const platform = getPlatformInfo(video.url);

  return (
    <div className="relative group">
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-square rounded-lg overflow-hidden"
        style={{ backgroundColor: colors.bgSubtle }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ backgroundColor: `${platform.color}15` }}
          >
            <Video size={28} color={platform.color} />
            <span
              className="text-[10px] font-medium mt-1"
              style={{ color: platform.color }}
            >
              {platform.name}
            </span>
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
            <div
              className="w-0 h-0 ml-0.5"
              style={{
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: `8px solid ${platform.color}`
              }}
            />
          </div>
        </div>

        {/* Nota del video se presente */}
        {video.note && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1 pointer-events-none">
            <p className="text-[9px] text-white truncate">
              {video.note}
            </p>
          </div>
        )}
      </a>

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

// Componente principale
const MediaGrid: React.FC<MediaGridProps> = ({
  links,
  images,
  videos,
  mediaNotes,
  isEditMode,
  onRemoveMedia,
  onAddMedia,
  onImageClick,
  onNoteClick
}) => {
  const totalMedia = links.length + images.length + videos.length + mediaNotes.length;
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
              link={link}
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
              onRemove={() => onRemoveMedia?.('images', image.id)}
              onClick={() => onImageClick?.(image.url)}
            />
          ))}

          {/* Videos */}
          {videos.map(video => (
            <VideoCard
              key={`video-${video.id}`}
              video={video}
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