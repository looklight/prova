import React, { useEffect, useState } from 'react';
import { HelpCircle, FileText, LinkIcon, Video } from 'lucide-react';

interface MediaDialogProps {
  isOpen: boolean;
  type: 'link' | 'video' | 'note' | null;
  isDesktop: boolean;
  linkInput: string;
  linkTitle: string;
  videoInput: string;
  videoNote: string;
  noteInput: string;
  editingNote: any;
  isNoteEditing: boolean;
  onClose: () => void;
  onLinkInputChange: (value: string) => void;
  onLinkTitleChange: (value: string) => void;
  onVideoInputChange: (value: string) => void;
  onVideoNoteChange: (value: string) => void;
  onNoteInputChange: (value: string) => void;
  onSubmit: () => void;
  onStartNoteEditing: () => void;
}

const MediaDialog: React.FC<MediaDialogProps> = ({
  isOpen,
  type,
  isDesktop,
  linkInput,
  linkTitle,
  videoInput,
  videoNote,
  noteInput,
  editingNote,
  isNoteEditing,
  onClose,
  onLinkInputChange,
  onLinkTitleChange,
  onVideoInputChange,
  onVideoNoteChange,
  onNoteInputChange,
  onSubmit,
  onStartNoteEditing
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const [showHelp, setShowHelp] = useState<Record<string, boolean>>({});
  const toggleHelp = (section: string) => {
    setShowHelp(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 🎬 Animazione entrata
  useEffect(() => {
    if (isOpen) {
      // Piccolo delay per triggerare l'animazione CSS
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // 🔒 Blocca scroll quando il modal è aperto
  useEffect(() => {
    if (isOpen) {
      // Salva posizione scroll corrente
      const scrollY = window.scrollY;

      // Blocca scroll del body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Cleanup: ripristina scroll quando si chiude
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        // Ripristina posizione scroll
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !type) return null;

  return (
    <div
      className={`fixed inset-0 flex items-end z-50 transition-colors duration-300 ${isAnimating ? 'bg-black bg-opacity-50' : 'bg-transparent'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-t-3xl w-full p-6 ${isDesktop ? 'max-w-md' : 'max-w-[430px]'} mx-auto transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'link' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon size={20} className="text-blue-500" />
              <h3 className="text-lg font-bold flex items-center gap-1">
                Aggiungi Link
                <button
                  onClick={() => toggleHelp('link')}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <HelpCircle size={16} />
                </button>
              </h3>
            </div>
            {showHelp['link'] && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-gray-600">
                💡 Inserisci il link completo e, se vuoi, un titolo descrittivo. Per aprire il link basterà toccare la card.
              </div>
            )}
            <input
              type="url"
              value={linkInput}
              onChange={(e) => onLinkInputChange(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 border rounded-lg mb-3"
              autoFocus
            />
            <textarea
              value={linkTitle}
              onChange={(e) => onLinkTitleChange(e.target.value)}
              placeholder="Titolo (opzionale)"
              className="w-full px-4 py-3 border rounded-lg mb-4 h-24 resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-medium"
              >
                Annulla
              </button>
              <button
                onClick={onSubmit}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium"
              >
                Aggiungi
              </button>
            </div>
          </>
        )}

        {type === 'video' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Video size={20} className="text-purple-500" />
              <h3 className="text-lg font-bold flex items-center gap-1">
                Aggiungi Video
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">Incolla il link del post da Instagram, TikTok o YouTube</p>
            <input
              type="url"
              value={videoInput}
              onChange={(e) => onVideoInputChange(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full px-4 py-3 border rounded-lg mb-3"
              autoFocus
            />
            <textarea
              value={videoNote}
              onChange={(e) => onVideoNoteChange(e.target.value)}
              placeholder="Nota (opzionale)"
              className="w-full px-4 py-3 border rounded-lg mb-4 h-24 resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-medium"
              >
                Annulla
              </button>
              <button
                onClick={onSubmit}
                className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg font-medium"
              >
                Aggiungi
              </button>
            </div>
          </>
        )}

        {type === 'note' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              {/* Icona nota a sinistra */}
              <FileText size={20} className="text-amber-500" />

              {/* Titolo */}
              <h3 className="text-lg font-bold flex items-center gap-1">
                Aggiungi Nota
                {/* Bottone help accanto al titolo */}
                <button
                  onClick={() => toggleHelp('note')}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <HelpCircle size={16} />
                </button>
              </h3>
            </div>
            {showHelp['note'] && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-gray-600">
                💡 Usa questo spazio per annotare informazioni importanti o appunti rapidi.
              </div>
            )}
            {editingNote && !isNoteEditing ? (
              <>
                <div className="w-full px-4 py-3 border rounded-lg mb-4 h-64 overflow-y-auto bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
                  {noteInput}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-medium"
                  >
                    Chiudi
                  </button>
                  <button
                    onClick={onStartNoteEditing}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg font-medium"
                  >
                    Modifica
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={noteInput}
                  onChange={(e) => onNoteInputChange(e.target.value)}
                  placeholder="Scrivi una nota..."
                  className="w-full px-4 py-3 border rounded-lg mb-4 h-64 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={onSubmit}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg font-medium"
                  >
                    {editingNote ? 'Salva' : 'Aggiungi'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MediaDialog;