import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";


// ============= ICONE CUSTOM =============
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

export const ExternalLinkIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ============= VIDEO FUNCTIONS =============
export const extractVideoId = (url) => {
  const patterns = [
    { regex: /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/, platform: 'instagram', idIndex: 2 },
    { regex: /tiktok\.com\/.*\/video\/(\d+)/, platform: 'tiktok', idIndex: 1 },
    { regex: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/, platform: 'youtube', idIndex: 1 }
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) return { platform: pattern.platform, id: match[pattern.idIndex] };
  }
  
  return null;
};

// ============= COMPONENTE MODAL PER IMMAGINI INGRANDITE =============
export const ImageModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
          doubleClick={{ disabled: false, step: 0.7 }}
          wheel={{ step: 0.1 }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img 
              src={image.url} 
              alt={image.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
              style={{ userSelect: 'none' }}
            />
          </TransformComponent>
        </TransformWrapper>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white backdrop-blur-sm transition-all z-10"
          aria-label="Chiudi"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

// ============= COMPONENTI MEDIA CARDS =============

export const LinkCard = ({ link, onRemove }) => {
  const getDomain = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'Link';
    }
  };

  return (
    <a 
      href={link.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="relative flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 w-full aspect-square overflow-hidden border border-blue-100 hover:shadow-md transition-all group cursor-pointer"
    >
      {/* Header compatto con solo dominio */}
      <div className="mb-1.5">
        <div className="text-[9px] text-blue-500 font-medium truncate opacity-75">
          {getDomain(link.url)}
        </div>
      </div>

      {/* Titolo usa quasi tutto lo spazio */}
      <div className="flex-1 overflow-hidden pb-4">
        <div 
          className="text-xs text-gray-800 font-medium group-hover:text-blue-600 group-hover:underline"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 7,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            lineHeight: '1.2'
          }}
        >
          {link.title || link.url}
        </div>
      </div>

      {/* Iconcina piccola in basso a destra */}
      <div className="absolute bottom-2 right-2">
        <LinkIcon size={12} className="text-blue-400 opacity-60" />
      </div>

      {/* Pulsante rimozione - X senza sfondo, sempre visibile mobile, hover desktop */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 text-blue-700 hover:text-blue-900 transition-colors md:opacity-0 md:group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </a>
  );
};

export const ImageCard = ({ image, onRemove }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div 
        className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity group"
        onClick={() => setShowModal(true)}
      >
        <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
        
        {/* Pulsante rimozione - X senza sfondo, sempre visibile mobile, hover desktop */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 text-white hover:text-gray-200 transition-colors md:opacity-0 md:group-hover:opacity-100"
          style={{ 
            textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' // Shadow forte per visibilità
          }}
        >
          <X size={14} />
        </button>
      </div>
      
      {showModal && (
        <ImageModal 
          image={image} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};

export const NoteCard = ({ note, onRemove, onClick }) => (
  <div 
    onClick={onClick}
    className="relative flex flex-col bg-amber-50 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition-colors w-full aspect-square overflow-hidden group"
  >
    {/* Contenuto nota */}
    <div className="flex-1 overflow-hidden pb-4">
      <p 
        className="text-xs text-gray-700 whitespace-pre-wrap"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 6,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
          lineHeight: '1.2'
        }}
      >
        {note.text}
      </p>
    </div>

    {/* Iconcina piccola in basso a destra */}
    <div className="absolute bottom-2 right-2">
      <FileTextIcon size={12} className="text-amber-400 opacity-60" />
    </div>

    {/* Pulsante rimozione - X senza sfondo, sempre visibile mobile, hover desktop */}
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="absolute top-1 right-1 text-amber-700 hover:text-amber-900 transition-colors md:opacity-0 md:group-hover:opacity-100"
    >
      <X size={14} />
    </button>
  </div>
);

export const VideoEmbed = ({ video, onRemove }) => {
  const platforms = {
    instagram: {
      bg: 'bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400',
      icon: '📷',
      name: 'Instagram',
      textColor: 'text-white',
      iconColor: 'rgba(255, 255, 255, 0.6)' // 🆕 Colore icona link
    },
    tiktok: {
      bg: 'bg-black',
      icon: '🎵',
      name: 'TikTok',
      textColor: 'text-white',
      iconColor: 'rgba(255, 255, 255, 0.6)' // 🆕 Colore icona link
    },
    youtube: {
      bg: 'bg-red-600',
      icon: '▶️',
      name: 'YouTube',
      textColor: 'text-white',
      iconColor: 'rgba(255, 255, 255, 0.6)' // 🆕 Colore icona link
    }
  };

  const platform = platforms[video.platform];
  const hasNote = video.note && video.note.trim() !== '';
  
  return (
    <div className={`relative w-full aspect-square rounded-lg overflow-hidden ${platform.bg} hover:shadow-md transition-all group cursor-pointer`}>
      {/* Sezione video - 50% se c'è nota, altrimenti 100% */}
      <div className={`w-full ${hasNote ? 'h-1/2' : 'h-full'} flex items-center justify-center`}>
        <a 
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${platform.textColor} text-center w-full h-full flex items-center justify-center`}
        >
          {/* Emoji più piccola + nome su stessa riga compatta */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{platform.icon}</span>
            <span className="text-xs font-semibold leading-tight">{platform.name}</span>
          </div>
        </a>
      </div>

      {/* Sezione nota - 50% in basso se presente, max 3 righe con ... */}
      {hasNote && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white bg-opacity-95 px-2 py-1 flex items-start overflow-hidden">
          <p 
            className="text-xs text-gray-800 w-full"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              lineHeight: '1.2',
              textOverflow: 'ellipsis'
            }}
          >
            {video.note}
          </p>
        </div>
      )}

      {/* 🆕 Iconcina external link in basso a destra (come LinkCard e NoteCard) */}
      <div className="absolute bottom-2 right-2" style={{ opacity: 0.6 }}>
        <ExternalLinkIcon size={12} style={{ stroke: platform.iconColor }} />
      </div>

      {/* Pulsante rimozione - X senza sfondo, sempre visibile mobile, hover desktop */}
      <button 
        onClick={onRemove}
        className={`absolute top-1 right-1 ${platform.textColor} hover:opacity-80 transition-opacity md:opacity-0 md:group-hover:opacity-100`}
      >
        <X size={14} />
      </button>
    </div>
  );
};