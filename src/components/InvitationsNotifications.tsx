import React, { useState, useEffect } from 'react';
import { X, Check, XCircle, Mail, Clock, MapPin } from 'lucide-react';
import { 
  subscribeToPendingInvitations,
  acceptInvitation,
  rejectInvitation,
  deleteInvitation
} from '../services';

interface InvitationsNotificationsProps {
  currentUser: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  userProfile: {
    displayName: string;
    username?: string;
    avatar?: string | null;
  };
  onInviteAccepted?: (tripId: string) => void;
}

const InvitationsNotifications: React.FC<InvitationsNotificationsProps> = ({ 
  currentUser, 
  userProfile, 
  onInviteAccepted 
}) => {
  const [invitations, setInvitations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState({});
  
  // Listener real-time inviti pendenti
  useEffect(() => {
  if (!currentUser?.uid) return;
  
  console.log('📨 Sottoscrizione inviti pendenti...');
  
  const unsubscribe = subscribeToPendingInvitations(
    currentUser.uid,
    async (updatedInvitations) => {
      console.log(`📨 Inviti ricevuti: ${updatedInvitations.length}`);
      
      // ⭐ Filtra e cancella inviti scaduti
      const now = new Date();
      const validInvitations = [];
      
      for (const invitation of updatedInvitations) {
        // Gestisci diversi formati di data
        const expiresAt = invitation.expiresAt instanceof Date 
          ? invitation.expiresAt 
          : invitation.expiresAt?.toDate?.() || new Date(invitation.expiresAt);
        
        const isExpired = expiresAt < now;
        
        if (isExpired) {
          // Cancella inviti scaduti in background (non bloccare l'UI)
          console.log('🗑️ Eliminazione invito scaduto:', invitation.id);
          deleteInvitation(invitation.tripId, invitation.id).catch(err => {
            console.error('❌ Errore eliminazione invito scaduto:', err);
          });
        } else {
          // Mantieni solo inviti validi
          validInvitations.push(invitation);
        }
      }
      
      setInvitations(validInvitations);
    },
    (error) => {
      console.error('❌ Errore listener inviti:', error);
    }
  );
  
  return () => {
    console.log('🔌 Disconnessione listener inviti');
    unsubscribe();
  };
}, [currentUser?.uid]);
  
  // Accetta invito
  const handleAccept = async (invitation) => {
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
      
      console.log('✅ Invito accettato:', invitation.tripName);
      
      // Callback per aggiornare la lista viaggi
      if (onInviteAccepted) {
        onInviteAccepted(invitation.tripId);
      }
      
      // Rimuovi dalla lista locale (il listener aggiornerà comunque)
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (error) {
      console.error('❌ Errore accettazione invito:', error);
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
  const handleReject = async (invitation) => {
    setProcessing(prev => ({ ...prev, [invitation.id]: 'rejecting' }));
    
    try {
      await rejectInvitation(invitation.id, invitation.tripId, currentUser.uid);
      console.log('❌ Invito rifiutato:', invitation.tripName);
      
      // Rimuovi dalla lista locale
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (error) {
      console.error('❌ Errore rifiuto invito:', error);
      alert(`Errore: ${error.message}`);
    } finally {
      setProcessing(prev => {
        const newState = { ...prev };
        delete newState[invitation.id];
        return newState;
      });
    }
  };
  
  // Badge con numero inviti
  if (invitations.length === 0) {
    return null;
  }
  
  return (
    <>
      {/* Badge Notifiche */}
      <button
        onClick={() => setShowModal(true)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        title={`${invitations.length} ${invitations.length === 1 ? 'invito pendente' : 'inviti pendenti'}`}
      >
        <Mail size={24} className="text-gray-700" />
        {invitations.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {invitations.length > 9 ? '9+' : invitations.length}
          </span>
        )}
      </button>
      
      {/* Modal Inviti */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                Inviti Ricevuti ({invitations.length})
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>
            
            {/* Lista Inviti */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {invitations.map(invitation => {
                const isExpired = invitation.expiresAt < new Date();
                const isProcessing = processing[invitation.id];
                
                return (
                  <div
                    key={invitation.id}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      isExpired ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    
                    {/* Trip Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin size={18} className="text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-800">
                            {invitation.tripName}
                          </h3>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            Invitato da: <span className="font-medium">{invitation.invitedByDisplayName}</span>
                          </div>
                          <div>
                            Ruolo: <span className="font-medium">Member</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {isExpired ? (
                              <span className="text-red-600 font-medium">Scaduto</span>
                            ) : (
                              <span>
                                Scade il {invitation.expiresAt.toLocaleDateString('it-IT')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {!isExpired && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(invitation)}
                          disabled={!!isProcessing}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isProcessing === 'accepting' ? (
                            'Accettazione...'
                          ) : (
                            <>
                              <Check size={18} />
                              Accetta
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleReject(invitation)}
                          disabled={!!isProcessing}
                          className="flex-1 bg-red-50 text-red-600 py-2 px-4 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-200"
                        >
                          {isProcessing === 'rejecting' ? (
                            'Rifiuto...'
                          ) : (
                            <>
                              <XCircle size={18} />
                              Rifiuta
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {isExpired && (
                      <div className="text-center py-2 text-sm text-gray-500">
                        Questo invito è scaduto
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Footer */}
            <div className="border-t p-6 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Chiudi
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};

export default InvitationsNotifications;