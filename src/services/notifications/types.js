// services/notifications/types.js

/**
 * Tipi di notifiche supportati
 */
export const NOTIFICATION_TYPES = {
  LINK_INVITE_ACCEPTED: 'link_invite_accepted',
  USERNAME_INVITE_ACCEPTED: 'username_invite_accepted',
  // Notifiche uscita/rimozione membro
  MEMBER_LEFT: 'member_left',
  MEMBER_REMOVED: 'member_removed',
  // 🆕 Notifiche reminder attività
  ACTIVITY_REMINDER: 'activity_reminder'
};

/**
 * Configurazione UI per tipo notifica
 */
export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.LINK_INVITE_ACCEPTED]: {
    icon: '🔗',
    color: 'blue',
    defaultTitle: (actorName) => `${actorName} ha accettato l'invito`
  },
  [NOTIFICATION_TYPES.USERNAME_INVITE_ACCEPTED]: {
    icon: '✉️',
    color: 'green',
    defaultTitle: (actorName) => `${actorName} ha accettato l'invito`
  },
  [NOTIFICATION_TYPES.MEMBER_LEFT]: {
    icon: '👋',
    color: 'orange',
    defaultTitle: (actorName) => `${actorName} ha lasciato il viaggio`
  },
  [NOTIFICATION_TYPES.MEMBER_REMOVED]: {
    icon: '🚫',
    color: 'red',
    defaultTitle: () => `Sei stato rimosso dal viaggio`
  },
  // 🆕 Config per reminder attività
  [NOTIFICATION_TYPES.ACTIVITY_REMINDER]: {
    icon: '🔔',
    color: 'amber',
    defaultTitle: (data) => {
      if (data?.activityTitle) {
        return `Promemoria: ${data.activityTitle}`;
      }
      return 'Promemoria attività';
    },
    // Subtitle con nota se presente
    subtitle: (data) => {
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