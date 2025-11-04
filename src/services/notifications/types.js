// services/notifications/types.js

/**
 * Tipi di notifiche supportati
 */
export const NOTIFICATION_TYPES = {
  LINK_INVITE_ACCEPTED: 'link_invite_accepted',
  USERNAME_INVITE_ACCEPTED: 'username_invite_accepted'
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
  }
};