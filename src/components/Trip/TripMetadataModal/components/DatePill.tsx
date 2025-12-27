import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors, rawColors } from '../../../../styles/theme';
import type { DatePillProps } from '../types';

/**
 * Calcola la durata in giorni tra due date
 */
const getDurationDays = (start: Date, end: Date): number => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Formatta una data in modo friendly (es: "15 gen")
 */
const formatDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('it-IT', { month: 'short' });
  return `${day} ${month}`;
};

/**
 * Formatta l'anno se diverso dall'anno corrente
 */
const formatYear = (date: Date): string | null => {
  const currentYear = new Date().getFullYear();
  return date.getFullYear() !== currentYear ? `${date.getFullYear()}` : null;
};

const DatePill: React.FC<DatePillProps> = ({
  startDate,
  endDate,
  onClick,
  disabled = false
}) => {
  const hasDateRange = startDate && endDate;
  const duration = hasDateRange ? getDurationDays(startDate, endDate) : 0;
  const showYear = hasDateRange && (formatYear(startDate) || formatYear(endDate));

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-2xl transition-all disabled:opacity-50"
      style={{
        backgroundColor: hasDateRange ? rawColors.accentSoft : colors.bgSubtle,
        border: 'none'
      }}
    >
      <div className="px-4 py-5">
        {hasDateRange ? (
          <div className="flex items-center gap-3">
            {/* Icona calendario */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: rawColors.accent }}
            >
              <Calendar size={20} color="white" />
            </div>

            {/* Date range */}
            <div className="flex flex-col items-start flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-base font-semibold"
                  style={{ color: colors.text }}
                >
                  {formatDate(startDate)}
                </span>
                <span
                  className="text-base"
                  style={{ color: colors.textMuted }}
                >
                  →
                </span>
                <span
                  className="text-base font-semibold"
                  style={{ color: colors.text }}
                >
                  {formatDate(endDate)}
                </span>
                {showYear && (
                  <span
                    className="text-sm"
                    style={{ color: colors.textMuted }}
                  >
                    {formatYear(endDate) || formatYear(startDate)}
                  </span>
                )}
              </div>
              <span
                className="text-sm"
                style={{ color: colors.accent }}
              >
                {duration} {duration === 1 ? 'giorno' : 'giorni'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${rawColors.accent} 0%, ${rawColors.accentDark} 100%)`
              }}
            >
              <Calendar size={20} color="white" />
            </div>
            <div className="flex flex-col items-start flex-1">
              <span
                className="text-base font-semibold"
                style={{ color: colors.text }}
              >
                Quando parti?
              </span>
              <span
                className="text-sm"
                style={{ color: colors.textMuted }}
              >
                Seleziona le date del viaggio
              </span>
            </div>
            <ChevronRight
              size={20}
              style={{ color: colors.textMuted }}
              className="flex-shrink-0"
            />
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default DatePill;
