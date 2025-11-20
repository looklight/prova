import React from 'react';
import { X, FileText, Image } from 'lucide-react';

interface ExportModalProps {
  trip: any;
  onClose: () => void;
  onExportBase: () => void;
  onExportWithMedia: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({
  trip,
  onClose,
  onExportBase,
  onExportWithMedia
}) => {
  if (!trip) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">Esporta Viaggio</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4 text-center">
            {trip.name}
          </p>

          {/* Due bottoni affiancati */}
          <div className="grid grid-cols-2 gap-3">
            {/* Bottone Base (senza media) */}
            <button
              onClick={() => {
                onExportBase();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                <FileText size={24} className="text-gray-600 group-hover:text-blue-600" />
              </div>
              <span className="font-medium text-sm">Senza Media</span>
              <span className="text-xs text-gray-500 mt-1">~10KB</span>
            </button>

            {/* Bottone Con Media */}
            <button
              onClick={() => {
                onExportWithMedia();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-100 transition-colors">
                <Image size={24} className="text-gray-600 group-hover:text-purple-600" />
              </div>
              <span className="font-medium text-sm">Con Media</span>
              <span className="text-xs text-gray-500 mt-1">Link inclusi</span>
            </button>
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-400 text-center mt-4">
            Entrambi escludono costi e partecipanti, è possibile scaricare il report dei costi dal Riepilogo Spese
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;