import React from 'react';

interface MediaDialogProps {
  isOpen: boolean;
  type: 'link' | 'video' | 'note' | null;
  isDesktop: boolean;
  linkInput: string;
  linkTitle: string;
  videoInput: string;
  noteInput: string;
  editingNote: any;
  onClose: () => void;
  onLinkInputChange: (value: string) => void;
  onLinkTitleChange: (value: string) => void;
  onVideoInputChange: (value: string) => void;
  onNoteInputChange: (value: string) => void;
  onSubmit: () => void;
}

const MediaDialog: React.FC<MediaDialogProps> = ({
  isOpen,
  type,
  isDesktop,
  linkInput,
  linkTitle,
  videoInput,
  noteInput,
  editingNote,
  onClose,
  onLinkInputChange,
  onLinkTitleChange,
  onVideoInputChange,
  onNoteInputChange,
  onSubmit
}) => {
  if (!isOpen || !type) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50" 
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-t-3xl w-full p-6 ${isDesktop ? 'max-w-md' : 'max-w-[430px]'} mx-auto`} 
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'link' && (
          <>
            <h3 className="text-lg font-bold mb-4">Aggiungi Link</h3>
            <input
              type="url"
              value={linkInput}
              onChange={(e) => onLinkInputChange(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 border rounded-lg mb-3"
              autoFocus
            />
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => onLinkTitleChange(e.target.value)}
              placeholder="Titolo (opzionale)"
              className="w-full px-4 py-3 border rounded-lg mb-4"
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
            <h3 className="text-lg font-bold mb-2">Aggiungi Video</h3>
            <p className="text-xs text-gray-500 mb-4">Incolla il link da Instagram, TikTok o YouTube</p>
            <input
              type="url"
              value={videoInput}
              onChange={(e) => onVideoInputChange(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full px-4 py-3 border rounded-lg mb-4"
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
                className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg font-medium"
              >
                Aggiungi
              </button>
            </div>
          </>
        )}
        
        {type === 'note' && (
          <>
            <h3 className="text-lg font-bold mb-4">{editingNote ? 'Modifica Nota' : 'Aggiungi Nota'}</h3>
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
      </div>
    </div>
  );
};

export default MediaDialog;