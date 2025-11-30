import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import {
  subscribeToNotifications,
  markAllAsRead,
  deleteNotification,
  cleanupOldNotifications
} from '../services/notifications';
import {
  subscribeToPendingInvitations,
  acceptInvitation,
  rejectInvitation,
  cleanupExpiredInvitations
} from '../services/trips/invitations';
import Avatar from './Avatar';

const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    anno: { singular: 'anno', plural: 'anni', seconds: 31536000 },
    mese: { singular: 'mese', plural: 'mesi', seconds: 2592000 },
    settimana: { singular: 'settimana', plural: 'settimane', seconds: 604800 },
    giorno: { singular: 'giorno', plural: 'giorni', seconds: 86400 },
    ora: { singular: 'ora', plural: 'ore', seconds: 3600 },
    minuto: { singular: 'minuto', plural: 'minuti', seconds: 60 }
  };

  for (const [, { singular, plural, seconds: secondsInInterval }] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${interval === 1 ? singular : plural} fa`;
    }
  }
  return 'ora';
};

const getDaysUntilExpiry = (expiresAt) => {
  const now = new Date();
  const expires = expiresAt instanceof Date ? expiresAt : expiresAt?.toDate?.() || new Date(expiresAt);
  return Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
};

// 🆕 Messaggi per tipo notifica
const getNotificationMessage = (item) => {
  switch (item.type) {
    case 'member_left':
      return (
        <>
          <span className="font-medium">{item.actorName}</span>
          {' '}ha lasciato{' '}
          <span className="font-medium">{item.tripName}</span>
        </>
      );
    case 'member_removed':
      return (
        <>
          Sei stato rimosso da{' '}
          <span className="font-medium">{item.tripName}</span>
        </>
      );
    case 'link_invite_accepted':
    case 'username_invite_accepted':
    default:
      return (
        <>
          <span className="font-medium">{item.actorName}</span>
          {' '}si è unito a{' '}
          <span className="font-medium">{item.tripName}</span>
        </>
      );
  }
};

export default function NotificationCenter({ userProfile }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [processing, setProcessing] = useState({});

  const dropdownRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);

      if (user?.uid) {
        await Promise.all([
          cleanupOldNotifications(user.uid),
          cleanupExpiredInvitations(user.uid)
        ]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeToNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setInvitations([]);
      return;
    }

    const unsubscribe = subscribeToPendingInvitations(
      currentUser.uid,
      (invites) => {
        const now = new Date();
        const valid = invites.filter(inv => {
          const expiresAt = inv.expiresAt instanceof Date
            ? inv.expiresAt
            : inv.expiresAt?.toDate?.() || new Date(inv.expiresAt);
          return expiresAt > now;
        });
        setInvitations(valid);
      },
      (error) => console.error('❌ Errore inviti:', error)
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const totalBadge = invitations.length + unreadNotifications;

  // 🆕 Apri dropdown e segna tutto come letto
  const handleOpenDropdown = async () => {
    setShowDropdown(true);
    
    // Segna come lette quando APRI (non quando chiudi)
    if (unreadNotifications > 0 && currentUser?.uid) {
      try {
        await markAllAsRead(currentUser.uid);
      } catch (error) {
        console.error('❌ Errore auto-read:', error);
      }
    }
  };

  // 🆕 Semplice chiusura senza markAllAsRead
  const handleCloseDropdown = () => {
    setShowDropdown(false);
  };

  // 🆕 Toggle dropdown
  const handleToggleDropdown = () => {
    if (showDropdown) {
      handleCloseDropdown();
    } else {
      handleOpenDropdown();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleCloseDropdown();
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleNotificationClick = (notification) => {
    // 🆕 Non navigare se è una notifica di rimozione (non hai più accesso al viaggio)
    if (notification.type !== 'member_removed') {
      navigate('/');
    }
    setShowDropdown(false);
  };

  const handleDismissNotification = async (notificationId, event) => {
    event.stopPropagation();

    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('❌ Errore eliminazione:', error);
    }
  };

  const handleAcceptInvite = async (invitation) => {
    setProcessing(prev => ({ ...prev, [invitation.id]: 'accepting' }));

    try {
      await acceptInvitation(
        invitation.id,
        invitation.tripId,
        currentUser.uid,
        {
          uid: currentUser.uid,
          displayName: userProfile.displayName || currentUser.displayName,
          username: userProfile.username,
          avatar: userProfile.avatar || currentUser.photoURL
        }
      );
    } catch (error) {
      console.error('❌ Errore accettazione:', error);
      alert(`Errore: ${error.message}`);
    } finally {
      setProcessing(prev => {
        const newState = { ...prev };
        delete newState[invitation.id];
        return newState;
      });
    }
  };

  const handleRejectInvite = async (invitation) => {
    setProcessing(prev => ({ ...prev, [invitation.id]: 'rejecting' }));

    try {
      await rejectInvitation(invitation.id, invitation.tripId, currentUser.uid);
    } catch (error) {
      console.error('❌ Errore rifiuto:', error);
      alert(`Errore: ${error.message}`);
    } finally {
      setProcessing(prev => {
        const newState = { ...prev };
        delete newState[invitation.id];
        return newState;
      });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Badge */}
      <button
        onClick={handleToggleDropdown}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={24} className="text-gray-700" />

        {totalBadge > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-96 overflow-hidden flex flex-col">

          {/* 🆕 Header semplificato - senza X */}
          <div className="px-4 py-3 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-900">
              Notifiche
            </span>
          </div>

          <div className="overflow-y-auto">
            {/* Inviti */}
            {invitations.map((invite) => {
              const isProcessing = processing[invite.id];
              const daysLeft = getDaysUntilExpiry(invite.expiresAt);

              return (
                <div
                  key={invite.id}
                  className="p-4 border-b border-gray-100 bg-amber-50"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar
                      src={null}
                      name={invite.invitedByDisplayName || 'Utente'}
                      size="sm"
                    />

                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{invite.invitedByDisplayName}</span>
                        {' '}ti ha invitato
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {invite.tripName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getTimeAgo(invite.invitedAt)}
                        {daysLeft <= 3 && ` • Scade tra ${daysLeft}g`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      disabled={!!isProcessing}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-1.5"
                    >
                      {isProcessing === 'accepting' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={16} />
                          Accetta
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRejectInvite(invite)}
                      disabled={!!isProcessing}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:bg-gray-50"
                    >
                      {isProcessing === 'rejecting' ? '...' : 'Rifiuta'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Notifiche */}
            {notifications.length === 0 && invitations.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={40} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">Nessuna notifica</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors flex items-start gap-3 ${isUnread ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                      }`}
                  >
                    <Avatar
                      src={item.actorAvatar}
                      name={item.actorName || 'Utente'}
                      size="sm"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {getNotificationMessage(item)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getTimeAgo(item.createdAt)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDismissNotification(item.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}