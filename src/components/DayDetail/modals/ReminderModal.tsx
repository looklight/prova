import React, { useState, useEffect } from 'react';
import { Bell, X, Trash2 } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { BottomSheet } from '../../ui';
import {
  createReminder,
  updateReminder,
  deleteReminder,
  getReminderByCategory,
  type ReminderData,
  type Reminder
} from '../../../services/notifications/reminderService';

// ============================================
// ALTROVE - ReminderModal
// Modal compatto per promemoria
// ============================================

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  dayId: string | number;
  dayNumber: number;
  categoryId: string;
  categoryLabel: string;
  activityTitle?: string;
  tripMembers?: string[];
  currentUserId: string;
  onReminderChange?: (enabled: boolean) => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripName,
  dayId,
  dayNumber,
  categoryId,
  categoryLabel,
  activityTitle,
  tripMembers = [],
  currentUserId,
  onReminderChange
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingReminder, setExistingReminder] = useState<Reminder | null>(null);

  // Form
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [note, setNote] = useState('');

  // Carica dati quando si apre
  useEffect(() => {
    if (isOpen) {
      loadExistingReminder();
    }
  }, [isOpen, tripId, dayId, categoryId]);

  // Helper per convertire date da vari formati
  const parseReminderDate = (dateValue: any): Date | null => {
    try {
      if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
      }
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return dateValue;
      }
      if (dateValue) {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const loadExistingReminder = async () => {
    setIsLoading(true);
    try {
      const reminder = await getReminderByCategory(tripId, dayId, categoryId);
      setExistingReminder(reminder);

      if (reminder) {
        const date = parseReminderDate(reminder.reminderDate);
        if (date) {
          setReminderDate(date.toISOString().split('T')[0]);
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setReminderDate(tomorrow.toISOString().split('T')[0]);
        }
        setReminderTime(reminder.reminderTime || '09:00');
        setNote(reminder.note || '');
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setReminderDate(tomorrow.toISOString().split('T')[0]);
        setReminderTime('09:00');
        setNote('');
      }
    } catch (error) {
      console.error('Errore caricamento reminder:', error);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setReminderDate(tomorrow.toISOString().split('T')[0]);
      setReminderTime('09:00');
      setNote('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!reminderDate) return;

    setIsSaving(true);
    try {
      const reminderData: ReminderData = {
        tripId,
        tripName,
        dayId,
        dayNumber,
        categoryId,
        categoryLabel,
        activityTitle: activityTitle || categoryLabel,
        reminderDate: new Date(reminderDate),
        reminderTime,
        note: note.trim() || null,
        tripMembers,
        createdBy: currentUserId
      };

      if (existingReminder) {
        await updateReminder(existingReminder.id, {
          reminderDate: new Date(reminderDate),
          reminderTime,
          note: note.trim() || null
        });
      } else {
        await createReminder(reminderData);
      }

      onReminderChange?.(true);
      onClose();
    } catch (error) {
      console.error('Errore salvataggio reminder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReminder) return;

    setIsSaving(true);
    try {
      await deleteReminder(existingReminder.id);
      onReminderChange?.(false);
      onClose();
    } catch (error) {
      console.error('Errore eliminazione reminder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-amber-500" />
          <span className="font-medium text-sm" style={{ color: colors.text }}>
            Promemoria
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={18} color={colors.textMuted} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs mb-3" style={{ color: colors.textMuted }}>
          Ricevi una notifica per scadenze, check-in o cancellazioni gratuite.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium" style={{ color: colors.text }}>
              {activityTitle || categoryLabel} · Giorno {dayNumber} · {tripName}
            </p>

            <div className="flex gap-2">
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                style={{ borderColor: colors.border, color: colors.text }}
              />
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                style={{ borderColor: colors.border, color: colors.text }}
              />
            </div>

            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opzionale)"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              style={{ borderColor: colors.border, color: colors.text }}
            />

            <div className="flex items-center gap-2 pt-1">
              {existingReminder && (
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={18} color={colors.warm} />
                </button>
              )}

              <div className="flex-1" />

              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
                style={{ color: colors.textMuted }}
              >
                Annulla
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving || !reminderDate}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: isSaving || !reminderDate ? colors.border : '#F59E0B',
                  color: 'white'
                }}
              >
                {isSaving ? '...' : 'Crea Promemoria'}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

export default ReminderModal;
