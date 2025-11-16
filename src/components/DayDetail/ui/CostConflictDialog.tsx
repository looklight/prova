import React from 'react';
import { AlertTriangle, Trash2, Settings, X } from 'lucide-react';

interface CostConflictDialogProps {
  isOpen: boolean;
  onReset: () => void;
  onManage: () => void;
  onCancel: () => void;
}

const CostConflictDialog: React.FC<CostConflictDialogProps> = ({
  isOpen,
  onReset,
  onManage,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-amber-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Spesa già suddivisa</h3>
            <p className="text-sm text-gray-500 mt-0.5">Come vuoi procedere?</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Questa spesa ha già una ripartizione tra i membri del viaggio. 
            Scegli un'azione:
          </p>

          {/* Opzioni */}
          <div className="space-y-3">
            {/* Gestisci ripartizione */}
            <button
              onClick={onManage}
              className="w-full p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900 group-hover:text-blue-700">
                    Gestisci ripartizione
                  </div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    Modifica il breakdown esistente
                  </div>
                </div>
              </div>
            </button>

            {/* Reset */}
            <button
              onClick={onReset}
              className="w-full p-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-red-900 group-hover:text-red-700">
                    Elimina e ricomincia
                  </div>
                  <div className="text-xs text-red-600 mt-0.5">
                    Cancella tutto e inserisci nuovo costo
                  </div>
                </div>
              </div>
            </button>

            {/* Annulla */}
            <button
              onClick={onCancel}
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <X className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 group-hover:text-gray-700">
                    Annulla
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Lascia tutto com'è
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostConflictDialog;