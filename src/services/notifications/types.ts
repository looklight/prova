// ============================================
// ALTROVE - Notification Types
// Tipi e configurazione notifiche
// ============================================

export const NOTIFICATION_TYPES = {
  LINK_INVITE_ACCEPTED: 'link_invite_accepted',
  USERNAME_INVITE_ACCEPTED: 'username_invite_accepted',
  MEMBER_LEFT: 'member_left',
  MEMBER_REMOVED: 'member_removed',
  ACTIVITY_REMINDER: 'activity_reminder'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

interface NotificationConfigItem {
  icon: string;
  color: string;
  defaultTitle: (data?: any) => string;
  subtitle?: (data?: any) => string | null;
}

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfigItem> = {
  [NOTIFICATION_TYPES.LINK_INVITE_ACCEPTED]: {
    icon: '🔗',
    color: 'blue',
    defaultTitle: (actorName: string) => `${actorName} ha accettato l'invito`
  },
  [NOTIFICATION_TYPES.USERNAME_INVITE_ACCEPTED]: {
    icon: '✉️',
    color: 'green',
    defaultTitle: (actorName: string) => `${actorName} ha accettato l'invito`
  },
  [NOTIFICATION_TYPES.MEMBER_LEFT]: {
    icon: '👋',
    color: 'orange',
    defaultTitle: (actorName: string) => `${actorName} ha lasciato il viaggio`
  },
  [NOTIFICATION_TYPES.MEMBER_REMOVED]: {
    icon: '🚫',
    color: 'red',
    defaultTitle: () => `Sei stato rimosso dal viaggio`
  },
  [NOTIFICATION_TYPES.ACTIVITY_REMINDER]: {
    icon: '🔔',
    color: 'amber',
    defaultTitle: (data?: { activityTitle?: string }) => {
      if (data?.activityTitle) {
        return `Promemoria: ${data.activityTitle}`;
      }
      return 'Promemoria attività';
    },
    subtitle: (data?: { note?: string; tripName?: string; dayNumber?: number }) => {
      if (data?.note) {
        return data.note;
      }
      if (data?.tripName && data?.dayNumber) {
        return `${data.tripName} - Giorno ${data.dayNumber}`;
      }
      return null;
    }
  }
};
