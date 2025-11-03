import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, User, Clock, AlertCircle, Loader, Check } from 'lucide-react';
import { getInviteDetails, acceptInviteLink } from '../services/invites/linkInvites';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface InviteHandlerProps {
  userProfile?: {
    uid: string;
    displayName: string;
    username?: string;
    avatar?: string;
  };
}

interface InviteDetails {
  token: string;
  tripId: string;
  tripName: string;
  tripImage?: string | null;
  invitedBy: string;
  invitedByName: string;
  createdAt: Date;
  expiresAt: Date;
  status: string;
  usedBy: string[];
}

const InviteHandler: React.FC<InviteHandlerProps> = ({ userProfile }) => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Listener auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Carica dettagli invito
  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError('Link invito non valido');
        setLoading(false);
        return;
      }

      try {
        const details = await getInviteDetails(token);
        setInvite(details as InviteDetails);
        setError(null);
      } catch (err: any) {
        console.error('❌ Errore caricamento invito:', err);
        setError(err.message || 'Link invito non valido o scaduto');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  // Se utente non loggato, salva token e redirect a login
  useEffect(() => {
    if (!loading && !user && token) {
      console.log('🔐 Utente non loggato, salvo token per dopo login...');
      sessionStorage.setItem('inviteToken', token);
      sessionStorage.setItem('redirectAfterLogin', `/invite/${token}`);
    }
  }, [loading, user, token]);

  // Accetta invito
  const handleAcceptInvite = async () => {
    if (!user || !userProfile || !token) return;

    setAccepting(true);
    setError(null);

    try {
      const result = await acceptInviteLink(token, user.uid, userProfile);
      
      console.log('✅ Invito accettato:', result.tripName);
      
      // Redirect al viaggio dopo 1 secondo
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Errore accettazione:', err);
      setError(err.message || 'Errore durante l\'accettazione dell\'invito');
      setAccepting(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento invito...</p>
        </div>
      </div>
    );
  }

  // Errore
  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Link non valido</h2>
            <p className="text-gray-600">{error || 'Questo link invito non è valido o è scaduto.'}</p>
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
          >
            Vai alla Home
          </button>
        </div>
      </div>
    );
  }

  // Utente non loggato
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mb-4">
              <MapPin size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Sei stato invitato!</h2>
            <p className="text-gray-600">
              <span className="font-semibold">{invite.invitedByName}</span> ti ha invitato a unirti al viaggio:
            </p>
          </div>

          {/* Anteprima viaggio */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              {invite.tripImage ? (
                <img
                  src={invite.tripImage}
                  alt={invite.tripName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <MapPin size={28} className="text-white" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-gray-800">{invite.tripName}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>Scade il {invite.expiresAt.toLocaleDateString('it-IT')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-center text-gray-600 text-sm">
              Effettua il login o crea un account per accettare l'invito
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              Login / Registrati
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Utente loggato - può accettare
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mb-4">
            <MapPin size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invito al viaggio</h2>
          <p className="text-gray-600">
            <span className="font-semibold">{invite.invitedByName}</span> ti ha invitato!
          </p>
        </div>

        {/* Anteprima viaggio */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            {invite.tripImage ? (
              <img
                src={invite.tripImage}
                alt={invite.tripName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <MapPin size={28} className="text-white" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-800">{invite.tripName}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock size={14} />
                <span>Scade il {invite.expiresAt.toLocaleDateString('it-IT')}</span>
              </div>
            </div>
          </div>
          
          {/* Info utente che accetta */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={16} />
              <span>Entrerai come: <span className="font-semibold">{userProfile?.displayName}</span></span>
            </div>
          </div>
        </div>

        {/* Errore */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Successo */}
        {accepting && !error && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check size={20} className="text-green-500" />
            <p className="text-sm text-green-700">Invito accettato! Reindirizzamento...</p>
          </div>
        )}

        {/* Azioni */}
        <div className="space-y-3">
          <button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {accepting ? (
              <>
                <Loader size={20} className="animate-spin" />
                Accettazione...
              </>
            ) : (
              <>
                <Check size={20} />
                Accetta Invito
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/')}
            disabled={accepting}
            className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteHandler;