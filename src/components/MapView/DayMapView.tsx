import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Polyline, Circle } from 'react-leaflet';
import { ChevronLeft, ChevronRight, X, Map, Navigation, MapPin as MapPinIcon, Route } from 'lucide-react';
import MapMarker from './MapMarker';
import {
    extractDayPins,
    extractMultiDayPins,
    calculateBounds,
    dayHasLocations,
    dayHasNonBaseLocations,
    type MapPin,
    type MapRoute
} from './mapUtils';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

interface DayMapViewProps {
    trip: any;
    initialDayIndex: number;
    initialViewMode?: 'day' | 'trip';
    onBack: () => void;
    onNavigateToDay: (dayIndex: number, categoryId?: string) => void;
    isDesktop?: boolean;
}

type ViewMode = 'day' | 'trip';

/**
 * Componente per aggiornare i bounds della mappa quando cambiano i pin o le routes
 * Usa flyToBounds per transizioni fluide
 */
const MapBoundsUpdater: React.FC<{
    pins: MapPin[];
    routes?: MapRoute[];
    showRoutes?: boolean;
    updateTrigger?: number;
}> = ({ pins, routes = [], showRoutes = false, updateTrigger }) => {
    const map = useMap();
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Crea array di tutti i punti da includere nei bounds
        const allPins = [...pins];

        // Se showRoutes è attivo, aggiungi anche i punti delle routes
        if (showRoutes && routes.length > 0) {
            routes.forEach(route => {
                // Aggiungi punti fittizi per i bounds
                allPins.push({
                    id: `route-from-${route.id}`,
                    coordinates: route.from,
                    name: '',
                    categoryId: '',
                    categoryLabel: '',
                    color: '',
                    order: 0,
                    isWaypoint: false,
                    dayId: 0,
                    dayNumber: 0
                } as MapPin);
                allPins.push({
                    id: `route-to-${route.id}`,
                    coordinates: route.to,
                    name: '',
                    categoryId: '',
                    categoryLabel: '',
                    color: '',
                    order: 0,
                    isWaypoint: false,
                    dayId: 0,
                    dayNumber: 0
                } as MapPin);
            });
        }

        const bounds = calculateBounds(allPins);
        if (bounds) {
            if (isFirstRender.current) {
                // Prima volta: posiziona istantaneamente senza animazione
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: false });
                isFirstRender.current = false;
            } else {
                // Transizioni successive: animazione fluida
                map.flyToBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 15,
                    duration: 0.6
                });
            }
        }
    }, [pins, routes, showRoutes, updateTrigger, map]);

    return null;
};

/**
 * Componente per gestire la geolocalizzazione
 */
interface UserLocationProps {
    userLocation: { lat: number; lng: number } | null;
    onLocate: () => void;
    isLocating: boolean;
}

const UserLocationControl: React.FC<UserLocationProps> = ({ userLocation, onLocate, isLocating }) => {
    const map = useMap();

    const handleLocate = () => {
        if (userLocation) {
            map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 0.5 });
        } else {
            onLocate();
        }
    };

    return (
        <button
            onClick={handleLocate}
            disabled={isLocating}
            className={`absolute bottom-4 right-4 z-[1000] w-11 h-11 rounded-full
                       flex items-center justify-center shadow-lg transition-all
                       ${userLocation
                           ? 'bg-blue-500 text-white'
                           : 'bg-white text-gray-600 hover:bg-gray-50'
                       }
                       ${isLocating ? 'animate-pulse' : ''}`}
            title="La mia posizione"
        >
            <Navigation size={20} className={userLocation ? 'fill-current' : ''} />
        </button>
    );
};

/**
 * DayMapView - Vista mappa fullscreen
 */
