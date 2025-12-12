import React from 'react';
import { X, MapPin } from 'lucide-react';
import type { Waypoint } from './ui/WaypointsModal';

interface WaypointsCardProps {
  waypoints: Waypoint[];
  onClick: () => void;
  onRemove: () => void;
}

/**
 * Card per visualizzare le tappe nella griglia media.
 * Mostra una preview compatta del percorso.
 */
const WaypointsCard: React.FC<WaypointsCardProps> = ({
  waypoints,
  onClick,
  onRemove
}) => {
  // Filtra waypoints con nome
  const validWaypoints = waypoints.filter(w => w.name.trim() !== '');

  // Conta quanti hanno geotag
  const withLocation = validWaypoints.filter(w => w.location?.coordinates).length;

  if (validWaypoints.length === 0) return null;

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all w-full aspect-square overflow-hidden border border-cyan-100 group"
    >
      {/* Header compatto */}
      <div className="flex items-center mb-0.5">
        <span className="text-[10px] font-semibold text-cyan-700">
          {validWaypoints.length} {validWaypoints.length === 1 ? 'tappa' : 'tappe'}
        </span>
      </div>

      {/* Lista tappe - compatta */}
      <div className="flex-1 overflow-hidden">
        <div className="space-y-0.5">
          {validWaypoints.slice(0, 4).map((waypoint) => (
            <div
              key={waypoint.id}
              className="flex items-center text-[10px] gap-0.5"
            >
              {/* MapPin compatto */}
              <MapPin
                size={9}
                className={
                  waypoint.location?.coordinates
                    ? "text-red-400 flex-shrink-0"
                    : "text-gray-300 flex-shrink-0"
                }
              />

              {/* Nome - sfrutta tutta la larghezza */}
              <span
                className="text-gray-700 truncate leading-tight"
                style={{ maxWidth: 'calc(100% - 12px)' }}
              >
                {waypoint.name}
              </span>
            </div>
          ))}

          {/* Indicatore se ci sono più tappe */}
          {validWaypoints.length > 4 && (
            <div className="text-[9px] text-cyan-500 font-medium pl-2.5">
              +{validWaypoints.length - 4} altre
            </div>
          )}
        </div>
      </div>

      {/* Icona decorativa in basso a destra */}
      <div className="absolute bottom-1.5 right-1.5">
        <MapPin size={11} className="text-cyan-400 opacity-50" />
      </div>

      {/* Pulsante rimozione */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 text-cyan-700 hover:text-cyan-900 transition-colors md:opacity-0 md:group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default WaypointsCard;