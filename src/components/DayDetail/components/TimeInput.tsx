import React from 'react';
import { X } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { OfflineDisabled } from '../../ui';

// ============================================
// ALTROVE - TimeInput
// Input orario compatto e minimale
// ============================================

interface TimeInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  label,
  className = ''
}) => {
  const hasValue = value && value.length > 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label
          className="text-xs mr-1"
          style={{ color: colors.textMuted }}
        >
          {label}
        </label>
      )}
      <div
        className="relative flex items-center justify-center px-1 py-1.5 rounded-md border transition-colors focus-within:ring-1 focus-within:ring-offset-0"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          minWidth: '48px'
        }}
      >
        {/* Placeholder visibile quando vuoto */}
        {!hasValue && (
          <span 
            className="absolute inset-0 flex items-center justify-center text-xs pointer-events-none"
            style={{ color: colors.textPlaceholder }}
          >
            --:--
          </span>
        )}
        <OfflineDisabled>
          <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs bg-transparent border-none outline-none text-center w-full"
            style={{
              color: hasValue ? colors.text : 'transparent'
            }}
          />
        </OfflineDisabled>
      </div>
      {/* Spazio fisso per X (sempre presente, bottone solo se hasValue) */}
      <div className="w-1 flex items-center justify-center flex-shrink-0">
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            title="Rimuovi orario"
          >
            <X size={10} color={colors.textMuted} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TimeInput;