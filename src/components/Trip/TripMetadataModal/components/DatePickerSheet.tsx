import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { it } from 'date-fns/locale';
import { startOfMonth, subMonths, addDays, differenceInDays, eachDayOfInterval } from 'date-fns';
import { AnimatePresence, motion, PanInfo, useAnimation } from 'framer-motion';
import 'react-day-picker/dist/style.css';
import { colors, rawColors } from '../../../../styles/theme';
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

/** Mesi nel passato da mostrare */
const MONTHS_IN_PAST = 12;
/** Mesi nel futuro da mostrare */
const MONTHS_IN_FUTURE = 12;
/** Totale mesi */
const MONTHS_TO_SHOW = MONTHS_IN_PAST + MONTHS_IN_FUTURE;

/**
 * Stili CSS per il calendario moderno
 * Utilizza le CSS variables native di react-day-picker v9
 */
const calendarStyles = `
  .altrove-calendar {
    /* Colori accent */
    --rdp-accent-color: ${rawColors.accent};
    --rdp-accent-background-color: ${rawColors.accentSoft};

    /* Dimensioni celle */
    --rdp-day-height: 44px;
    --rdp-day-width: 44px;
    --rdp-day_button-width: 40px;
    --rdp-day_button-height: 40px;
    --rdp-day_button-border-radius: 50%;
    --rdp-day_button-border: none;

    /* Range styling */
    --rdp-range_middle-background-color: ${rawColors.accentSoft};
    --rdp-range_middle-color: ${rawColors.accentDark};
    --rdp-range_start-color: white;
    --rdp-range_start-date-background-color: ${rawColors.accent};
    --rdp-range_end-color: white;
    --rdp-range_end-date-background-color: ${rawColors.accent};

    /* Selected */
    --rdp-selected-border: none;

    /* Today */
    --rdp-today-color: ${rawColors.accent};

    /* Disabled & outside */
    --rdp-disabled-opacity: 0.35;
    --rdp-outside-opacity: 0;

    /* Layout */
    --rdp-months-gap: 0;

    width: 100%;
    font-family: inherit;
  }

  /* Layout mesi */
  .altrove-calendar .rdp-months {
    flex-direction: column;
    width: 100%;
    padding: 0 16px;
    gap: 0;
  }

  .altrove-calendar .rdp-month {
    width: 100%;
  }

  .altrove-calendar .rdp-month_grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  /* Caption del mese - stile minimal */
  .altrove-calendar .rdp-month_caption {
    padding: 16px 0 10px;
  }

  .altrove-calendar .rdp-caption_label {
    font-size: 0.75rem;
    font-weight: 600;
    color: ${rawColors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Nascondi navigazione e weekdays (li abbiamo nell'header) */
  .altrove-calendar .rdp-nav,
  .altrove-calendar .rdp-weekdays {
    display: none !important;
  }

  /* Cella giorno - occupa 1/7 della larghezza */
  .altrove-calendar .rdp-day {
    width: calc(100% / 7);
    height: var(--rdp-day-height);
    text-align: center;
    padding: 2px 0;
  }

  /* Bottone giorno */
  .altrove-calendar .rdp-day_button {
    width: var(--rdp-day_button-width);
    height: var(--rdp-day_button-height);
    font-size: 0.9rem;
    font-weight: 500;
    color: ${rawColors.text};
    border-radius: var(--rdp-day_button-border-radius);
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .altrove-calendar .rdp-day_button:hover {
    background-color: ${rawColors.bgSubtle};
  }

  /* Oggi */
  .altrove-calendar .rdp-today:not(.rdp-range_start):not(.rdp-range_end):not(.rdp-range_middle) .rdp-day_button {
    font-weight: 700;
    color: ${rawColors.accent};
  }

  /* Selected singolo (quando hai solo from, senza to) */
  .altrove-calendar .rdp-selected:not(.rdp-range_start):not(.rdp-range_end):not(.rdp-range_middle) .rdp-day_button {
    background-color: ${rawColors.accent};
    color: white;
    font-weight: 600;
  }

  /* Range start */
  .altrove-calendar .rdp-range_start {
    background: linear-gradient(90deg, transparent 50%, ${rawColors.accentSoft} 50%);
  }

  .altrove-calendar .rdp-range_start .rdp-day_button {
    background-color: ${rawColors.accent};
    color: white;
    font-weight: 600;
  }

  /* Range end */
  .altrove-calendar .rdp-range_end {
    background: linear-gradient(90deg, ${rawColors.accentSoft} 50%, transparent 50%);
  }

  .altrove-calendar .rdp-range_end .rdp-day_button {
    background-color: ${rawColors.accent};
    color: white;
    font-weight: 600;
  }

  /* Range start+end (giorno singolo selezionato con from=to) */
  .altrove-calendar .rdp-range_start.rdp-range_end {
    background: transparent;
  }

  /* Range middle */
  .altrove-calendar .rdp-range_middle {
    background-color: ${rawColors.accentSoft};
  }

  .altrove-calendar .rdp-range_middle .rdp-day_button {
    color: ${rawColors.accentDark};
    font-weight: 500;
    background: transparent;
  }

  .altrove-calendar .rdp-range_middle .rdp-day_button:hover {
    background-color: rgba(78, 205, 196, 0.3);
  }

  /* Disabled */
  .altrove-calendar .rdp-disabled .rdp-day_button {
    color: ${rawColors.textPlaceholder};
    opacity: var(--rdp-disabled-opacity);
    cursor: not-allowed;
  }

  /* Outside (giorni fuori dal mese) */
  .altrove-calendar .rdp-outside {
    visibility: hidden;
  }
`;

