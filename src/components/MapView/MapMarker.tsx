import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin as MapPinIcon, Utensils, Landmark, TreePine, Umbrella, ShoppingBag, Music2, Dumbbell, Plane, Bus, Car, Bed, Clock, CheckCircle } from 'lucide-react';
import type { MapPin, ActivityIconType } from './mapUtils';

interface MapMarkerProps {
    pin: MapPin;
    onNavigateToDay?: (dayIndex: number, categoryId?: string) => void;
    /** Se true, usa marker semplice (solo cerchio con numero) per vista viaggio */
    simple?: boolean;
}

/**
 * Mappa degli SVG path per le icone Lucide (dimensione 16x16)
 * Usati per i marker sulla mappa
 */
const ICON_SVG_PATHS: Record<ActivityIconType, string> = {
    generic: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    restaurant: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    museum: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    nature: '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>',
    beach: '<path d="M22 21H2"/><path d="M12 21a8 8 0 0 0 8-8H4a8 8 0 0 0 8 8Z"/><path d="M12 3v5"/><path d="m8 6 4-3 4 3"/>',
    shopping: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    entertainment: '<path d="M9 3v18m6-18v18M4 6h16M4 12h16M4 18h16"/>',
    sport: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
    flight: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    transport: '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
};

/**
 * Genera l'SVG inline per un'icona
 */
const getIconSvg = (iconType: ActivityIconType, color: string = 'currentColor', size: number = 14): string => {
    const path = ICON_SVG_PATHS[iconType] || ICON_SVG_PATHS.generic;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
};

/**
 * Componente React per le icone nel popup
 */
const IconComponent: React.FC<{ iconType: ActivityIconType; size?: number; className?: string }> = ({ iconType, size = 16, className }) => {
    const iconMap: Record<ActivityIconType, React.ElementType> = {
        generic: MapPinIcon,
        restaurant: Utensils,
        museum: Landmark,
        nature: TreePine,
        beach: Umbrella,
        shopping: ShoppingBag,
        entertainment: Music2,
        sport: Dumbbell,
        flight: Plane,
        transport: Bus,
        car: Car,
        bed: Bed,
    };
    const Icon = iconMap[iconType] || MapPinIcon;
    return <Icon size={size} className={className} />;
};

/**
 * Crea un marker semplice per la vista Viaggio
 * Icona MapPin Lucide con badge numerino in sovraimpressione
 */
const createSimpleIcon = (pin: MapPin): L.DivIcon => {
    const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 40px;
    ">
      <!-- Icona MapPin filled -->
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 24" fill="${pin.color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3" fill="white" stroke="${pin.color}" stroke-width="1.5"/>
      </svg>
      <!-- Badge numero in sovraimpressione -->
      <div style="
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        background-color: white;
        border: 2px solid ${pin.color};
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: ${pin.color};
        box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        z-index: 10;
      ">
        ${pin.order}
      </div>
    </div>
  `;

    return L.divIcon({
        html,
        className: 'custom-map-pin',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -36]
    });
};

/**
 * Crea un'icona Leaflet custom a forma di goccia/pin per vista Giorno
 * - Punta in basso che indica la coordinata
 * - Cerchio in alto con icona SVG
 * - Colore basato sul tipo di attività
 */
const createPinIcon = (pin: MapPin, isBed: boolean): L.DivIcon => {
    const size = 40;
    const circleSize = 28;
    const hasIcon = !!pin.icon;
    const iconColor = isBed ? pin.color : 'white';

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
          ? getIconSvg(pin.icon!, iconColor, 14)
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
const MapMarker: React.FC<MapMarkerProps> = ({ pin, onNavigateToDay, simple = false }) => {
    const isBed = pin.icon === 'bed';
    // Vista viaggio: marker semplice (cerchio con numero)
    // Vista giorno: pin con goccia e icona
    const icon = simple ? createSimpleIcon(pin) : createPinIcon(pin, isBed);

    return (
        <Marker
            position={[pin.coordinates.lat, pin.coordinates.lng]}
            icon={icon}
        >
            <Popup>
                <div className="min-w-[160px] max-w-[220px]">
                    {/* Header compatto */}
                    <div className="flex items-start gap-2.5 mb-2">
                        {isBed ? (
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                                style={{ borderColor: pin.color, backgroundColor: 'white' }}
                            >
                                <Bed size={16} style={{ color: pin.color }} />
                            </div>
                        ) : pin.icon ? (
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: pin.color }}
                            >
                                <IconComponent iconType={pin.icon} size={16} className="text-white" />
                            </div>
                        ) : (
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center
                                           text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: pin.color }}
                            >
                                {pin.order}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 leading-tight">
                                {pin.name}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {isBed ? 'Pernottamento' : pin.categoryLabel}
                                {pin.isWaypoint && ' • tappa'}
                            </p>
                        </div>
                    </div>

                    {/* Info extra */}
                    {(pin.time || pin.isBooked) && (
                        <div className="space-y-1.5 mb-3 py-2 border-t border-gray-100">
                            {/* Orario */}
                            {pin.time && (
                                <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                    <Clock size={12} className="text-gray-400 flex-shrink-0" />
                                    <span>{isBed ? `Check-in: ${pin.time}` : pin.time}</span>
                                </div>
                            )}

                            {/* Stato prenotazione */}
                            {pin.isBooked && (
                                <div className="flex items-center gap-2 text-[11px]">
                                    <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                                    <span className="text-green-600 font-medium">Prenotato</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pulsanti azione */}
                    <div className="flex gap-2">
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${pin.coordinates.lat},${pin.coordinates.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1
                                       px-2 py-1.5 border border-gray-200 rounded-lg
                                       text-[11px] font-medium text-gray-600
                                       hover:bg-gray-50 transition-colors"
                        >
                            <Navigation size={10} />
                            Maps
                        </a>
                        {onNavigateToDay && (
                            <button
                                onClick={() => onNavigateToDay(pin.dayNumber - 1, pin.categoryId)}
                                className="flex-1 px-2 py-1.5
                                           bg-blue-500 hover:bg-blue-600
                                           text-white text-[11px] font-semibold
                                           rounded-lg transition-colors"
                            >
                                {simple ? `Giorno ${pin.dayNumber}` : 'Dettagli'}
                            </button>
                        )}
                    </div>
                </div>
            </Popup>
        </Marker>
    );
};

export default MapMarker;