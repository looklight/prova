import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinViaShareLink } from '../services';
import { Loader } from 'lucide-react';

interface JoinTripPageProps {
  currentUser: {
    uid: string;
    displayName: string;
    email?: string;
    photoURL?: string;
  };
  userProfile: {
    uid: string;
    displayName: string;
    username?: string;
    avatar?: string;
  } | null;
}

const JoinTripPage: React.FC<JoinTripPageProps> = ({ currentUser, userProfile }) => {
  const { tripId, linkId } = useParams<{ tripId: string; linkId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [error, setError] = useState<string | null>(null);
  const [tripData, setTripData] = useState<any>(null);

  useEffect(() => {
    handleJoin();
  }, []);

  const handleJoin = async () => {
    if (!tripId || !linkId) {
      setStatus('error');
      setError('Link non valido: parametri mancanti');
      return;
    }

    if (!userProfile) {
      setStatus('error');
      setError('Profilo utente non caricato');
      return;
    }

    try {
      setStatus('validating');
      
      console.log('🔗 Tentativo join via link:', { tripId, linkId, userId: currentUser.uid });
      
      // Valida e unisciti al viaggio
      const trip = await joinViaShareLink(tripId, linkId, currentUser.uid, userProfile);
      
      console.log('✅ Join completato:', trip);
      
      setTripData(trip);
      setStatus('success');
      
      // Redirect al viaggio dopo 2 secondi
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Errore join via link:', err);
      
      // Se già membro, tratta come successo
      if (err.message?.includes('già membro')) {
        console.log('ℹ️ Utente già membro, redirect diretto');
        setStatus('success');
        setTripData({ metadata: { name: 'il viaggio' } });
        setTimeout(() => navigate('/'), 1500);
      } else {
        setStatus('error');
        setError(err.message || 'Errore sconosciuto');
      }
    }
  };

  // LOADING STATE
  if (status === 'validating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Validazione invito...
          </h2>
          <p className="text-gray-600">Verifica del link in corso</p>
        </div>
      </div>
    );
  }

  // SUCCESS STATE
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <span className="text-5xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Benvenuto nel viaggio!
          </h2>
          <p className="text-gray-600 mb-2">
            Ti sei unito con successo a
          </p>
          <p className="text-xl font-semibold text-blue-600 mb-6">
            {tripData?.metadata?.name || tripData?.name || 'il viaggio'}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader className="animate-spin" size={16} />
            <span>Reindirizzamento alla home...</span>
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Ops! Qualcosa è andato storto
          </h2>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium text-sm">
              {error}
            </p>
          </div>
          
          {/* Suggerimenti in base all'errore */}
          {error?.includes('scaduto') && (
            <p className="text-sm text-gray-600 mb-6">
              💡 Chiedi all'organizzatore di generare un nuovo link di invito
            </p>
          )}
          {error?.includes('non valido') && (
            <p className="text-sm text-gray-600 mb-6">
              💡 Verifica di aver copiato correttamente l'intero link
            </p>
          )}
          {error?.includes('disattivato') && (
            <p className="text-sm text-gray-600 mb-6">
              💡 Questo link è stato disattivato dall'organizzatore
            </p>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default JoinTripPage;