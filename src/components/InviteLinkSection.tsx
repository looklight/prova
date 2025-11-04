import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, Trash2, AlertCircle, Check, Loader } from 'lucide-react';
import { 
  generateInviteLink, 
  getActiveInviteLink, 
  invalidateInviteLink 
} from '../services';
import InviteLinkStats from './InviteLinkStats';

interface InviteLinkSectionProps {
  trip: any;
  currentUser: {
    uid: string;
    displayName: string;
    username?: string;
    photoURL?: string;
  };
}

const InviteLinkSection: React.FC<InviteLinkSectionProps> = ({ trip, currentUser }) => {
  const [activeLink, setActiveLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Carica link attivo
  useEffect(() => {
    loadActiveLink();
  }, [trip.id]);

  const loadActiveLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const link = await getActiveInviteLink(trip.id);
      setActiveLink(link);
    } catch (err) {
      console.error('❌ Errore caricamento link:', err);
      setError('Errore nel caricamento del link');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    const isOwner = trip.sharing?.members?.[currentUser.uid]?.role === 'owner';
    
    if (!isOwner) {
      setError('Solo il proprietario può generare link invito');
      return;
    }

    setGenerating(true);
    setError(null);
    
    try {
      const token = await generateInviteLink(trip.id, currentUser.uid);
      const fullUrl = `${window.location.origin}/invite/${token}`;
      
      const newLink = {
        token,
        url: fullUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };
      
      setActiveLink(newLink);
    } catch (err) {
      console.error('❌ Errore generazione link:', err);
      setError(err.message || 'Errore nella generazione del link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!activeLink) return;
    
    const fullUrl = activeLink.url || `${window.location.origin}/invite/${activeLink.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevokeLink = async () => {
    if (!activeLink) return;
    
    if (!confirm('Vuoi revocare questo link? Non sarà più utilizzabile.')) {
      return;
    }

    try {
      await invalidateInviteLink(activeLink.token);
      setActiveLink(null);
    } catch (err) {
      console.error('❌ Errore revoca link:', err);
      setError('Errore nella revoca del link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle size={20} className="text-red-600 mr-3 mt-0.5" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {activeLink ? (
        <>
          {/* Link Attivo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon size={20} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Link Invito Attivo</h3>
            </div>
            
            <div className="bg-white rounded-lg p-3 mb-3 break-all text-sm text-gray-700 font-mono">
              {activeLink.url || `${window.location.origin}/invite/${activeLink.token}`}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
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
                onClick={handleRevokeLink}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <Trash2 size={18} />
                Revoca
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Scade il {activeLink.expiresAt.toLocaleDateString('it-IT')} alle{' '}
              {activeLink.expiresAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Statistiche */}
          <InviteLinkStats token={activeLink.token} />
        </>
      ) : (
        /* Nessun Link Attivo */
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
            <LinkIcon size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-600 mb-6">
            Nessun link invito attivo.<br />
            Genera un link per condividerlo con altri utenti.
          </p>
          
          <button
            onClick={handleGenerateLink}
            disabled={generating}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
          >
            {generating ? (
              <>
                <Loader size={20} className="animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <LinkIcon size={20} />
                Genera Link Invito
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default InviteLinkSection;