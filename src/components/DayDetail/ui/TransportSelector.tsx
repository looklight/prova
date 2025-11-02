import React from 'react';
import { TRANSPORT_OPTIONS } from '../../../constants';

interface TransportSelectorProps {
  categoryId: string;
  currentMode: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (mode: string) => void;
}

const TransportSelector: React.FC<TransportSelectorProps> = ({
  categoryId,
  currentMode,
  isOpen,
  onToggle,
  onSelect
}) => {
  const currentEmoji = TRANSPORT_OPTIONS.find(t => t.value === currentMode)?.emoji || '🚡';

  return (
    <>
      <button
        onClick={onToggle}
        className="text-2xl hover:scale-110 transition-transform cursor-pointer"
        title="Seleziona mezzo di trasporto"
      >
        {currentEmoji}
      </button>

      {isOpen && (
        <div className="mb-3 animate-slideIn">
          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {TRANSPORT_OPTIONS.map((transport) => (
              <button
                key={transport.value}
                onClick={() => {
                  onSelect(transport.value);
                  onToggle(); // Chiude il menu
                }}
                className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-xl transition-all ${
                  currentMode === transport.value
                    ? 'bg-blue-100 border-2 border-blue-500 scale-105 shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300'
                }`}
                title={transport.label}
              >
                <span className="text-2xl">{transport.emoji}</span>
                <span className="text-[9px] text-gray-600 mt-0.5 font-medium">
                  {transport.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default TransportSelector;