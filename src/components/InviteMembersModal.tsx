import React, { useState, useEffect, useRef } from 'react';
import { X, Search, UserPlus, AlertCircle, Check } from 'lucide-react';
import { 
  searchUsersByUsername, 
  inviteMemberByUsername
} from '../services';

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  currentUser: {
    uid: string;
    displayName: string;
    username?: string;
    photoURL?: string;
  };
}

const InviteMembersModal: React.FC<InviteMembersModalProps> = ({ isOpen, onClose, trip, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const searchTimeoutRef = useRef(null);

  const resetSearchState = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedUser(null);
    setSearching(false);
    setInviteError(null);
    setInviteSuccess(false);
  };

  const handleClose = () => {
    resetSearchState();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      resetSearchState();
    }
  }, [isOpen]);

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

    // ✅ Check owner diretto dalla struttura sharing
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Invita Collaboratori</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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
          </div>
        </div>

        {selectedUser && (
          <div className="border-t p-6 bg-gray-50">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteMembersModal;