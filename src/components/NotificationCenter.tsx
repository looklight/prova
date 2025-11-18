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
    anno: 31536000,
    mese: 2592000,
    settimana: 604800,
    giorno: 86400,
    ora: 3600,
    minuto: 60
  };
  
  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${name}${interval > 1 ? (name === 'mese' ? 'i' : name === 'ora' ? 'e' : 'i') : ''} fa`;
    }
  }
  return 'proprio ora';
};

// 🆕 Calcola giorni rimanenti per scadenza
const getDaysUntilExpiry = (expiresAt) => {
  const now = new Date();
  const expires = expiresAt instanceof Date ? expiresAt : expiresAt?.toDate?.() || new Date(expiresAt);
  return Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
};

export default function NotificationCenter({ userProfile }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [processing, setProcessing] = useState({});
  
  const dropdownRef = useRef(null);

  // Auth listener + cleanup al login
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user?.uid) {
        // 🆕 Cleanup automatico al login
        await Promise.all([
          cleanupOldNotifications(user.uid),
          cleanupExpiredInvitations(user.uid)
        ]);
      }
    });
    return unsubscribe;
  }, []);

  // ⭐ LISTENER 1: Notifiche (tutte ultime 7 giorni)
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      return;
    }

    console.log('🔔 Sottoscrizione notifiche per:', currentUser.uid);
    const unsubscribe = subscribeToNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  // ⭐ LISTENER 2: Inviti pendenti (con filtro scadenza)
  useEffect(() => {
    if (!currentUser?.uid) {
      setInvitations([]);
      return;
    }

    console.log('📨 Sottoscrizione inviti pendenti per:', currentUser.uid);
    const unsubscribe = subscribeToPendingInvitations(
      currentUser.uid,
      (invites) => {
        // Filtra solo validi e non scaduti
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

  // 🆕 Badge unificato (sempre rosso se > 0)
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const totalBadge = invitations.length + unreadNotifications;

  // 🆕 Auto-marca notifiche come lette quando chiudi
  const handleCloseDropdown = async () => {
    if (unreadNotifications > 0) {
      try {
        await markAllAsRead(currentUser.uid);
        console.log('✅ Notifiche marcate come lette');
      } catch (error) {
        console.error('❌ Errore auto-read:', error);
      }
    }
    setShowDropdown(false);
  };

  // 🆕 Click fuori chiude E marca come lette
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
  }, [showDropdown, unreadNotifications, currentUser]);

  // Click notifica → vai al viaggio
  const handleNotificationClick = (notification) => {
    navigate('/');
    setShowDropdown(false);
  };

  // 🆕 Dismissione singola notifica
  const handleDismissNotification = async (notificationId, event) => {
    event.stopPropagation();
    
    try {
      await deleteNotification(notificationId);
      console.log('✅ Notifica eliminata');
    } catch (error) {
      console.error('❌ Errore eliminazione:', error);
    }
  };

  // Accetta invito
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
      
      console.log('✅ Invito accettato');
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

  // Rifiuta invito
  const handleRejectInvite = async (invitation) => {
    setProcessing(prev => ({ ...prev, [invitation.id]: 'rejecting' }));
    
    try {
      await rejectInvitation(invitation.id, invitation.tripId, currentUser.uid);
      console.log('✅ Invito rifiutato');
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
      {/* Badge unificato (sempre rosso) */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifiche e Inviti"
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex gap-3 text-sm">
              {invitations.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="font-semibold">{invitations.length} {invitations.length === 1 ? 'invito' : 'inviti'}</span>
                </span>
              )}
              {unreadNotifications > 0 && invitations.length > 0 && (
                <span className="text-gray-400">•</span>
              )}
              {unreadNotifications > 0 && (
                <span className="text-gray-600">{unreadNotifications} {unreadNotifications === 1 ? 'nuova' : 'nuove'}</span>
              )}
              {totalBadge === 0 && (
                <span className="text-gray-500">Tutto letto ✨</span>
              )}
            </div>
            
            <button
              onClick={handleCloseDropdown}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* 🆕 SEZIONE 1: INVITI (sempre in cima, fixed) */}
            {invitations.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
                {invitations.map((invite) => {
                  const isProcessing = processing[invite.id];
                  const daysLeft = getDaysUntilExpiry(invite.expiresAt);
                  const showUrgent = daysLeft <= 3;
                  
                  return (
                    <div
                      key={`invite-${invite.id}`}
                      className="p-4 border-b border-amber-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="relative">
                          <Avatar 
                            src={null} 
                            name={invite.invitedByDisplayName || 'Utente'} 
                            size="md"
                          />
                          <span className="absolute -top-1 -right-1 text-lg">📨</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-red-700 font-bold uppercase tracking-wide mb-1">
                            ⚠️ Richiede azione
                          </p>
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">{invite.invitedByDisplayName}</span>
                            {' '}ti ha invitato a
                          </p>
                          <p className="text-base text-gray-900 font-bold mt-0.5">
                            {invite.tripName}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs text-gray-500">
                              {getTimeAgo(invite.invitedAt)}
                            </p>
                            
                            {/* 🆕 Mostra scadenza SOLO se ≤3 giorni */}
                            {showUrgent && (
                              <>
                                <span className="text-gray-300">•</span>
                                <p className="text-xs font-medium text-red-600">
                                  ⚠️ Scade tra {daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'}!
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Azioni */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(invite)}
                          disabled={!!isProcessing}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 px-3 rounded-lg text-sm font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:from-gray-300 disabled:to-gray-300 flex items-center justify-center gap-2 shadow-md"
                        >
                          {isProcessing === 'accepting' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Accettazione...
                            </>
                          ) : (
                            <>
                              <Check size={18} />
                              Accetta
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleRejectInvite(invite)}
                          disabled={!!isProcessing}
                          className="flex-1 bg-white text-gray-700 py-2.5 px-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all disabled:bg-gray-50 border-2 border-gray-200 flex items-center justify-center gap-2"
                        >
                          {isProcessing === 'rejecting' ? (
                            'Rifiuto...'
                          ) : (
                            <>
                              <X size={18} />
                              Rifiuta
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Divisore tra inviti e notifiche */}
                {notifications.length > 0 && (
                  <div className="flex items-center px-4 py-3 bg-white gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Notifiche
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
              </div>
            )}

            {/* 🆕 SEZIONE 2: NOTIFICHE (scrollabili) */}
            {notifications.length === 0 && invitations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell size={48} className="mx-auto mb-2 opacity-20" />
                <p>Nessuna notifica</p>
              </div>
            ) : notifications.length === 0 && invitations.length > 0 ? (
              <div className="p-4 text-center text-gray-400">
                <p className="text-sm">Nessuna notifica recente</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read;
                
                return (
                  <div
                    key={`notif-${item.id}`}
                    className="relative group"
                  >
                    <div
                      onClick={() => handleNotificationClick(item)}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        isUnread 
                          ? 'bg-blue-50 hover:bg-blue-100' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar 
                          src={item.actorAvatar} 
                          name={item.actorName || 'Utente'} 
                          size="sm"
                        />
                        
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-sm text-gray-900">
                            ✅ <span className="font-semibold">{item.actorName}</span>
                            {' '}si è unito a{' '}
                            <span className="font-semibold">{item.tripName}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getTimeAgo(item.createdAt)}
                          </p>
                        </div>
                        
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                    
                    {/* Bottone dismiss (al hover) */}
                    <button
                      onClick={(e) => handleDismissNotification(item.id, e)}
                      className="absolute top-3 right-3 p-1.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      title="Elimina"
                    >
                      <X size={14} />
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