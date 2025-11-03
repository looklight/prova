import React, { useEffect, useRef } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🆕 Chiudi quando clicchi fuori
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="text-2xl hover:scale-110 transition-transform cursor-pointer"
        title="Seleziona mezzo di trasporto"
      >
        {currentEmoji}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 animate-slideIn"
          style={{ width: '320px' }}
        >
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_OPTIONS.map((transport) => (
              <button
                key={transport.value}
                onClick={() => {
                  const valueToSet = transport.value === 'default' ? 'funivia' : transport.value;
                  onSelect(valueToSet);
                  onToggle();
                }}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                  currentMode === transport.value
                    ? 'bg-blue-100 border-2 border-blue-500 scale-105 shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300'
                }`}
                title={transport.label}
              >
                <span className="text-xl">{transport.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportSelector;