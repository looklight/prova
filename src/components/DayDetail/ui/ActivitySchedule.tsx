import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import {
  createReminder,
  updateReminder,
  deleteReminder
} from '../../../services/notifications/reminderService';

interface Reminder {
  date: string | null;
  time: string | null;
  note: string | null;
}

interface ActivityScheduleProps {
  startTime: string | null;
  endTime: string | null;
  reminder: Reminder | null;
  reminderId: string | null;
  onSave: (data: {
    startTime: string | null;
    endTime: string | null;
    reminder: Reminder | null;
    reminderId: string | null;
  }) => void;
  tripId: string;
  tripName: string;
  dayId: string;
  dayNumber: number;
  categoryId: string;
  categoryLabel: string;
  activityTitle: string;
  participants: string[] | null;
  tripMembers: string[];
  currentUserId: string;
}

const ActivitySchedule: React.FC<ActivityScheduleProps> = ({
  startTime,
  endTime,
  reminder,
  reminderId,
  onSave,
  tripId,
  tripName,
  dayId,
  dayNumber,
  categoryId,
  categoryLabel,
  activityTitle,
  participants,
  tripMembers,
  currentUserId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Stati temporanei per il modal
  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');
  const [tempReminderDate, setTempReminderDate] = useState('');
  const [tempReminderTime, setTempReminderTime] = useState('09:00');
  const [tempReminderNote, setTempReminderNote] = useState('');
  const [showReminderInfo, setShowReminderInfo] = useState(false);

  // Calcola durata in formato leggibile
  const calculateDuration = (start: string, end: string): string | null => {
    if (!start || !end) return null;

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Formatta data reminder per display compatto
  const formatReminderDisplay = (): string | null => {
    if (!reminder?.date) return null;
    const date = new Date(reminder.date);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  // Sincronizza stati quando si apre il modal
  useEffect(() => {
    if (isModalOpen) {
      setTempStartTime(startTime || '');
      setTempEndTime(endTime || '');
      setTempReminderDate(reminder?.date || '');
      setTempReminderTime(reminder?.time || '09:00');
      setTempReminderNote(reminder?.note || '');
    }
  }, [isModalOpen, startTime, endTime, reminder]);

  // Chiudi con Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  // Blocca scroll body quando modal è aperto
  useEffect(() => {
    if (isModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isModalOpen]);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setIsLoading(true);

    try {
      let newReminderId = reminderId;
      let newReminderData: Reminder | null = null;

      // Gestisci reminder
      if (tempReminderDate) {
        newReminderData = {
          date: tempReminderDate,
          time: tempReminderTime || '09:00',
          note: tempReminderNote || null
        };

        if (reminderId) {
          // Aggiorna reminder esistente
          await updateReminder(reminderId, {
            reminderDate: tempReminderDate,
            reminderTime: tempReminderTime || '09:00',
            note: tempReminderNote || null,
            activityTitle: activityTitle || categoryLabel,
            participants,
            tripMembers
          });
        } else {
          // Crea nuovo reminder
          newReminderId = await createReminder({
            tripId,
            tripName,
            dayId,
            dayNumber,
            categoryId,
            categoryLabel,
            activityTitle: activityTitle || categoryLabel,
            reminderDate: tempReminderDate,
            reminderTime: tempReminderTime || '09:00',
            note: tempReminderNote || null,
            participants,
            tripMembers,
            createdBy: currentUserId
          });
        }
      } else if (reminderId) {
        // Rimuovi reminder se la data è stata svuotata
        await deleteReminder(reminderId);
        newReminderId = null;
      }

      // Salva tutto in una volta sola
      onSave({
        startTime: tempStartTime || null,
        endTime: tempEndTime || null,
        reminder: newReminderData,
        reminderId: newReminderId
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error('❌ Errore salvataggio:', error);
      alert('Errore nel salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAll = async () => {
    setIsLoading(true);

    try {
      if (reminderId) {
        await deleteReminder(reminderId);
      }

      // Salva tutto come null in una volta sola
      onSave({
        startTime: null,
        endTime: null,
        reminder: null,
        reminderId: null
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error('❌ Errore rimozione:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasTime = startTime || endTime;
  const hasReminder = !!reminder?.date;
  const hasAnyData = hasTime || hasReminder;
  const duration = startTime && endTime ? calculateDuration(startTime, endTime) : null;
  const reminderDisplay = formatReminderDisplay();

  // Modal renderizzato con Portal
  const modal = isModalOpen ? createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999] p-4"
      onClick={() => setIsModalOpen(false)}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Dettagli attività</span>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">

          {/* Sezione Orario */}
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--primary-10)] flex items-center gap-1">
              <span>Orario</span>
              <span className="text-xs font-normal text-gray-400">(opzionale)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Inizio</label>
                <input
                  type="time"
                  value={tempStartTime}
                  onChange={(e) => setTempStartTime(e.target.value)}
                  className="w-full px-3 py-2 h-10 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white appearance-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Fine</label>
                <input
                  type="time"
                  value={tempEndTime}
                  onChange={(e) => setTempEndTime(e.target.value)}
                  className="w-full px-3 py-2 h-10 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Sezione Promemoria */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Bell size={16} className="text-amber-500" />
                Promemoria
                <span className="text-xs font-normal text-gray-400">(opzionale)</span>
              </label>

              {/* Icona "?" come nel TripMetadataModal */}
              <button
                type="button"
                onClick={() => setShowReminderInfo(!showReminderInfo)}
                className="w-4 h-4 flex items-center justify-center text-[10px] font-semibold text-gray-500 border border-gray-300 rounded-full hover:bg-gray-100"
              >
                ?
              </button>
            </div>

            {/* Testo che appare sotto */}
            {showReminderInfo && (
              <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg leading-relaxed mb-2">
                💡 Imposta un promemoria per ricordare scadenze, check-in, prenotazioni o dettagli importanti legati all’attività. Riceverai una notifica direttamente dalla app.
              </p>
            )}

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Data</label>
                  <input
                    type="date"
                    value={tempReminderDate}
                    onChange={(e) => setTempReminderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div className="w-28">
                  <label className="text-xs text-gray-500 mb-1 block">Ora</label>
                  <input
                    type="time"
                    value={tempReminderTime}
                    onChange={(e) => setTempReminderTime(e.target.value)}
                    disabled={!tempReminderDate}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white disabled:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nota</label>
                <textarea
                  value={tempReminderNote}
                  onChange={(e) => setTempReminderNote(e.target.value)}
                  disabled={!tempReminderDate}
                  placeholder="Es: Cancellazione gratuita entro oggi"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-16 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:placeholder-gray-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          {hasAnyData ? (
            <button
              onClick={handleRemoveAll}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Rimuovi tutto
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Salvo...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Layout: Pulsante + Info testo */}
      <div className="flex items-center gap-3">
        {/* Pulsante stessa altezza del BookingToggle (40px) */}
        <button
          onClick={handleOpenModal}
          className="h-10 px-4 py-2 rounded-full text-xs font-medium bg-sky-100 text-gray-500 hover:bg-sky-200 transition-colors flex flex-col items-center justify-center"
        >
          <span>Imposta</span>
          <span>orario</span>
        </button>

        {/* Info orario e reminder come testo semplice */}
        {(hasTime || hasReminder) && (
          <div className="text-xs text-gray-600 flex items-center gap-3">
            {/* Orario */}
            {hasTime && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col leading-tight">
                  {startTime && <span>{startTime}</span>}
                  {endTime && (
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">→</span>
                      <span>{endTime}</span>
                    </span>
                  )}
                </div>
                {duration && (
                  <span className="text-[10px] text-gray-400 flex flex-col items-center leading-[12px]">
                    {duration.split(' ').map((part: string, index: number) => (
                      <span key={index}>{part}</span>
                    ))}
                  </span>
                )}
              </div>
            )}

            {/* Reminder */}
            {hasReminder && (
              <span className="flex items-center gap-0.5">
                <Bell size={11} className="text-amber-500" />
                {reminderDisplay}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal}
    </>
  );
};

export default ActivitySchedule;