import React, { useEffect, useState } from 'react';
import { getInviteLinkStats } from '../../services/invites/linkInvites';
import { Users, Clock } from 'lucide-react';
import { Avatar } from '../ui';
import { colors } from '../../styles/theme';

// Funzione per formattare tempo relativo
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    anno: 31536000,
    mese: 2592000,
    settimana: 604800,
    giorno: 86400,
    ora: 3600,
    minuto: 60
  };
  
  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${name}${interval > 1 ? (name === 'mese' ? 'i' : name === 'ora' ? 'e' : 'i') : ''} fa`;
    }
  }
  
  return 'proprio ora';
};

export default function InviteLinkStats({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setStats(null);
      setLoading(false);
      return;
    }

    const loadStats = async () => {
      setLoading(true);
      const data = await getInviteLinkStats(token);
      setStats(data);
      setLoading(false);
    };

    loadStats();
  }, [token]);

  if (loading) {
    return (
      <div
        className="mt-4 p-4 rounded-lg animate-pulse"
        style={{ backgroundColor: colors.bgSubtle }}
      >
        <div className="h-4 rounded w-1/3 mb-3" style={{ backgroundColor: colors.border }}></div>
        <div className="h-8 rounded" style={{ backgroundColor: colors.border }}></div>
      </div>
    );
  }

  if (!stats || stats.totalUses === 0) {
    return (
      <div
        className="mt-4 p-4 rounded-lg text-center"
        style={{ backgroundColor: colors.bgSubtle, color: colors.textMuted }}
      >
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nessuno ha ancora usato questo link</p>
      </div>
    );
  }

  return (
    <div
      className="mt-4 p-4 rounded-lg"
      style={{ backgroundColor: colors.accentSoft, border: `1px solid ${colors.accent}20` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2" style={{ color: colors.text }}>
          <Users className="w-5 h-5" style={{ color: colors.accent }} />
          Utilizzo Link
        </h4>
        <span
          className="px-3 py-1 text-sm font-medium rounded-full"
          style={{ backgroundColor: colors.accent, color: 'white' }}
        >
          {stats.totalUses} {stats.totalUses === 1 ? 'persona' : 'persone'}
        </span>
      </div>

      {/* Lista utenti */}
      <div className="space-y-3">
        {stats.users.map((user, index) => (
          <div
            key={user.userId || index}
            className="flex items-center gap-3 p-3 rounded-lg shadow-sm transition-shadow"
            style={{ backgroundColor: colors.bgCard }}
          >
            {/* Avatar */}
            <Avatar
              src={user.avatar}
              name={user.displayName || 'Utente'}
              size="sm"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: colors.text }}>
                {user.displayName}
              </p>
              {user.username && (
                <p className="text-sm truncate" style={{ color: colors.textMuted }}>
                  @{user.username}
                </p>
              )}
            </div>

            {/* Data */}
            {user.acceptedAt && (
              <div className="flex items-center gap-1 text-xs" style={{ color: colors.textMuted }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{getTimeAgo(user.acceptedAt)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}