import React from 'react';
import { X } from 'lucide-react';

// ============= ICONE =============
export const LinkIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const ImageIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export const FileTextIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

export const VideoIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

// ============= COMPONENTI MEDIA =============

export const LinkCard = ({ link, onRemove }) => (
  <div className="relative flex flex-col bg-gray-50 rounded-lg p-3 w-full aspect-square overflow-hidden">
    <div className="flex items-start gap-2 flex-1 overflow-hidden">
      <LinkIcon size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <a 
          href={link.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline block"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word'
          }}
        >
          {link.title || link.url}
        </a>
      </div>
    </div>
    <button onClick={onRemove} className="absolute top-1 right-1 p-1 hover:bg-gray-200 rounded">
      <X size={12} />
    </button>
  </div>
);

export const ImageCard = ({ image, onRemove, onClick }) => (
  <div 
    className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
    onClick={onClick}
  >
    <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white z-10"
    >
      <X size={12} />
    </button>
  </div>
);

export const NoteCard = ({ note, onRemove, onClick }) => (
  <div 
    onClick={onClick}
    className="flex flex-col bg-amber-50 rounded-lg p-3 w-full border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors relative aspect-square"
  >
    <div className="flex-1 overflow-hidden">
      <p className="text-[10px] leading-tight text-gray-700 line-clamp-6">{note.text}</p>
    </div>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }} 
      className="absolute top-1 right-1 p-1 hover:bg-amber-200 rounded z-10"
    >
      <X size={12} />
    </button>
  </div>
);

// RINOMINATO DA VideoEmbed A VideoCard
export const VideoCard = ({ video, onRemove }) => {
  const platforms = {
    instagram: {
      bg: 'bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400',
      icon: '📷',
      name: 'Instagram'
    },
    tiktok: {
      bg: 'bg-black',
      icon: '🎵',
      name: 'TikTok'
    },
    youtube: {
      bg: 'bg-red-600',
      icon: '▶️',
      name: 'YouTube'
    }
  };

  const platform = platforms[video.platform];
  
  return (
    <div className={`relative w-full aspect-square rounded-lg overflow-hidden ${platform.bg}`}>
      <div className="w-full h-full flex items-center justify-center">
        <a 
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-center p-4"
        >
          <div className="text-2xl mb-1">{platform.icon}</div>
          <div className="text-xs font-semibold">{platform.name}</div>
          <div className="text-xs opacity-75 mt-1">Tap per aprire</div>
        </a>
      </div>
      <button 
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white z-10"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ============= BOTTONI MEDIA =============

export const MediaButton = ({ icon: Icon, label, color, onClick, isLabel = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    green: 'bg-green-50 hover:bg-green-100 text-green-700',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700'
  };

  const baseClass = `flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors w-10 h-10 md:w-auto md:h-auto md:px-3 md:py-2.5 ${colorClasses[color]}`;

  if (isLabel) {
    return (
      <label className={`${baseClass} cursor-pointer`}>
        <Icon size={16} />
        <span className="hidden md:inline">{label}</span>
        {onClick}
      </label>
    );
  }

  return (
    <button onClick={onClick} className={baseClass}>
      <Icon size={16} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
};

// ============= IMAGE VIEWER (LIGHTBOX) =============

export const ImageViewer = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-colors"
      >
        <X size={24} />
      </button>
      
      <img 
        src={image.url} 
        alt={image.name}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      
      {image.name && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
          {image.name}
        </div>
      )}
    </div>
  );
};