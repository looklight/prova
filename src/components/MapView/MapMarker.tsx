import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { MapPin } from './mapUtils';

interface MapMarkerProps {
    pin: MapPin;
    onNavigateToDay?: (dayIndex: number) => void;
}

/**
 * Crea un'icona Leaflet custom a forma di goccia/pin
 * - Punta in basso che indica la coordinata
 * - Cerchio in alto con numero o emoji
 * - Colore basato sulla categoria
 */
const createPinIcon = (pin: MapPin, isBed: boolean): L.DivIcon => {
    const size = 40;
    const circleSize = 28;
    const hasIcon = !!pin.icon;

    const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size + 12}px;
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      <!-- Cerchio principale -->
      <div style="
        width: ${circleSize}px;
        height: ${circleSize}px;
        background-color: ${isBed ? 'white' : pin.color};
        border: 3px solid ${isBed ? pin.color : 'white'};
        border-radius: 50%;
        box-shadow: ${isBed
          ? '0 4px 10px rgba(79,70,229,0.35)'
          : '0 2px 8px rgba(0,0,0,0.3)'
        };
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
      ">
        ${hasIcon
          ? `<span style="font-size: 16px; line-height: 1;">${pin.icon}</span>`
          : `<span style="
              font-size: 13px;
              font-weight: bold;
              color: white;
              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            ">${pin.order}</span>`
        }
      </div>

      <!-- Punta del pin -->
      <div style="
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 12px solid ${pin.color};
        margin-top: -2px;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
        position: relative;
        z-index: 1;
      "></div>

      <!-- Badge numero (solo se ha icona e non è letto) -->
      ${hasIcon && !isBed ? `
        <div style="
          position: absolute;
          top: -4px;
          right: 2px;
          width: 18px;
          height: 18px;
          background-color: white;
          border: 2px solid ${pin.color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: ${pin.color};
          z-index: 3;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        ">
          ${pin.order}
        </div>
      ` : ''}
    </div>
  `;

    return L.divIcon({
        html,
        className: 'custom-map-pin',
        iconSize: [size, size + 12],
        iconAnchor: [size / 2, size + 10],
        popupAnchor: [0, -(size + 5)]
    });
};

/**
 * Componente Marker per la mappa
 */
const MapMarker: React.FC<MapMarkerProps> = ({ pin, onNavigateToDay }) => {
    const isBed = pin.icon === '🛏️';
    const icon = createPinIcon(pin, isBed);

    return (
        <Marker
            position={[pin.coordinates.lat, pin.coordinates.lng]}
            icon={icon}
        >
            <Popup>
                <div className="min-w-[160px] max-w-[220px]">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-2">
                        {!isBed && (
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center
                                           text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: pin.color }}
                            >
                                {pin.order}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 leading-snug break-words">
                                {pin.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {pin.categoryLabel}
                                {pin.isWaypoint && ' • tappa'}
                            </p>

                            {isBed && (
                                <span className="inline-block mt-1 px-2 py-0.5
                                                 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-medium">
                                    Pernottamento
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Coordinate */}
                    <p className="text-[10px] text-gray-400 mb-2 font-mono opacity-70">
                        📍 {pin.coordinates.lat.toFixed(5)}, {pin.coordinates.lng.toFixed(5)}
                    </p>

                    {/* Link Google Maps */}
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${pin.coordinates.lat},${pin.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center
                                   w-full mt-1 px-3 py-2
                                   border border-gray-200 rounded-lg
                                   text-xs font-medium text-gray-700
                                   hover:bg-gray-50 transition-colors"
                    >
                        {isBed ? 'Vai all’alloggio' : 'Apri in Google Maps'}
                    </a>

                    {/* Pulsante per navigare al giorno */}
                    {onNavigateToDay && !isBed && (
                        <button
                            onClick={() => onNavigateToDay(pin.dayNumber - 1)}
                            className="w-full mt-2 px-3 py-2
                                       bg-blue-500 hover:bg-blue-600
                                       text-white text-xs font-semibold
                                       rounded-xl transition-colors"
                        >
                            Apri Giorno {pin.dayNumber}
                        </button>
                    )}
                </div>
            </Popup>
        </Marker>
    );
};

export default MapMarker;