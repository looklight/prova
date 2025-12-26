import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, Trash2, AlertCircle, Check, Loader } from 'lucide-react';
import {
  generateInviteLink,
  getActiveInviteLink,
  invalidateInviteLink
} from '../../services';
import InviteLinkStats from './InviteLinkStats';
import { colors, gradients } from '../../styles/theme';

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

  const handleCopyLink = async () => {
    if (!activeLink) return;

    const fullUrl = activeLink.url || `${window.location.origin}/invite/${activeLink.token}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback per browser che non supportano clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('❌ Errore copia link:', fallbackErr);
        setError('Impossibile copiare il link. Copialo manualmente.');
      }
    }
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
        <Loader size={32} className="animate-spin" style={{ color: colors.accent }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-xl p-4 flex items-start"
          style={{ backgroundColor: colors.dangerSoft, border: `1px solid ${colors.danger}` }}
        >
          <AlertCircle size={20} className="mr-3 mt-0.5" style={{ color: colors.danger }} />
          <span style={{ color: colors.danger }}>{error}</span>
        </div>
      )}

      {activeLink ? (
        <>
          {/* Link Attivo */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: colors.accentSoft }}
          >
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon size={20} style={{ color: colors.accent }} />
              <h3 className="font-semibold" style={{ color: colors.text }}>Link Invito Attivo</h3>
            </div>

            <div
              className="rounded-lg p-3 mb-3 break-all text-sm font-mono"
              style={{ backgroundColor: colors.bgCard, color: colors.textMuted }}
            >
              {activeLink.url || `${window.location.origin}/invite/${activeLink.token}`}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: copied ? colors.success : gradients.accent,
                  transform: copied ? 'scale(1.02)' : 'scale(1)'
                }}
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

              <button
                onClick={handleRevokeLink}
                className="px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: colors.dangerSoft,
                  color: colors.danger
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="mt-3 text-xs" style={{ color: colors.textMuted }}>
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
          <div
            className="inline-block p-4 rounded-full mb-4"
            style={{ backgroundColor: colors.bgSubtle }}
          >
            <LinkIcon size={32} style={{ color: colors.textMuted }} />
          </div>
          <p className="mb-6" style={{ color: colors.textMuted }}>
            Nessun link invito attivo.<br />
            Genera un link per condividerlo.
          </p>

          <button
            onClick={handleGenerateLink}
            disabled={generating}
            className="py-3 px-6 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            style={{ background: gradients.accent }}
          >
            {generating ? (
              <>
                <Loader size={20} className="animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <LinkIcon size={20} />
                Genera Link
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default InviteLinkSection;