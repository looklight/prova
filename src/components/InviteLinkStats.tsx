// src/components/InviteLinkStats.tsx
import React, { useEffect, useState } from 'react';
import { getInviteLinkStats } from '../services/invites/linkInvites';
import { Users, Clock } from 'lucide-react';

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
      <div className="mt-4 p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!stats || stats.totalUses === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nessuno ha ancora usato questo link</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Utilizzo Link
        </h4>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
          {stats.totalUses} {stats.totalUses === 1 ? 'persona' : 'persone'}
        </span>
      </div>

      {/* Lista utenti */}
      <div className="space-y-3">
        {stats.users.map((user, index) => (
          <div 
            key={user.userId || index}
            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Avatar */}
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-lg">
                {user.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {user.displayName}
              </p>
              {user.username && (
                <p className="text-sm text-gray-500 truncate">
                  @{user.username}
                </p>
              )}
            </div>
            
            {/* Data */}
            {user.acceptedAt && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
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