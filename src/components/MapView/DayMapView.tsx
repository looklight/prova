import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { ChevronLeft, ChevronRight, X, Map, Layers, ListOrdered, GripVertical } from 'lucide-react';
import MapMarker from './MapMarker';
import {
    extractDayPins,
    extractMultiDayPins,
    calculateBounds,
    dayHasLocations,
    dayHasNonBaseLocations,
    type MapPin
} from './mapUtils';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

interface DayMapViewProps {
    trip: any;
    initialDayIndex: number;
    initialViewMode?: 'day' | 'trip';
    onBack: () => void;
    onNavigateToDay: (dayIndex: number) => void;
    isDesktop?: boolean;
}

type ViewMode = 'day' | 'trip';

/**
 * Componente per aggiornare i bounds della mappa quando cambiano i pin
 */
const MapBoundsUpdater: React.FC<{ pins: MapPin[] }> = ({ pins }) => {
    const map = useMap();

    useEffect(() => {
        const bounds = calculateBounds(pins);
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [pins, map]);

    return null;
};

/**
 * Modal per riordinare i pin
 */
interface ReorderModalProps {
    isOpen: boolean;
    pins: MapPin[];
    onClose: () => void;
    onReorder: (newOrder: string[]) => void;
}

const ReorderModal: React.FC<ReorderModalProps> = ({ isOpen, pins, onClose, onReorder }) => {
    const [orderedPins, setOrderedPins] = useState<MapPin[]>(pins);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        setOrderedPins(pins);
    }, [pins]);

    if (!isOpen) return null;

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newPins = [...orderedPins];
        const draggedPin = newPins[draggedIndex];
        newPins.splice(draggedIndex, 1);
        newPins.splice(index, 0, draggedPin);

        // Aggiorna ordine
        const reorderedPins = newPins.map((pin, i) => ({ ...pin, order: i + 1 }));
        setOrderedPins(reorderedPins);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleConfirm = () => {
        const newOrder = orderedPins.map(pin => pin.id);
        onReorder(newOrder);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[1000] bg-black/50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <ListOrdered size={20} className="text-blue-500" />
                        <h3 className="font-semibold">Riordina tappe</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Lista draggable */}
                <div className="flex-1 overflow-y-auto p-4">
                    <p className="text-sm text-gray-500 mb-3">
                        Trascina per riordinare le tappe del percorso
                    </p>
                    <div className="space-y-2">
                        {orderedPins.map((pin, index) => (
                            <div
                                key={pin.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-grab active:cursor-grabbing transition-all ${draggedIndex === index ? 'opacity-50 scale-95' : ''
                                    }`}
                            >
                                <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                    style={{ backgroundColor: pin.color }}
                                >
                                    {pin.order}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{pin.name}</p>
                                    <p className="text-xs text-gray-500">{pin.categoryLabel}</p>
                                </div>
                                {pin.icon && <span className="text-lg">{pin.icon}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium"
                    >
                        Conferma
                    </button>
                </div>
            </div>
        </div>
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
    const [showReorderModal, setShowReorderModal] = useState(false);

    const currentDay = trip.days[currentDayIndex];
    const totalDays = trip.days.length;

    // Estrai i pin in base alla modalità
    const pins = useMemo(() => {
        if (viewMode === 'trip') {
            return extractMultiDayPins(trip.data, trip.days);
        } else {
            return extractDayPins(
                trip.data,
                currentDay.id,
                currentDay.number,
                false // Non includere 'base' nella vista giorno
            );
        }
    }, [trip.data, trip.days, currentDay, viewMode]);

    // Verifica quali giorni hanno location (per navigazione)
    const daysWithLocations = useMemo(() => {
        return trip.days.map((day: any) => dayHasLocations(trip.data, day.id));
    }, [trip.data, trip.days]);

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

    // Handler per navigare al DayDetail
    const handleNavigateToDay = (dayIndex: number) => {
        onBack();
        setTimeout(() => onNavigateToDay(dayIndex), 100);
    };

    // Handler per riordinamento (TODO: implementare salvataggio)
    const handleReorder = (newOrder: string[]) => {
        console.log('🔄 Nuovo ordine pin:', newOrder);
        // TODO: Salvare il nuovo ordine nel trip.data
        // Per ora è solo visuale
    };

    // Formatta la data
    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
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
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm z-10">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex-1 text-center">
                    {viewMode === 'day' ? (
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={goToPrevDay}
                                disabled={currentDayIndex === 0}
                                className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div>
                                <p className="font-semibold text-sm">
                                    Giorno {currentDay.number}
                                </p>
                                {currentDay.date && (
                                    <p className="text-xs text-gray-500">
                                        {formatDate(currentDay.date)}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={goToNextDay}
                                disabled={currentDayIndex === totalDays - 1}
                                className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="font-semibold text-sm">
                                {trip.name || trip.metadata?.name || 'Viaggio'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {totalDays} giorni
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Pulsante riordina (solo in vista giorno con pin) */}
                    {viewMode === 'day' && pins.length > 1 && (
                        <button
                            onClick={() => setShowReorderModal(true)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                            title="Riordina tappe"
                        >
                            <ListOrdered size={20} />
                        </button>
                    )}

                    {/* Toggle vista */}
                    <button
                        onClick={() => setViewMode(viewMode === 'day' ? 'trip' : 'day')}
                        className={`p-2 rounded-full transition-colors ${viewMode === 'trip'
                                ? 'bg-blue-100 text-blue-600'
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                        title={viewMode === 'day' ? 'Mostra tutto il viaggio' : 'Mostra singolo giorno'}
                    >
                        <Layers size={20} />
                    </button>
                </div>
            </div>

            {/* Mappa */}
            <div className="flex-1 relative">
                {pins.length > 0 ? (
                    <MapContainer
                        center={defaultCenter}
                        zoom={6}
                        className="w-full h-full"
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />

                        {pins.map((pin) => (
                            <MapMarker
                                key={pin.id}
                                pin={pin}
                                onNavigateToDay={viewMode === 'trip' ? handleNavigateToDay : undefined}
                            />
                        ))}

                        <MapBoundsUpdater pins={pins} />
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

            {/* Footer con legenda pin (solo vista giorno) */}
            {viewMode === 'day' && pins.length > 0 && (
                <div className="bg-white border-t px-4 py-2">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {pins.map((pin) => (
                            <div
                                key={pin.id}
                                className="flex items-center gap-1.5 text-xs bg-gray-50 px-2 py-1 rounded-full"
                            >
                                <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                    style={{ backgroundColor: pin.color }}
                                >
                                    {pin.order}
                                </span>
                                <span className="text-gray-600 max-w-[80px] truncate">{pin.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigazione rapida giorni (vista viaggio) */}
            {viewMode === 'trip' && (
                <div className="bg-white border-t px-4 py-2">
                    <div className="flex gap-1 justify-center flex-wrap">
                        {trip.days.map((day: any, index: number) => {
                            const hasLocation = daysWithLocations[index];
                            const hasNonBase = daysWithNonBaseLocations[index];

                            return (
                                <button
                                    key={day.id}
                                    onClick={() => {
                                        if (hasNonBase) {
                                            setViewMode('day');
                                            setCurrentDayIndex(index);
                                        }
                                    }}
                                    disabled={!hasLocation}
                                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${hasNonBase
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : hasLocation
                                                ? 'bg-gray-200 text-gray-500'
                                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        }`}
                                    title={
                                        hasNonBase
                                            ? `Giorno ${day.number} - Vai alla mappa`
                                            : hasLocation
                                                ? `Giorno ${day.number} - Solo luogo base`
                                                : `Giorno ${day.number} - Nessuna posizione`
                                    }
                                >
                                    {day.number}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal riordinamento */}
            <ReorderModal
                isOpen={showReorderModal}
                pins={pins}
                onClose={() => setShowReorderModal(false)}
                onReorder={handleReorder}
            />
        </div>
    );
};

export default DayMapView;