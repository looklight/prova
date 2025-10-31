import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Link as LinkIcon, Copy, Check, UserPlus, AlertCircle, Clock } from 'lucide-react';
import { 
  searchUsersByUsername, 
  inviteMemberByUsername,
  generateShareLink,
  disableShareLink 
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
  const [activeTab, setActiveTab] = useState('username');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // ⭐ FIX: shareLink è il full URL, non un oggetto
  const [shareLink, setShareLink] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const searchTimeoutRef = useRef(null);

  // Reset della ricerca / selezione quando la modale viene chiusa
  const resetSearchState = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedUser(null);
    setSearching(false);
    setInviteError(null);
    setInviteSuccess(false);
  };

  // Wrap onClose per resettare lo stato prima di chiudere
  const handleClose = () => {
    resetSearchState();
    onClose();
  };

  // Se la modale viene chiusa dall'esterno (isOpen cambia), assicuriamoci di resettare
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

  // Utility: trova il possibile owner nel trip
  const getTripOwnerCandidate = () => {
    return (
      trip?.ownerId ??
      trip?.ownerUid ??
      trip?.createdBy ??
      trip?.sharing?.ownerId ??
      trip?.sharing?.ownerUid ??
      null
    );
  };

  const handleInvite = async () => {
    if (!selectedUser) return;

    const clientOwnerId = getTripOwnerCandidate();
    console.log('DEBUG invite attempt', {
      currentUserUid: currentUser?.uid,
      tripId: trip?.id,
      clientOwnerId,
      selectedUserUid: selectedUser?.uid,
    });

    if (clientOwnerId && String(clientOwnerId) !== String(currentUser?.uid)) {
      const msg = 'Solo il proprietario può invitare altri utenti';
      console.warn('Invite blocked client-side:', { msg, currentUserUid: currentUser?.uid, clientOwnerId });
      setInviteError(msg);
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
      console.error('❌ Errore invito (raw):', error);
      const message =
        error?.message ||
        error?.response?.data?.message ||
        error?.response?.data ||
        JSON.stringify(error);
      setInviteError(String(message));
    } finally {
      setInviting(false);
    }
  };

  // ⭐ FIX: Genera link con formato corretto /join/:tripId/:linkId
  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      console.log('🔗 Generazione link condivisione...');
      const linkUrl = await generateShareLink(trip.id, currentUser.uid);
      console.log('✅ Link generato:', linkUrl);
      setShareLink(linkUrl); // ⭐ Salva l'URL completo
    } catch (error) {
      console.error('❌ Errore generazione link:', error);
      alert('Errore nella generazione del link');
    } finally {
      setGenerating(false);
    }
  };

  const handleDisableLink = async () => {
    if (!confirm('Disattivare il link di condivisione? Nessuno potrà più usarlo.')) return;
    try {
      await disableShareLink(trip.id, currentUser.uid);
      setShareLink(null);
    } catch (error) {
      console.error('❌ Errore disattivazione link:', error);
      alert('Errore nella disattivazione del link');
    }
  };

  // ⭐ FIX: Copia il link corretto
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('username')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'username'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search size={18} className="inline mr-2" />
            Cerca Username
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'link'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LinkIcon size={18} className="inline mr-2" />
            Link Condivisione
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'username' && (
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
          )}

          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* ⭐ Info migliorata */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <LinkIcon size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Link di Condivisione</p>
                  <p className="text-sm text-blue-800">
                    Crea un link che chiunque può usare per unirsi al viaggio come <strong>Member</strong>.
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-blue-700">
                    <Clock size={14} />
                    <span>Il link scade automaticamente dopo <strong>7 giorni</strong></span>
                  </div>
                </div>
              </div>

              {/* ⭐ FIX: Check se shareLink esiste (è stringa URL) */}
              {!shareLink ? (
                <button
                  onClick={handleGenerateLink}
                  disabled={generating}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generazione...
                    </>
                  ) : (
                    <>
                      <LinkIcon size={20} />
                      Genera Link di Condivisione
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  {/* ⭐ Box link migliorato */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-900">Link Attivo</p>
                        <p className="text-xs text-green-700">Condividi questo link con chi vuoi invitare</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono text-gray-700"
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`px-4 py-2 rounded font-medium transition-all flex items-center gap-2 ${
                          copied 
                            ? 'bg-green-600 text-white' 
                            : 'bg-white text-green-700 border-2 border-green-300 hover:bg-green-50'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={18} />
                            Copiato!
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            Copia
                          </>
                        )}
                      </button>
                    </div>

                    {/* ⭐ Info expiration migliorata */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-green-700">
                        <UserPlus size={14} />
                        <span>Ruolo: <strong>Member</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-green-700">
                        <Clock size={14} />
                        <span>Scade il: <strong>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT')}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* ⭐ Pulsante disattiva migliorato */}
                  <button
                    onClick={handleDisableLink}
                    className="w-full bg-white text-red-600 py-2.5 rounded-lg font-medium hover:bg-red-50 transition-colors border-2 border-red-200 flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Disattiva Link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {activeTab === 'username' && selectedUser && (
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