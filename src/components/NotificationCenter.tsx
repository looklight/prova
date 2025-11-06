// components/NotificationCenter.tsx
import React, { useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { 
  subscribeToNotifications, 
  markAsRead 
} from '../services/notifications';
import { 
  subscribeToPendingInvitations,
  acceptInvitation,
  rejectInvitation 
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

export default function NotificationCenter({ userProfile }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // ⭐ DUE STATI SEPARATI
  const [notifications, setNotifications] = useState([]); // Accepted
  const [invitations, setInvitations] = useState([]);     // Pending
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [processing, setProcessing] = useState({});

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // ⭐ LISTENER 1: Notifiche (inviti accettati)
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      return;
    }

    console.log('🔔 Sottoscrizione notifiche unificate per:', currentUser.uid);
    const unsubscribe = subscribeToNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  // ⭐ LISTENER 2: Inviti pendenti
  useEffect(() => {
    if (!currentUser?.uid) {
      setInvitations([]);
      return;
    }

    console.log('📨 Sottoscrizione inviti pendenti per:', currentUser.uid);
    const unsubscribe = subscribeToPendingInvitations(
      currentUser.uid,
      (invites) => {
        // Filtra solo validi
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

  // ⭐ TOTALE per badge
  const totalCount = notifications.length + invitations.length;

  // ⭐ UNIFICA e ordina per data
  const allItems = [
    ...notifications.map(n => ({ ...n, itemType: 'notification', date: n.createdAt })),
    ...invitations.map(i => ({ ...i, itemType: 'invitation', date: i.invitedAt }))
  ].sort((a, b) => b.date - a.date);

  // Click notifica (già accettata)
  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    navigate('/');
    setShowDropdown(false);
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
      
      // Rimuovi localmente (listener aggiornerà)
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
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
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
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
    <div className="relative">
      {/* Badge Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifiche e Inviti"
      >
        <Bell size={24} className="text-gray-700" />
        
        {totalCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Unificato */}
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nessuna notifica o invito
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-gray-200 font-semibold text-gray-900">
                  Notifiche ({totalCount})
                </div>
                
                {allItems.map((item) => {
                  if (item.itemType === 'notification') {
                    // ⭐ RENDER NOTIFICA (invito accettato)
                    return (
                      <div
                        key={`notif-${item.id}`}
                        onClick={() => handleNotificationClick(item)}
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar 
                            src={item.actorAvatar} 
                            name={item.actorName || 'Utente'} 
                            size="sm"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              🔔 <span className="font-semibold">{item.actorName}</span>
                              {' '}ha accettato l'invito per{' '}
                              <span className="font-semibold">{item.tripName}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getTimeAgo(item.date)}
                            </p>
                          </div>
                          
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        </div>
                      </div>
                    );
                  } else {
                    // ⭐ RENDER INVITO PENDENTE
                    const isProcessing = processing[item.id];
                    
                    return (
                      <div
                        key={`invite-${item.id}`}
                        className="p-4 border-b border-gray-100 bg-amber-50"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar 
                            src={null} 
                            name={item.invitedByDisplayName || 'Utente'} 
                            size="sm"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              📨 Invito da <span className="font-semibold">{item.invitedByDisplayName}</span>
                            </p>
                            <p className="text-sm text-gray-700 font-medium">
                              {item.tripName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getTimeAgo(item.date)}
                            </p>
                          </div>
                          
                          <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-1.5" />
                        </div>
                        
                        {/* Azioni */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(item)}
                            disabled={!!isProcessing}
                            className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-1"
                          >
                            {isProcessing === 'accepting' ? (
                              'Accettazione...'
                            ) : (
                              <>
                                <Check size={16} />
                                Accetta
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleRejectInvite(item)}
                            disabled={!!isProcessing}
                            className="flex-1 bg-red-50 text-red-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-gray-100 border border-red-200 flex items-center justify-center gap-1"
                          >
                            {isProcessing === 'rejecting' ? (
                              'Rifiuto...'
                            ) : (
                              <>
                                <X size={16} />
                                Rifiuta
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  }
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}