import React from 'react';
import { createPortal } from 'react-dom';
import { X, Move, Copy, ArrowLeftRight } from 'lucide-react';
import { CellAction, cellHasContent } from '../../../utils/cellDataUtils';

interface CellActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: CellAction) => void;
  /** Label categoria origine */
  fromCategoryLabel: string;
  /** Label categoria destinazione */
  toCategoryLabel: string;
  /** Se la destinazione ha già contenuto */
  targetHasContent: boolean;
  /** Se le categorie sono diverse */
  isCategoryChange: boolean;
  /** Se è un'operazione su giorno intero */
  isFullDay?: boolean;
}

/**
 * Modal che appare dopo il drop per scegliere l'azione da eseguire.
 * Mostra: Sposta, Copia, Scambia (se target ha contenuto), Annulla
 */
const CellActionModal: React.FC<CellActionModalProps> = ({
  isOpen,
  onClose,
  onAction,
  fromCategoryLabel,
  toCategoryLabel,
  targetHasContent,
  isCategoryChange,
  isFullDay = false
}) => {
  if (!isOpen) return null;

  const handleAction = (action: CellAction) => {
    onAction(action);
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Cosa vuoi fare?</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Warning cambio categoria */}
        {isCategoryChange && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <p className="text-xs text-amber-700">
              ⚠️ Categoria diversa: da <strong>{fromCategoryLabel}</strong> a <strong>{toCategoryLabel}</strong>
            </p>
          </div>
        )}

        {/* Warning sovrascrittura */}
        {targetHasContent && (
          <div className="px-4 py-2 bg-orange-50 border-b border-orange-100">
            <p className="text-xs text-orange-700">
              ⚠️ {isFullDay ? 'Il giorno di destinazione contiene già dei dati' : 'La cella di destinazione contiene già dei dati'}
            </p>
          </div>
        )}

        {/* Azioni */}
        <div className="p-3 space-y-2">
          {/* Sposta */}
          <button
            onClick={() => handleAction('move')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Move size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-800">Sposta</div>
              <div className="text-xs text-gray-500">
                {isFullDay ? 'Sposta tutto il giorno, svuota l\'origine' : 'Muove i dati, svuota l\'origine'}
              </div>
            </div>
          </button>

          {/* Copia */}
          <button
            onClick={() => handleAction('copy')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Copy size={20} className="text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-800">Copia</div>
              <div className="text-xs text-gray-500">
                {isFullDay ? 'Copia tutto il giorno, mantiene l\'origine' : 'Duplica i dati, mantiene l\'origine'}
              </div>
            </div>
          </button>

          {/* Scambia - solo se target ha contenuto */}
          {targetHasContent && (
            <button
              onClick={() => handleAction('swap')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <ArrowLeftRight size={20} className="text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800">Scambia</div>
                <div className="text-xs text-gray-500">
                  {isFullDay ? 'Scambia i contenuti dei due giorni' : 'Inverti i contenuti delle due celle'}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default CellActionModal;