const DatePickerSheet: React.FC<DatePickerSheetProps> = ({
  isOpen,
  onClose,
  dateRange,
  onDateChange,
  mode = 'create'
}) => {
  const controls = useAnimation();
  const daysDiff = useMemo(() => getDaysDiff(dateRange), [dateRange]);
  const isValidRange = daysDiff !== null && daysDiff > 0 && daysDiff <= 90;
  const isEditMode = mode === 'edit';

  // Stato locale per il range visualizzato in edit mode
  const [editPreviewRange, setEditPreviewRange] = useState<DateRange | undefined>(undefined);

  // Durata originale del viaggio (calcolata quando si apre in edit mode)
  const originalDuration = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return differenceInDays(dateRange.to, dateRange.from);
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  // Range da visualizzare: in edit mode usa il preview se disponibile
  const displayRange = isEditMode && editPreviewRange ? editPreviewRange : dateRange;

  // Mese di partenza (12 mesi fa)
  const startMonth = useMemo(() => startOfMonth(subMonths(new Date(), MONTHS_IN_PAST)), []);

  // Reset del preview quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      setEditPreviewRange(undefined);
    }
  }, [isOpen]);

  /**
   * Gestione selezione date in create mode
   */
  const handleDateSelect = useCallback((range: DateRange | undefined) => {
    onDateChange(range);
  }, [onDateChange]);

  /**
   * Gestione selezione data in edit mode
   * Quando l'utente clicca una data, sposta tutto il range mantenendo la durata
   */
  const handleEditDateSelect = useCallback((date: Date | undefined) => {
    if (date && originalDuration >= 0) {
      const newEndDate = addDays(date, originalDuration);
      const newRange = { from: date, to: newEndDate };
      setEditPreviewRange(newRange);
      // Notifica subito il parent del nuovo range
      onDateChange(newRange);
    }
  }, [originalDuration, onDateChange]);

  /**
   * Modifiers per mostrare il range in edit mode
   * Usa le stesse classi CSS del range normale
   */
  const editModeModifiers = useMemo(() => {
    if (!isEditMode || !displayRange?.from || !displayRange?.to) {
      return {};
    }

    const days = eachDayOfInterval({
      start: displayRange.from,
      end: displayRange.to
    });

    if (days.length === 0) return {};

    // Giorno singolo
    if (days.length === 1) {
      return {
        range_start: [days[0]],
        range_end: [days[0]]
      };
    }

    // Range con più giorni
    return {
      range_start: [days[0]],
      range_end: [days[days.length - 1]],
      range_middle: days.slice(1, -1)
    };
  }, [isEditMode, displayRange?.from?.getTime(), displayRange?.to?.getTime()]);

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
    if (info.offset.y > SWIPE_CLOSE_THRESHOLD || info.velocity.y > 500) {
      onClose();
    } else {
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
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col touch-none"
            style={{ backgroundColor: colors.bgCard }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: colors.border }}
              />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 pb-2">
              <h3
                className="text-base font-semibold text-center mb-1"
                style={{ color: colors.text }}
              >
                {isEditMode ? 'Sposta il viaggio' : 'Seleziona le date'}
              </h3>
              {isEditMode && (
                <p
                  className="text-xs text-center mb-2"
                  style={{ color: colors.textMuted }}
                >
                  La durata del viaggio verrà mantenuta
                </p>
              )}

              {/* Giorni della settimana - stesso layout del calendario */}
              <div
                className="grid grid-cols-7"
                style={{ padding: '0 16px' }}
              >
                {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center text-xs font-medium"
                    style={{
                      color: colors.textPlaceholder,
                      height: '28px'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
              <style>{calendarStyles}</style>
              {isEditMode ? (
                <DayPicker
                  className="altrove-calendar"
                  mode="single"
                  selected={undefined}
                  onSelect={handleEditDateSelect}
                  locale={it}
                  numberOfMonths={MONTHS_TO_SHOW}
                  startMonth={startMonth}
                  showOutsideDays={false}
                  modifiers={editModeModifiers}
                  modifiersClassNames={{
                    range_start: 'rdp-range_start',
                    range_end: 'rdp-range_end',
                    range_middle: 'rdp-range_middle'
                  }}
                />
              ) : (
                <DayPicker
                  className="altrove-calendar"
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateSelect}
                  locale={it}
                  numberOfMonths={MONTHS_TO_SHOW}
                  startMonth={startMonth}
                  showOutsideDays={false}
                />
              )}
            </div>

            {/* Footer */}
            <div
              className="flex-shrink-0 px-4 flex items-center justify-between"
              style={{
                backgroundColor: colors.bgCard,
                paddingTop: '12px',
                paddingBottom: 'calc(36px + env(safe-area-inset-bottom, 0px))'
              }}
            >
              {isEditMode ? (
                <div className="flex gap-3 items-center ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    style={{ color: colors.textMuted }}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Conferma
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ color: colors.textMuted }}>
                    {daysDiff !== null ? (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isValidRange ? colors.accent : colors.danger }}
                      >
                        {daysDiff} giorn{daysDiff === 1 ? 'o' : 'i'}
                        {daysDiff > 90 && ' (max 90)'}
                      </span>
                    ) : dateRange?.from ? (
                      <span className="text-xs" style={{ color: colors.accent }}>
                        Seleziona data fine
                      </span>
                    ) : (
                      <span className="text-xs">Tocca per selezionare</span>
                    )}
                  </div>

                  <div className="flex gap-3 items-center">
                    {dateRange?.from && (
                      <button
                        type="button"
                        onClick={() => onDateChange(undefined)}
                        className="text-sm font-medium transition-colors"
                        style={{ color: colors.textMuted }}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                      style={{ backgroundColor: colors.accent }}
                    >
                      Conferma
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DatePickerSheet;
