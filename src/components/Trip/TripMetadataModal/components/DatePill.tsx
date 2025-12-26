import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { colors } from '../../../../styles/theme';
import type { DatePillProps } from '../types';

/**
 * Formatta una data in formato compatto (es. "24 Dic")
 */
const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short'
  });
};

const DatePill: React.FC<DatePillProps> = ({
  startDate,
  endDate,
  onClick,
  disabled = false
}) => {
  const hasDateRange = startDate && endDate;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
      style={{
        backgroundColor: colors.bgSubtle,
        color: hasDateRange ? colors.text : colors.textMuted
      }}
    >
      <Calendar size={16} style={{ color: colors.textMuted }} />
      <span className="text-sm font-medium">
        {hasDateRange
          ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
          : 'Seleziona date'
        }
      </span>
      <ChevronDown size={16} style={{ color: colors.textMuted }} />
    </button>
  );
};

export default DatePill;
