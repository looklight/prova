import React, { useState } from 'react';
import { X, User, Crown, Trash2 } from 'lucide-react';
import { removeMember } from '../services/tripService';

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
          role: 'owner' | 'member'; // ⭐ CORRETTO: 'member' invece di 'editor'
          status: 'active' | 'invited' | 'removed';
          joinedAt: Date;
          displayName: string;
          username?: string;
          avatar?: string;
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
  const [processingMember, setProcessingMember] = useState<string | null>(null);

  if (!isOpen) return null;

  // Ottieni info utente corrente
  const currentUserRole = trip.sharing.members[currentUser.uid]?.role;
  const isOwner = currentUserRole === 'owner';

  // Lista membri attivi ordinati: owner prima, poi altri
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

  // Rimuovi membro
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

  // Icona ruolo
  const getRoleIcon = (role: string) => {
    if (role === 'owner') {
      return <Crown size={16} className="text-yellow-600" />;
    }
    return null;
  };

  // Label ruolo tradotta
  const getRoleLabel = (role: string) => {
    if (role === 'owner') {
      return 'Owner';
    }
    return 'Member';
  };

  // Colore badge ruolo
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
              Membri
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

        {/* Lista Membri */}
        <div className="flex-1 overflow-y-auto p-6">
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
                        
                        {member.role === 'owner' && (
                          <span className="text-xs text-gray-500">• Proprietario</span>
                        )}
                      </div>
                    </div>

                    {/* Azioni (solo se owner e non sei tu) */}
                    {canManage && (
                      <div className="flex gap-2">
                        {/* Rimuovi */}
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