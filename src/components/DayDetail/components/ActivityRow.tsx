import React from 'react';
import { MapPin, ArrowRight, Paperclip, Bell } from 'lucide-react';
import { colors } from '../../../styles/theme';
import { Activity } from '../sections/ActivitiesSection';
import { ActivityTypeIcon } from '../../../utils/activityTypes';

// ============================================
// ALTROVE - ActivityRow
// Riga singola attività (collapsed)
// ============================================

interface ActivityRowProps {
  activity: Activity;
  index: number;
  onClick: () => void;
}

const ActivityRow: React.FC<ActivityRowProps> = ({
  activity,
  index,
  onClick
}) => {
  
  // Booking color - usa colori tema
  const getBookingColor = () => {
    switch (activity.bookingStatus) {
      case 'yes': return colors.success;
      case 'no': return colors.warm;
      default: return colors.textMuted;
    }
  };

  // Check se c'è almeno un orario
  const hasTime = activity.startTime || activity.endTime;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-white/50"
      onClick={onClick}
    >
      {/* Booking indicator - solo se verde o arancione */}
      {activity.bookingStatus !== 'na' && (
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: getBookingColor() }}
        />
      )}

      {/* Tipo attività - accanto al booking dot */}
      <ActivityTypeIcon
        type={activity.type}
        size={16}
        showColor={true}
      />

      {/* Titolo */}
      <span
        className="flex-1 text-base font-medium truncate"
        style={{ color: activity.title ? colors.text : colors.textPlaceholder }}
      >
        {activity.title || 'Nuova attività'}
      </span>

      {/* Location indicator */}
      {(activity.location?.coordinates || activity.departure?.location?.coordinates || activity.arrival?.location?.coordinates) && (
        <MapPin size={12} color="#EF4444" className="flex-shrink-0" />
      )}

      {/* Media indicator */}
      {!!(activity.images?.length || activity.videos?.length || activity.links?.length || activity.mediaNotes?.length) && (
        <Paperclip size={12} color={colors.textMuted} className="flex-shrink-0" />
      )}

      {/* Reminder indicator */}
      {activity.reminder?.enabled && (
        <Bell size={12} color={colors.warm} className="flex-shrink-0" />
      )}

      {/* Orario su 2 righe compatto - posizioni fisse */}
      {hasTime && (
        <div
          className="flex flex-col items-end flex-shrink-0 gap-1"
          style={{
            color: colors.textMuted,
            fontSize: '12px',
            lineHeight: '1'
          }}
        >
          {/* Riga superiore: orario inizio (o spazio vuoto) */}
          <span style={{ visibility: activity.startTime ? 'visible' : 'hidden' }}>
            {activity.startTime || '00:00'}
          </span>
          {/* Riga inferiore: orario fine (o spazio vuoto) */}
          <span
            className="flex items-center gap-0.5"
            style={{ visibility: activity.endTime ? 'visible' : 'hidden' }}
          >
            <ArrowRight size={6} />
            {activity.endTime || '00:00'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ActivityRow;