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

// ============= VIDEO FUNCTIONS =============
export const extractVideoId = (url) => {
  const patterns = [
    { regex: /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/, platform: 'instagram', idIndex: 2 },
    { regex: /tiktok\.com\/.*\/video\/(\d+)/, platform: 'tiktok', idIndex: 1 },
    { regex: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/, platform: 'youtube', idIndex: 1 }
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) return { platform: pattern.platform, id: match[pattern.idIndex] };
  }
  
  return null;
};

// ============= COMPONENTE MODAL PER IMMAGINI INGRANDITE =============
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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
      <div className="flex items-start gap-2 flex-1 overflow-hidden">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <LinkIcon size={16} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="text-[10px] text-blue-600 font-medium mb-1 opacity-75">
            {getDomain(link.url)}
          </div>
          <div 
            className="text-xs text-gray-800 font-medium group-hover:text-blue-600 group-hover:underline"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
          >
            {link.title || link.url}
          </div>
        </div>
      </div>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 p-1 hover:bg-blue-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={12} className="text-blue-700" />
      </button>
    </a>
  );
};

export const ImageCard = ({ image, onRemove }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div 
        className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setShowModal(true)}
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
    className="relative flex flex-col bg-amber-50 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition-colors w-full aspect-square overflow-hidden"
  >
    <div className="flex items-start gap-2 flex-1 overflow-hidden">
      <FileTextIcon size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <p 
          className="text-xs text-gray-700 whitespace-pre-wrap"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word'
          }}
        >
          {note.text}
        </p>
      </div>
    </div>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="absolute top-1 right-1 p-1 hover:bg-amber-200 rounded"
    >
      <X size={12} />
    </button>
  </div>
);

export const VideoEmbed = ({ video, onRemove }) => {
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
          className="text-white text-center p-4 w-full h-full flex flex-col items-center justify-center"
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