const DayMapView: React.FC<DayMapViewProps> = ({
    trip,
    initialDayIndex,
    initialViewMode = 'day',
    onBack,
    onNavigateToDay,
    isDesktop = false
}) => {
    const [currentDayIndex, setCurrentDayIndex] = useState(initialDayIndex);
    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
    const [showRoutes, setShowRoutes] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const daysScrollRef = useRef<HTMLDivElement>(null);
    const [shouldUpdateBounds, setShouldUpdateBounds] = useState(0);

    const currentDay = trip.days[currentDayIndex];
    const totalDays = trip.days.length;

    // Geolocalizzazione
    const handleLocate = () => {
        if (!navigator.geolocation) {
            alert('Geolocalizzazione non supportata');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLocating(false);
            },
            (error) => {
                console.error('Errore geolocalizzazione:', error);
                setIsLocating(false);
                alert('Impossibile ottenere la posizione');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Scroll al giorno corrente nella navigazione
    useEffect(() => {
        if (viewMode === 'trip' && daysScrollRef.current) {
            const activeButton = daysScrollRef.current.querySelector('[data-active="true"]');
            if (activeButton) {
                activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [viewMode, currentDayIndex]);

    // Estrai i pin e le routes in base alla modalità
    const { pins: allPins, routes } = useMemo(() => {
        if (viewMode === 'trip') {
            // Vista viaggio: solo pin, nessuna route
            return {
                pins: extractMultiDayPins(trip.data, trip.days, trip.metadata),
                routes: [] as MapRoute[]
            };
        } else {
            // Vista giorno: pin + routes per trasporti
            return extractDayPins(
                trip.data,
                currentDay.id,
                currentDay.number,
                false
            );
        }
    }, [trip.data, trip.days, trip.metadata, currentDay, viewMode]);

    // Tipi di icone che sono trasporti
    const TRANSPORT_ICONS = ['flight', 'train', 'bus', 'ferry', 'car'];

    // Separa pin attività da pin trasporti
    const { activityPins, transportPins } = useMemo(() => {
        const activity: MapPin[] = [];
        const transport: MapPin[] = [];

        allPins.forEach(pin => {
            // Un pin è di trasporto se ha un'icona di trasporto E label Partenza/Arrivo
            const isTransportPin = pin.icon &&
                TRANSPORT_ICONS.includes(pin.icon) &&
                (pin.categoryLabel === 'Partenza' || pin.categoryLabel === 'Arrivo');

            if (isTransportPin) {
                transport.push(pin);
            } else {
                activity.push(pin);
            }
        });

        return { activityPins: activity, transportPins: transport };
    }, [allPins]);

    // Pin da mostrare in base a showRoutes
    const visiblePins = useMemo(() => {
        if (viewMode === 'trip') return allPins;
        return showRoutes ? allPins : activityPins;
    }, [viewMode, showRoutes, allPins, activityPins]);

    // Verifica quali giorni hanno location (per navigazione)
    const daysWithLocations = useMemo(() => {
        return trip.days.map((day: any) => dayHasLocations(trip.data, day.id, day, trip.metadata));
    }, [trip.data, trip.days, trip.metadata]);

    // Verifica quali giorni hanno location non-base
    const daysWithNonBaseLocations = useMemo(() => {
        return trip.days.map((day: any) => dayHasNonBaseLocations(trip.data, day.id));
    }, [trip.data, trip.days]);

    // Naviga al giorno precedente
    const goToPrevDay = () => {
        if (currentDayIndex > 0) {
            setCurrentDayIndex(currentDayIndex - 1);
        }
    };

    // Naviga al giorno successivo
    const goToNextDay = () => {
        if (currentDayIndex < totalDays - 1) {
            setCurrentDayIndex(currentDayIndex + 1);
        }
    };

    // Handler per navigare al DayDetail con categoria evidenziata
    const handleNavigateToDay = (dayIndex: number, categoryId?: string) => {
        onBack();
        setTimeout(() => onNavigateToDay(dayIndex, categoryId), 100);
    };

    // Centro di default (Italia) se non ci sono pin
    const defaultCenter: [number, number] = [42.5, 12.5];

    return (
        <div
            className="fixed inset-0 z-50 bg-white flex flex-col"
            style={{
                maxWidth: isDesktop ? '100%' : '430px',
                margin: isDesktop ? '0' : '0 auto'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b shadow-sm z-10">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                >
                    <X size={20} />
                </button>

                {/* Segmented Control centrale */}
                <div className="flex-1 flex justify-center">
                    <div className="flex bg-gray-100 rounded-full p-1">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                                viewMode === 'day'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Giorno
                        </button>
                        <button
                            onClick={() => setViewMode('trip')}
                            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                                viewMode === 'trip'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Viaggio
                        </button>
                    </div>
                </div>

                {/* Spacer per mantenere allineamento */}
                <div className="w-10" />
            </div>

            {/* Mappa */}
            <div className="flex-1 relative">
                {visiblePins.length > 0 || (showRoutes && routes.length > 0) ? (
                    <MapContainer
                        center={defaultCenter}
                        zoom={6}
                        className="w-full h-full"
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />

                        {/* Routes (linee di collegamento per trasporti) - solo se showRoutes */}
                        {showRoutes && routes.map((route) => (
                            <Polyline
                                key={route.id}
                                positions={[
                                    [route.from.lat, route.from.lng],
                                    [route.to.lat, route.to.lng]
                                ]}
                                pathOptions={{
                                    color: route.color,
                                    weight: 3,
                                    opacity: 0.8,
                                    dashArray: route.dashed ? '10, 10' : undefined
                                }}
                            />
                        ))}

                        {/* Markers - mostra solo i pin visibili */}
                        {visiblePins.map((pin) => (
                            <MapMarker
                                key={pin.id}
                                pin={pin}
                                onNavigateToDay={handleNavigateToDay}
                                simple={viewMode === 'trip'}
                            />
                        ))}

                        {/* Cerchio posizione utente */}
                        {userLocation && (
                            <>
                                <Circle
                                    center={[userLocation.lat, userLocation.lng]}
                                    radius={50}
                                    pathOptions={{
                                        color: '#3B82F6',
                                        fillColor: '#3B82F6',
                                        fillOpacity: 0.3,
                                        weight: 2
                                    }}
                                />
                                <Circle
                                    center={[userLocation.lat, userLocation.lng]}
                                    radius={8}
                                    pathOptions={{
                                        color: 'white',
                                        fillColor: '#3B82F6',
                                        fillOpacity: 1,
                                        weight: 3
                                    }}
                                />
                            </>
                        )}

                        <MapBoundsUpdater
                            pins={visiblePins}
                            routes={routes}
                            showRoutes={showRoutes}
                            updateTrigger={shouldUpdateBounds}
                        />

                        {/* Controllo geolocalizzazione */}
                        <UserLocationControl
                            userLocation={userLocation}
                            onLocate={handleLocate}
                            isLocating={isLocating}
                        />
                    </MapContainer>
                ) : (
                    /* Stato vuoto */
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center p-6">
                            <Map size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">
                                {viewMode === 'day'
                                    ? 'Nessuna posizione per questo giorno'
                                    : 'Nessuna posizione salvata'
                                }
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                Aggiungi location alle attività per vederle sulla mappa
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer vista giorno - altezza fissa */}
            {viewMode === 'day' && (
                <div
                    className="bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
                >
                    <div className="flex items-center justify-between px-4 py-4">
                        {/* Navigazione precedente */}
                        <button
                            onClick={goToPrevDay}
                            disabled={currentDayIndex === 0}
                            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200
                                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                            <span className="text-sm font-medium">Prec</span>
                        </button>

                        {/* Centro: info giorno + toggle spostamenti */}
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-base font-semibold text-gray-900">
                                Giorno {currentDay.number}
                            </p>
                            {/* Toggle spostamenti - mostra se ci sono trasporti */}
                            {routes.length > 0 && (
                                <button
                                    onClick={() => {
                                        setShowRoutes(!showRoutes);
                                        setShouldUpdateBounds(prev => prev + 1);
                                    }}
                                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                        showRoutes
                                            ? 'bg-blue-500 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Route size={16} />
                                    <span>Spostamenti</span>
                                </button>
                            )}
                        </div>

                        {/* Navigazione successivo */}
                        <button
                            onClick={goToNextDay}
                            disabled={currentDayIndex === totalDays - 1}
                            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200
                                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="text-sm font-medium">Succ</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Footer vista viaggio - Navigazione giorni scorrevole */}
            {viewMode === 'trip' && (
                <div
                    className="bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)] px-4 py-4"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
                >
                    <p className="text-xs text-gray-500 mb-2 text-center">Seleziona un giorno</p>
                    <div
                        ref={daysScrollRef}
                        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {trip.days.map((day: any, index: number) => {
                            const hasLocation = daysWithLocations[index];
                            const hasNonBase = daysWithNonBaseLocations[index];
                            const isActive = currentDayIndex === index;

                            return (
                                <button
                                    key={day.id}
                                    data-active={isActive}
                                    onClick={() => {
                                        if (hasNonBase) {
                                            setViewMode('day');
                                            setCurrentDayIndex(index);
                                        }
                                    }}
                                    disabled={!hasLocation}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1 ${
                                        isActive
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : hasNonBase
                                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                : hasLocation
                                                    ? 'bg-gray-100 text-gray-500'
                                                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="whitespace-nowrap">G{day.number}</span>
                                    {hasNonBase && !isActive && (
                                        <MapPinIcon size={12} className="opacity-60" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DayMapView;