import React, { useState, useEffect } from 'react';
import { X, User, Crown, Trash2, Link2, Copy, Check, RefreshCw } from 'lucide-react';
import { removeMember } from '../services/tripService';
import { generateInviteLink, getActiveInviteLink } from '../services/invites/linkInvites';

interface TripMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: {
    id: string;
    name: string;
    sharing: {
      memberIds: string[];
      members: {
        [userId: string]: {
          role: 'owner' | 'member';
          status: 'active' | 'invited' | 'removed';
          joinedAt: Date;
          displayName: string;
          username?: string;
          avatar?: string;
          joinedVia?: 'link' | 'username';
        };
      };
    };
  };
  currentUser: {
    uid: string;
    displayName: string;
  };
  onMemberUpdated?: () => void;
}

const TripMembersModal: React.FC<TripMembersModalProps> = ({
  isOpen,
  onClose,
  trip,
  currentUser,
  onMemberUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'link'>('members');
  const [processingMember, setProcessingMember] = useState<string | null>(null);
  
  // Stati per link invito
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkExpiry, setLinkExpiry] = useState<Date | null>(null);

  const isOwner = trip.sharing.members[currentUser.uid]?.role === 'owner';

  // Carica link attivo all'apertura (solo se owner)
  useEffect(() => {
    if (isOpen && isOwner && activeTab === 'link') {
      loadActiveLink();
    }
  }, [isOpen, activeTab, isOwner]);

  const loadActiveLink = async () => {
    setLoadingLink(true);
    try {
      const active = await getActiveInviteLink(trip.id);
      if (active) {
        const fullLink = `${window.location.origin}/invite/${active.token}`;
        setInviteLink(fullLink);
        setLinkExpiry(active.expiresAt);
      } else {
        setInviteLink(null);
        setLinkExpiry(null);
      }
    } catch (error) {
      console.error('❌ Errore caricamento link:', error);
    } finally {
      setLoadingLink(false);
    }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const token = await generateInviteLink(trip.id, currentUser.uid);
      const fullLink = `${window.location.origin}/invite/${token}`;
      setInviteLink(fullLink);
      
      // Ricarica per ottenere expiry
      await loadActiveLink();
    } catch (error) {
      console.error('❌ Errore generazione link:', error);
      alert(`Errore: ${error.message}`);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const activeMembers = trip.sharing.memberIds
    .map(userId => ({
      userId,
      ...trip.sharing.members[userId]
    }))
    .filter(member => member.status === 'active')
    .sort((a, b) => {
      if (a.role === 'owner') return -1;
      if (b.role === 'owner') return 1;
      return 0;
    });

  const handleRemoveMember = async (userId: string, displayName: string) => {
    if (!isOwner || userId === currentUser.uid) return;

    if (!confirm(`Vuoi rimuovere ${displayName} dal viaggio?`)) {
      return;
    }

    setProcessingMember(userId);
    try {
      await removeMember(trip.id, userId);
      console.log('✅ Membro rimosso:', userId);
      
      if (onMemberUpdated) {
        onMemberUpdated();
      }
    } catch (error) {
      console.error('❌ Errore rimozione membro:', error);
      alert(`Errore: ${error.message}`);
    } finally {
      setProcessingMember(null);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') {
      return <Crown size={16} className="text-yellow-600" />;
    }
    return null;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'owner') {
      return 'Owner';
    }
    return 'Member';
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'owner') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <User size={24} />
              Gestisci Membri
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeMembers.length} {activeMembers.length === 1 ? 'persona' : 'persone'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <User size={18} />
              Membri
            </span>
          </button>
          
          {isOwner && (
            <button
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-3 px-4 font-medium transition-colors ${
                activeTab === 'link'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Link2 size={18} />
                Link Invito
              </span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'members' && (
            <div className="space-y-3">
              {activeMembers.map(member => {
                const isCurrentUser = member.userId === currentUser.uid;
                const isProcessing = processingMember === member.userId;
                const canManage = isOwner && !isCurrentUser && member.role !== 'owner';

                return (
                  <div
                    key={member.userId}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      isCurrentUser ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      
                      {/* Avatar */}
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.displayName}
                          className="w-14 h-14 rounded-full object-cover border-2 border-gray-300"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          <User size={24} className="text-white" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {member.displayName}
                          </p>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                              Tu
                            </span>
                          )}
                          {member.joinedVia === 'link' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                              Via Link
                            </span>
                          )}
                        </div>
                        
                        {member.username && (
                          <p className="text-sm text-gray-500">@{member.username}</p>
                        )}
                        
                        {/* Badge Ruolo */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(member.role)}`}>
                            {getRoleIcon(member.role)}
                            {getRoleLabel(member.role)}
                          </span>
                        </div>
                      </div>

                      {/* Azioni */}
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.displayName)}
                            disabled={isProcessing}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Rimuovi"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'link' && isOwner && (
            <div className="space-y-4">
              {loadingLink ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-gray-600">Caricamento...</p>
                </div>
              ) : inviteLink ? (
                <>
                  {/* Link esistente */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Link2 size={20} className="text-blue-600 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">Link attivo</h3>
                        <p className="text-sm text-gray-600">
                          Condividi questo link per invitare persone al viaggio
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 mb-3 break-all text-sm font-mono text-gray-700 border border-blue-300">
                      {inviteLink}
                    </div>
                    
                    {linkExpiry && (
                      <p className="text-xs text-gray-600 mb-3">
                        Scade il {linkExpiry.toLocaleDateString('it-IT')} alle {linkExpiry.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyLink}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        {linkCopied ? (
                          <>
                            <Check size={18} />
                            Copiato!
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            Copia Link
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={handleGenerateLink}
                        disabled={generatingLink}
                        className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                        title="Genera nuovo link (invalida quello attuale)"
                      >
                        <RefreshCw size={18} className={generatingLink ? 'animate-spin' : ''} />
                        Rigenera
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Rigenerare il link invaliderà quello attuale. Il link può essere usato da più persone fino alla scadenza.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Nessun link attivo */}
                  <div className="text-center py-8">
                    <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                      <Link2 size={32} className="text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Nessun link attivo</h3>
                    <p className="text-gray-600 mb-6">
                      Genera un link per invitare persone senza richiedere il loro username
                    </p>
                    
                    <button
                      onClick={handleGenerateLink}
                      disabled={generatingLink}
                      className="py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {generatingLink ? (
                        <>
                          <RefreshCw size={20} className="animate-spin" />
                          Generazione...
                        </>
                      ) : (
                        <>
                          <Link2 size={20} />
                          Genera Link Invito
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Come funziona?</h4>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Il link è valido per 7 giorni</li>
                      <li>Può essere usato da più persone</li>
                      <li>Chi riceve il link entra automaticamente come Member</li>
                      <li>Puoi rigenerare il link quando vuoi</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};

export default TripMembersModal;