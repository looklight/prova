import React from 'react';
import { MapPin, Wallet, ChevronRight } from 'lucide-react';
import { MembersAvatarStack } from '../Sharing';
import { rawColors, glowShadows } from '../../styles/theme';
import { getActivityTypeConfig } from '../../utils/activityTypes';
import type { CurrentTripInfo, TransportActivity } from '../../utils/tripStatusUtils';

interface TripMember {
  userId: string;
  displayName?: string;
  avatar?: string | null;
  status: 'active' | 'left' | 'removed';
}

interface CurrentTripCardProps {
  tripInfo: CurrentTripInfo;
  members: TripMember[];
  onOpenTrip: (tripId: string | number, options?: { dayIndex?: number; defaultTab?: string }) => void;
  onShowMembers: (trip: CurrentTripInfo['trip']) => void;
}

// Helper per formattare l'orario
const formatTime = (transport: TransportActivity): string => {
  const time = transport.departure?.time || transport.startTime;
  return time || '';
};

// Helper per ottenere la descrizione del trasporto
const getTransportDescription = (transport: TransportActivity): string => {
  if (transport.departure?.location?.name && transport.arrival?.location?.name) {
    return `${transport.departure.location.name} → ${transport.arrival.location.name}`;
  }
  return transport.title || '';
};

const CurrentTripCard: React.FC<CurrentTripCardProps> = ({
  tripInfo,
  members,
  onOpenTrip,
  onShowMembers
}) => {
  const { trip, currentDayIndex, destination, expensesToDate, totalDays, transports } = tripInfo;

  const handleCardClick = () => {
    onOpenTrip(trip.id, { dayIndex: currentDayIndex });
  };

  const handleExpensesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenTrip(trip.id, { dayIndex: currentDayIndex, defaultTab: 'expenses' });
  };

  const handleMembersClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowMembers(trip);
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform mb-4"
      style={{
        boxShadow: glowShadows.cardSelected,
        border: `2px solid ${rawColors.accent}`
      }}
      onClick={handleCardClick}
    >
      {/* Immagine grande */}
      <div className="relative h-40">
        {trip.image ? (
          <img
            src={trip.image}
            alt={trip.name || 'Viaggio'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${rawColors.accent} 0%, ${rawColors.accentDark} 100%)`
            }}
          >
            <MapPin size={48} className="text-white/80" />
          </div>
        )}

        {/* Badge "In corso" */}
        <div
          className="absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: rawColors.accent }}
          >
            In corso
          </span>
        </div>

        {/* Giorno corrente - in alto a destra */}
        <div
          className="absolute top-3 right-3 px-3 py-1.5 rounded-full backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <span className="text-sm font-medium text-white">
            Giorno {currentDayIndex + 1} di {totalDays}
          </span>
        </div>

        {/* Membri - in basso a destra sopra la foto */}
        {members.length > 0 && (
          <div
            className="absolute bottom-3 right-3 px-2 py-1.5 rounded-full backdrop-blur-sm cursor-pointer"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
            onClick={handleMembersClick}
          >
            <MembersAvatarStack
              members={members}
              maxVisible={4}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Contenuto */}
      <div className="p-4">
        {/* Nome viaggio */}
        <h3 className="text-2xl font-bold text-gray-800 truncate">
          {trip.name || 'Viaggio senza nome'}
        </h3>

        {/* Destinazione con "Oggi:" */}
        {destination && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-medium text-gray-400">Oggi:</span>
            <MapPin size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600 truncate">
              {destination}
            </span>
          </div>
        )}

        {/* Trasporti del giorno */}
        {transports.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {transports.slice(0, 2).map((transport) => {
              const config = getActivityTypeConfig(transport.type);
              const IconComponent = config.icon;
              const time = formatTime(transport);
              const description = getTransportDescription(transport);

              return (
                <div
                  key={transport.id}
                  className="flex items-center gap-2"
                >
                  {IconComponent && (
                    <IconComponent size={16} className="flex-shrink-0" style={{ color: config.color }} />
                  )}
                  {time && (
                    <span className="text-xs font-medium text-gray-500 flex-shrink-0">
                      {time}
                    </span>
                  )}
                  <span className="text-sm text-gray-600 truncate">
                    {description}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Sezione spese - cliccabile */}
        <button
          onClick={handleExpensesClick}
          className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl w-full transition-colors"
          style={{ backgroundColor: rawColors.accentSoft }}
        >
          <Wallet size={18} style={{ color: rawColors.accent }} />
          <span
            className="text-sm font-medium"
            style={{ color: rawColors.accentDark }}
          >
            Spese finora
          </span>
          <span
            className="ml-auto font-bold text-base"
            style={{ color: rawColors.accent }}
          >
            {expensesToDate.toFixed(2)} €
          </span>
          <ChevronRight size={18} style={{ color: rawColors.accent }} />
        </button>
      </div>
    </div>
  );
};

export default CurrentTripCard;
