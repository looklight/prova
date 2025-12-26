import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, AlertCircle, Check } from 'lucide-react';
import { searchUsersByUsername, inviteMemberByUsername } from '../../services';
import { Avatar } from '../ui';
import { colors, gradients } from '../../styles/theme';

interface UsernameSearchSectionProps {
  trip: any;
  currentUser: {
    uid: string;
    displayName: string;
    username?: string;
    photoURL?: string;
  };
}

const UsernameSearchSection: React.FC<UsernameSearchSectionProps> = ({ trip, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsersByUsername(searchTerm, 5);
        const filtered = results.filter(user => 
          user.uid !== currentUser.uid && 
          !trip.sharing.memberIds.includes(user.uid)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('❌ Errore ricerca:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, currentUser.uid, trip.sharing.memberIds]);

  const handleInvite = async () => {
    if (!selectedUser) return;

    const isOwner = trip.sharing?.members?.[currentUser.uid]?.role === 'owner';

    if (!isOwner) {
      setInviteError('Solo il proprietario può invitare altri utenti');
      return;
    }

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      await inviteMemberByUsername(
        trip.id,
        selectedUser.uid,
        {
          username: selectedUser.username,
          displayName: selectedUser.displayName,
          avatar: selectedUser.avatar
        },
        currentUser.uid
      );

      setInviteSuccess(true);
      setSelectedUser(null);
      setSearchTerm('');
      setSearchResults([]);
      setTimeout(() => setInviteSuccess(false), 2000);
    } catch (error) {
      console.error('❌ Errore invito:', error);
      const message = error?.message || String(error);
      setInviteError(message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      {inviteSuccess && (
        <div
          className="rounded-xl p-4 flex items-center"
          style={{ backgroundColor: colors.successSoft, border: `1px solid ${colors.success}` }}
        >
          <Check size={20} className="mr-3" style={{ color: colors.success }} />
          <span style={{ color: colors.success }}>Invito inviato con successo!</span>
        </div>
      )}

      {inviteError && (
        <div
          className="rounded-xl p-4 flex items-start"
          style={{ backgroundColor: colors.dangerSoft, border: `1px solid ${colors.danger}` }}
        >
          <AlertCircle size={20} className="mr-3 mt-0.5" style={{ color: colors.danger }} />
          <span style={{ color: colors.danger }}>{inviteError}</span>
        </div>
      )}

      <div className="relative">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per username..."
          className="w-full pl-10 pr-4 py-3 rounded-xl transition-colors"
          style={{
            backgroundColor: colors.bgSubtle,
            border: `1px solid ${colors.border}`,
            color: colors.text
          }}
        />
      </div>

      {searching && (
        <div className="text-center py-4" style={{ color: colors.textMuted }}>
          Ricerca in corso...
        </div>
      )}

      {!searching && searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map(user => (
            <div
              key={user.uid}
              onClick={() => setSelectedUser(user)}
              className="p-3 rounded-xl cursor-pointer transition-all"
              style={{
                backgroundColor: selectedUser?.uid === user.uid ? colors.accentSoft : colors.bgSubtle,
                border: selectedUser?.uid === user.uid ? `2px solid ${colors.accent}` : '2px solid transparent'
              }}
            >
              <div className="flex items-center">
                <Avatar
                  src={user.avatar}
                  name={user.displayName}
                  size="sm"
                  className="mr-3"
                />
                <div>
                  <div className="font-semibold" style={{ color: colors.text }}>{user.displayName}</div>
                  <div className="text-sm" style={{ color: colors.textMuted }}>@{user.username}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && searchTerm.length >= 2 && searchResults.length === 0 && (
        <div className="text-center py-8" style={{ color: colors.textMuted }}>
          Nessun utente trovato
        </div>
      )}

      {selectedUser && (
        <button
          onClick={handleInvite}
          disabled={inviting || !selectedUser}
          className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: gradients.accent }}
        >
          {inviting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Invio in corso...
            </>
          ) : (
            <>
              <UserPlus size={20} />
              Invita {selectedUser.displayName}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default UsernameSearchSection;