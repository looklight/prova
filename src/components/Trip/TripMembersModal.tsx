import React, { useState, useEffect } from 'react';
import { Crown, Trash2, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { removeMember } from '../../services';
import { createMemberRemovedNotification } from '../../services/notifications/memberNotifications';
import { InviteOptionsModal } from '../Sharing';
import UserProfileModal from '../Profile/UserProfileModal';
import { Avatar } from '../ui';
import { colors, rawColors, gradients } from '../../styles/theme';

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

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
      // 1. Esegui rimozione DB
      await removeMember(trip.id, userId);
      console.log('✅ Membro rimosso:', userId);
      
      // 2. 🆕 Invia notifica al membro rimosso (DOPO successo operazione)
      await createMemberRemovedNotification(
        userId,
        trip.id,
        trip.name,
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          avatar: currentUser.photoURL
        }
      );
      
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
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                maxHeight: '80vh',
                backgroundColor: colors.bgCard
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${colors.border}` }}
              >
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: colors.text }}
                  >
                    Chi partecipa
                  </h2>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: colors.textMuted }}
                  >
                    {activeMembers.length} {activeMembers.length === 1 ? 'persona' : 'persone'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full transition-colors"
                  style={{ color: colors.textMuted }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-2">
                  {activeMembers.map(member => {
                    const isCurrentUser = member.userId === currentUser.uid;
                    const isProcessing = processingMember === member.userId;
                    const canManage = isOwner && !isCurrentUser && member.role !== 'owner';

                    return (
                      <div
                        key={member.userId}
                        className="rounded-xl p-3 transition-all"
                        style={{
                          backgroundColor: isCurrentUser ? colors.accentSoft : colors.bgSubtle,
                          border: isCurrentUser ? `2px solid ${colors.accent}` : 'none'
                        }}
                      >
                        <div className="flex items-center gap-3">

                          {/* Area cliccabile: Avatar + Info */}
                          <div
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                            onClick={() => setSelectedUserProfile(member.userId)}
                          >
                            {/* Avatar */}
                            <div className="relative">
                              <Avatar
                                src={member.avatar}
                                name={member.displayName}
                                size="md"
                              />
                              {/* Crown badge for owner */}
                              {member.role === 'owner' && (
                                <div
                                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white"
                                  style={{ backgroundColor: rawColors.warning }}
                                >
                                  <Crown size={10} style={{ color: rawColors.warningDark }} />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-semibold truncate"
                                style={{ color: colors.text }}
                              >
                                {member.displayName}
                              </p>
                              {member.username && (
                                <p
                                  className="text-sm truncate"
                                  style={{ color: colors.textMuted }}
                                >
                                  @{member.username}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Bottone Rimuovi */}
                          {canManage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMember(member.userId, member.displayName);
                              }}
                              disabled={isProcessing}
                              className="p-2 rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
                              style={{ color: colors.danger }}
                              title="Rimuovi"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-5 py-4 flex gap-3"
                style={{
                  borderTop: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgSubtle
                }}
              >
                {isOwner && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                    style={{ background: gradients.accent }}
                  >
                    <UserPlus size={18} />
                    Invita
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                  style={{
                    backgroundColor: colors.bgCard,
                    color: colors.textMuted
                  }}
                >
                  Chiudi
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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