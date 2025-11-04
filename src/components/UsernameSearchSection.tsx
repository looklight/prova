import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, AlertCircle, Check } from 'lucide-react';
import { searchUsersByUsername, inviteMemberByUsername } from '../services';

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
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <Check size={20} className="text-green-600 mr-3" />
          <span className="text-green-800">Invito inviato con successo!</span>
        </div>
      )}

      {inviteError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle size={20} className="text-red-600 mr-3 mt-0.5" />
          <span className="text-red-800">{inviteError}</span>
        </div>
      )}

      <div className="relative">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per username..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {searching && <div className="text-center py-4 text-gray-500">Ricerca in corso...</div>}

      {!searching && searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map(user => (
            <div
              key={user.uid}
              onClick={() => setSelectedUser(user)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedUser?.uid === user.uid
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full mr-3" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <span className="text-gray-600 font-semibold">{user.displayName[0].toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-800">{user.displayName}</div>
                  <div className="text-sm text-gray-500">@{user.username}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && searchTerm.length >= 2 && searchResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">Nessun utente trovato</div>
      )}

      {selectedUser && (
        <button
          onClick={handleInvite}
          disabled={inviting || !selectedUser}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {inviting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Invio in corso...
            </>
          ) : (
            <>
              <UserPlus size={20} />
              Invia Invito a {selectedUser.displayName}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default UsernameSearchSection;