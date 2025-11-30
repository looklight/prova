// services/notifications/types.js

/**
 * Tipi di notifiche supportati
 */
export const NOTIFICATION_TYPES = {
  LINK_INVITE_ACCEPTED: 'link_invite_accepted',
  USERNAME_INVITE_ACCEPTED: 'username_invite_accepted',
  // 🆕 Notifiche uscita/rimozione membro
  MEMBER_LEFT: 'member_left',           // Membro esce volontariamente → notifica all'owner
  MEMBER_REMOVED: 'member_removed'      // Membro rimosso dall'owner → notifica al membro rimosso
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
  // 🆕 Config per nuovi tipi
  [NOTIFICATION_TYPES.MEMBER_LEFT]: {
    icon: '👋',
    color: 'orange',
    defaultTitle: (actorName) => `${actorName} ha lasciato il viaggio`
  },
  [NOTIFICATION_TYPES.MEMBER_REMOVED]: {
    icon: '🚫',
    color: 'red',
    defaultTitle: () => `Sei stato rimosso dal viaggio`
  }
};