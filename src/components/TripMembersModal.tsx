import React, { useState } from 'react';
import { X, User, Crown, Trash2, UserPlus } from 'lucide-react';
import { removeMember } from '../services/tripService';
import InviteOptionsModal from './InviteOptionsModal';
import UserProfileModal from './Profile/UserProfileModal';
import Avatar from './Avatar';

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
    username?: string;
    photoURL?: string;
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
  const [processingMember, setProcessingMember] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);

  const isOwner = trip.sharing.members[currentUser.uid]?.role === 'owner';

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

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <User size={24} />
                Partecipanti
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {activeMembers.map(member => {
                const isCurrentUser = member.userId === currentUser.uid;
                const isProcessing = processingMember === member.userId;
                const canManage = isOwner && !isCurrentUser && member.role !== 'owner';

                return (
                  <div
                    key={member.userId}
                    className={`border-2 rounded-lg p-3 transition-all ${
                      isCurrentUser 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      
                      {/* Area cliccabile: Avatar + Info */}
                      <div 
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedUserProfile(member.userId)}
                      >
                        {/* Avatar */}
                        <Avatar 
                          src={member.avatar} 
                          name={member.displayName} 
                          size="md"
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Riga 1: Nome + Badge Owner inline */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-gray-900 truncate">
                              {member.displayName}
                            </p>
                            {member.role === 'owner' && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1">
                                <Crown size={12} />
                                Owner
                              </span>
                            )}
                          </div>
                          
                          {/* Riga 2: Username */}
                          {member.username && (
                            <p className="text-sm text-gray-500 truncate">@{member.username}</p>
                          )}
                        </div>
                      </div>

                      {/* Bottone Rimuovi - FUORI dall'area cliccabile */}
                      {canManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // ← Blocca l'apertura del profilo
                            handleRemoveMember(member.userId, member.displayName);
                          }}
                          disabled={isProcessing}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Rimuovi"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bottone Invita Membri - Stile moderno */}
              {isOwner && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium mt-4 shadow-sm"
                >
                  <UserPlus size={20} />
                  Invita
                </button>
              )}
            </div>
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

      {/* Modal Invita Membri Unificato */}
      <InviteOptionsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        trip={trip}
        currentUser={currentUser}
      />

      {/* Modal Profilo Utente */}
      {selectedUserProfile && (() => {
        const memberData = activeMembers.find(m => m.userId === selectedUserProfile);
        return (
          <UserProfileModal
            isOpen={true}
            onClose={() => setSelectedUserProfile(null)}
            userId={selectedUserProfile}
            tripContext={memberData ? {
              role: memberData.role,
              joinedAt: memberData.joinedAt,
              displayName: memberData.displayName,
              username: memberData.username,
              avatar: memberData.avatar
            } : undefined}
          />
        );
      })()}
    </>
  );
};

export default TripMembersModal;