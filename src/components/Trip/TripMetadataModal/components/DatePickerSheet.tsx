import React, { useMemo, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { it } from 'date-fns/locale';
import { AnimatePresence, motion, PanInfo, useAnimation } from 'framer-motion';
import 'react-day-picker/dist/style.css';
import { colors } from '../../../../styles/theme';
import type { DatePickerSheetProps } from '../types';

/**
 * Calcola il numero di giorni tra due date
 */
const getDaysDiff = (range: DateRange | undefined): number | null => {
  if (!range?.from || !range?.to) return null;
  const diffTime = range.to.getTime() - range.from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/** Soglia in pixel per chiudere con swipe */
const SWIPE_CLOSE_THRESHOLD = 100;

const DatePickerSheet: React.FC<DatePickerSheetProps> = ({
  isOpen,
  onClose,
  dateRange,
  onDateChange
}) => {
  const controls = useAnimation();
  const daysDiff = useMemo(() => getDaysDiff(dateRange), [dateRange]);
  const isValidRange = daysDiff !== null && daysDiff > 0 && daysDiff <= 90;

  // Avvia animazione apertura
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
    }
  }, [isOpen, controls]);

  const handleConfirm = () => {
    // Se c'è solo data inizio, imposta fine = inizio
    if (dateRange?.from && !dateRange?.to) {
      onDateChange({ from: dateRange.from, to: dateRange.from });
    }
    onClose();
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Chiudi se trascinato abbastanza in basso o con velocità sufficiente
    if (info.offset.y > SWIPE_CLOSE_THRESHOLD || info.velocity.y > 500) {
      onClose();
    } else {
      // Torna in posizione
      controls.start({ y: 0 });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={controls}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col touch-none"
            style={{ backgroundColor: colors.bgCard }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: colors.border }}
              />
            </div>

            {/* Calendar */}
            <div className="px-4 flex-1 overflow-y-auto">
              <style>{`
                .travel-calendar {
                  --rdp-accent-color: ${colors.accent};
                  --rdp-accent-background-color: ${colors.accentSoft};
                  --rdp-cell-size: 48px;
                  margin: 0 auto;
                  width: 100%;
                  display: flex;
                  justify-content: center;
                }
                .travel-calendar .rdp-months {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                }
                .travel-calendar .rdp-month {
                  width: 100%;
                  max-width: 350px;
                }
                .travel-calendar .rdp-month_grid {
                  width: 100%;
                  margin: 0 auto;
                }
                .travel-calendar .rdp-month_caption {
                  padding-bottom: 0.75rem;
                  margin-bottom: 0.75rem;
                  border-bottom: 1px solid ${colors.border};
                }
                .travel-calendar .rdp-caption_label {
                  font-size: 1.1rem;
                  font-weight: 600;
                  color: ${colors.text};
                }
                .travel-calendar .rdp-weekday {
                  font-size: 0.85rem;
                  font-weight: 600;
                  color: ${colors.textMuted};
                  padding: 0.5rem 0;
                }
                .travel-calendar .rdp-day {
                  width: var(--rdp-cell-size);
                  height: var(--rdp-cell-size);
                }
                .travel-calendar .rdp-day_button {
                  width: 100%;
                  height: 100%;
                  font-size: 1rem;
                  border-radius: 50%;
                }
                .travel-calendar .rdp-selected .rdp-day_button {
                  background-color: ${colors.accent};
                  color: white;
                  font-weight: 600;
                }
                .travel-calendar .rdp-range_middle .rdp-day_button {
                  background-color: ${colors.accentSoft};
                  color: ${colors.accent};
                  border-radius: 50%;
                }
                .travel-calendar .rdp-today:not(.rdp-selected) .rdp-day_button {
                  border: 2px solid ${colors.accent};
                  font-weight: 600;
                }
                .travel-calendar .rdp-disabled .rdp-day_button {
                  color: ${colors.textPlaceholder};
                }
              `}</style>

              <DayPicker
                className="travel-calendar"
                mode="range"
                selected={dateRange}
                onSelect={onDateChange}
                locale={it}
                numberOfMonths={1}
                disabled={{ before: new Date() }}
              />

            </div>

            {/* Footer con info e conferma - fisso in basso */}
            <div
              className="flex-shrink-0 px-4 pt-4 pb-6 flex items-center justify-between border-t"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bgCard,
                paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))'
              }}
            >
              <div className="text-sm" style={{ color: colors.textMuted }}>
                {daysDiff !== null ? (
                  <span style={{ color: isValidRange ? colors.accent : colors.danger }}>
                    {daysDiff} giorn{daysDiff === 1 ? 'o' : 'i'}
                    {daysDiff > 90 && ' (max 90)'}
                  </span>
                ) : (
                  <span>Seleziona partenza e ritorno</span>
                )}
              </div>

              <div className="flex gap-2">
                {dateRange?.from && (
                  <button
                    type="button"
                    onClick={() => onDateChange(undefined)}
                    className="px-4 py-2.5 rounded-full text-sm font-medium transition-colors"
                    style={{ color: colors.danger }}
                  >
                    Cancella
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: colors.accent }}
                >
                  Conferma
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DatePickerSheet;
