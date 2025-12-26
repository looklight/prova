import React, { useRef, useState, useMemo } from 'react';
import { MapPin, Plus, Upload, Archive, Undo2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { TripMetadataModal, TripMembersModal } from '../Trip';
import { MembersAvatarStack } from '../Sharing';
import { Avatar, NotificationCenter, OfflineDisabled, SwipeToDelete } from '../ui';
import { SwipeProvider } from '../ui/SwipeContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { rawColors } from '../../styles/theme';
import { canArchiveTrip } from '../../utils/archiveValidation';
import { getCurrentTripInfo, type CurrentTripInfo } from '../../utils/tripStatusUtils';
import CurrentTripCard from './CurrentTripCard';

const HomeView = ({
  trips,
  loading,
  onCreateNew,
  onOpenTrip,
  onDeleteTrip,
  onImportTrip,
  onOpenProfile,
  onArchiveTrip,
  onUnarchiveTrip,
  currentUser,
  archivedTripIds = []
}) => {
  const fileInputRef = useRef(null);
  const analytics = useAnalytics();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [unarchiveConfirm, setUnarchiveConfirm] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(null);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImportTrip(file);
      e.target.value = '';
    }
  };

  const handleCreateTrip = (metadata) => {
    onCreateNew(metadata);
  };

  const getTripMembers = (trip) => {
    if (!trip.sharing?.memberIds) return [];

    return trip.sharing.memberIds
      .map(userId => ({
        userId,
        ...trip.sharing.members[userId]
      }))
      .filter(member => member.status === 'active');
  };

  // 📦 Separa viaggi attivi da archiviati
  const activeTrips = trips.filter(trip => !archivedTripIds.includes(String(trip.id)));
  const archivedTrips = trips.filter(trip => archivedTripIds.includes(String(trip.id)));

  // 🔥 Identifica viaggi correnti (in corso oggi)
  const currentTripsInfo = useMemo(() => {
    return activeTrips
      .map(trip => getCurrentTripInfo(trip))
      .filter((info): info is CurrentTripInfo => info !== null);
  }, [activeTrips]);

  // Viaggi attivi non correnti, separati in futuri e passati
  const { upcomingTrips, pastTrips } = useMemo(() => {
    const currentTripIds = new Set(currentTripsInfo.map(info => info.trip.id));
    const nonCurrentTrips = activeTrips.filter(trip => !currentTripIds.has(trip.id));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: typeof nonCurrentTrips = [];
    const past: typeof nonCurrentTrips = [];

    nonCurrentTrips.forEach(trip => {
      const firstDayDate = trip.days?.[0]?.date ? new Date(trip.days[0].date) : new Date(trip.startDate);
      firstDayDate.setHours(0, 0, 0, 0);

      if (firstDayDate > today) {
        upcoming.push(trip);
      } else {
        past.push(trip);
      }
    });

    // Ordina i futuri per data crescente (più vicini prima)
    upcoming.sort((a, b) => {
      const dateA = new Date(a.days?.[0]?.date || a.startDate);
      const dateB = new Date(b.days?.[0]?.date || b.startDate);
      return dateA.getTime() - dateB.getTime();
    });

    // Ordina i passati per data decrescente (più recenti prima)
    past.sort((a, b) => {
      const dateA = new Date(a.days?.[a.days.length - 1]?.date || a.startDate);
      const dateB = new Date(b.days?.[b.days.length - 1]?.date || b.startDate);
      return dateB.getTime() - dateA.getTime();
    });

    return { upcomingTrips: upcoming, pastTrips: past };
  }, [activeTrips, currentTripsInfo]);

  // Helper per calcolare i giorni mancanti
  const getDaysUntil = (trip: any): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayDate = trip.days?.[0]?.date ? new Date(trip.days[0].date) : new Date(trip.startDate);
    firstDayDate.setHours(0, 0, 0, 0);
    const diffTime = firstDayDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: '430px', margin: '0 auto' }}>
      <TripMetadataModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateTrip}
        currentUser={currentUser}
        mode="create"
      />

      {showMembersModal && (
        <TripMembersModal
          isOpen={true}
          onClose={() => setShowMembersModal(null)}
          trip={trips.find(t => t.id === showMembersModal.id) || showMembersModal}
          currentUser={currentUser}
          onMemberUpdated={() => {
            console.log('✅ Membro aggiornato, listener sincronizzerà');
          }}
        />
      )}

      {/* Modal Elimina/Esci Viaggio - Dinamico */}
      {deleteConfirm && (() => {
        const trip = trips.find(t => t.id === deleteConfirm.id);
        const members = getTripMembers(trip);
        const isShared = members.length > 1;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              {/* Titolo dinamico */}
              <h3 className="text-xl font-bold mb-2">
                {isShared ? 'Esci dal viaggio' : 'Elimina viaggio'}
              </h3>

              {/* Messaggio dinamico */}
              <p className="text-gray-600 mb-6">
                {isShared
                  ? `Vuoi uscire da "${deleteConfirm.name}"? Perderai accesso e dati relativi a questo viaggio.`
                  : `Vuoi eliminare "${deleteConfirm.name}"? Questa azione non può essere annullata.`
                }
              </p>

              {/* Bottoni */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    onDeleteTrip(deleteConfirm.id);
                    setDeleteConfirm(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-full font-medium ${isShared
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                >
                  {isShared ? 'Esci' : 'Elimina'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 📦 Modal Conferma Archiviazione */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Archivia viaggio</h3>
            <p className="text-gray-600 mb-6">
              Vuoi archiviare "{archiveConfirm.name}"? Potrai sempre disarchiviarlo in seguito.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveConfirm(null)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  onArchiveTrip(archiveConfirm.id);
                  setArchiveConfirm(null);
                }}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600"
              >
                Archivia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ↩️ Modal Conferma Disarchiviazione */}
      {unarchiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Disarchivia viaggio</h3>
            <p className="text-gray-600 mb-6">
              Vuoi riportare "{unarchiveConfirm.name}" nei viaggi attivi?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnarchiveConfirm(null)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  onUnarchiveTrip(unarchiveConfirm.id);
                  setUnarchiveConfirm(null);
                }}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600"
              >
                Disarchivia
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white px-4 py-6 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            _Altrove
          </h1>

          <div className="flex items-center gap-3">
            {/* ✅ Badge unificato - sostituisce NotificationBadge + InvitationsNotifications */}
            <NotificationCenter
              userProfile={{
                displayName: currentUser.displayName,
                username: currentUser.username,
                avatar: currentUser.photoURL
              }}
            />

            {/* 🆕 AVATAR INVECE DI ICONA USER */}
            <OfflineDisabled>
              <button
                onClick={onOpenProfile}
                className="hover:opacity-80 transition-opacity"
                aria-label="Profilo"
              >
                <Avatar
                  src={currentUser.photoURL}
                  name={currentUser.displayName || 'User'}
                  size="sm"
                  className="!w-8 !h-8 !text-sm"
                />
              </button>
            </OfflineDisabled>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 🔥 SEZIONE VIAGGI IN CORSO */}
        {currentTripsInfo.length > 0 && (
          <div className="mb-6">
            {currentTripsInfo.map((tripInfo) => (
              <CurrentTripCard
                key={tripInfo.trip.id}
                tripInfo={tripInfo}
                members={getTripMembers(tripInfo.trip)}
                onOpenTrip={(tripId, options) => {
                  const trip = tripInfo.trip;
                  const memberCount = Object.keys(trip.sharing?.members || {}).length;
                  analytics.trackTripOpened(trip.id, trip.name, trip.days.length, memberCount);
                  onOpenTrip(tripId, options);
                }}
                onShowMembers={(trip) => setShowMembersModal(trip)}
              />
            ))}
          </div>
        )}

        {/* 📍 SEZIONE VIAGGI IN PROGRAMMA */}
        {upcomingTrips.length > 0 && (
          <SwipeProvider>
            <div className="space-y-3 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Viaggi in programma
              </h2>
              {upcomingTrips.map((trip) => {
                const members = getTripMembers(trip);
                const daysUntil = getDaysUntil(trip);
                const firstDayDate = trip.days?.[0]?.date ? new Date(trip.days[0].date) : new Date(trip.startDate);
                const lastDayDate = trip.days?.[trip.days.length - 1]?.date
                  ? new Date(trip.days[trip.days.length - 1].date)
                  : new Date(firstDayDate.getTime() + (trip.days.length - 1) * 24 * 60 * 60 * 1000);

                const formatDateRange = () => {
                  const start = firstDayDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                  const end = lastDayDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                  return `${start} - ${end}`;
                };

                return (
                  <SwipeToDelete
                    key={trip.id}
                    swipeId={`trip-${trip.id}`}
                    onDelete={() => setDeleteConfirm({ id: trip.id, name: trip.name })}
                  >
                    <div
                      className="bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform shadow-sm"
                      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}
                      onClick={() => {
                        const memberCount = Object.keys(trip.sharing?.members || {}).length;
                        analytics.trackTripOpened(trip.id, trip.name, trip.days.length, memberCount);
                        onOpenTrip(trip.id);
                      }}
                    >
                      <div className="flex h-28">
                        {/* Immagine a sinistra con badge */}
                        <div className="w-28 h-full flex-shrink-0 relative">
                          {trip.image ? (
                            <img
                              src={trip.image}
                              alt={trip.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{
                                background: `linear-gradient(135deg, ${rawColors.accent} 0%, #3B82F6 100%)`
                              }}
                            >
                              <MapPin size={32} className="text-white opacity-80" />
                            </div>
                          )}
                          {/* Striscia "Mancano X giorni" */}
                          <div
                            className="absolute bottom-0 left-0 right-0 text-center"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                          >
                            <span className="text-[10px] leading-5 font-medium text-white">
                              {daysUntil === 1 ? 'Domani' : `Tra ${daysUntil} giorni`}
                            </span>
                          </div>
                        </div>

                        {/* Info a destra */}
                        <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-bold text-gray-800 truncate leading-tight">
                              {trip.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Calendar size={14} className="flex-shrink-0" />
                            <span className="truncate">{formatDateRange()}</span>
                            <span className="text-gray-300">·</span>
                            <span className="flex-shrink-0 font-medium">
                              {trip.days.length} {trip.days.length === 1 ? 'giorno' : 'giorni'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            {members.length > 0 ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMembersModal(trip);
                                }}
                                className="cursor-pointer"
                              >
                                <MembersAvatarStack
                                  members={members}
                                  maxVisible={5}
                                  size="sm"
                                />
                              </div>
                            ) : (
                              <div />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SwipeToDelete>
                );
              })}
            </div>
          </SwipeProvider>
        )}

        {/* 📅 SEZIONE VIAGGI PASSATI */}
        {pastTrips.length > 0 && (
          <SwipeProvider>
            <div className="space-y-3 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Viaggi passati
              </h2>
              {pastTrips.map((trip) => {
                const members = getTripMembers(trip);
                const firstDayDate = trip.days?.[0]?.date ? new Date(trip.days[0].date) : new Date(trip.startDate);
                const lastDayDate = trip.days?.[trip.days.length - 1]?.date
                  ? new Date(trip.days[trip.days.length - 1].date)
                  : new Date(firstDayDate.getTime() + (trip.days.length - 1) * 24 * 60 * 60 * 1000);

                const formatDateRange = () => {
                  const start = firstDayDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                  const end = lastDayDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                  return `${start} - ${end}`;
                };

                return (
                  <SwipeToDelete
                    key={trip.id}
                    swipeId={`trip-past-${trip.id}`}
                    onDelete={() => setDeleteConfirm({ id: trip.id, name: trip.name })}
                  >
                    <div
                      className="bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform shadow-sm"
                      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}
                      onClick={() => {
                        const memberCount = Object.keys(trip.sharing?.members || {}).length;
                        analytics.trackTripOpened(trip.id, trip.name, trip.days.length, memberCount);
                        onOpenTrip(trip.id);
                      }}
                    >
                      <div className="flex h-28">
                        {/* Immagine a sinistra */}
                        <div className="w-28 h-full flex-shrink-0">
                          {trip.image ? (
                            <img
                              src={trip.image}
                              alt={trip.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{
                                background: `linear-gradient(135deg, ${rawColors.accent} 0%, #3B82F6 100%)`
                              }}
                            >
                              <MapPin size={32} className="text-white opacity-80" />
                            </div>
                          )}
                        </div>

                        {/* Info a destra */}
                        <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-bold text-gray-800 truncate leading-tight">
                              {trip.name}
                            </h3>
                            {canArchiveTrip(trip) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArchiveConfirm({ id: trip.id, name: trip.name });
                                }}
                                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                title="Archivia viaggio"
                              >
                                <Archive size={16} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Calendar size={14} className="flex-shrink-0" />
                            <span className="truncate">{formatDateRange()}</span>
                            <span className="text-gray-300">·</span>
                            <span className="flex-shrink-0 font-medium">
                              {trip.days.length} {trip.days.length === 1 ? 'giorno' : 'giorni'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            {members.length > 0 ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMembersModal(trip);
                                }}
                                className="cursor-pointer"
                              >
                                <MembersAvatarStack
                                  members={members}
                                  maxVisible={5}
                                  size="sm"
                                />
                              </div>
                            ) : (
                              <div />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SwipeToDelete>
                );
              })}
            </div>
          </SwipeProvider>
        )}

        {/* 📦 SEZIONE VIAGGI ARCHIVIATI */}
        {archivedTrips.length > 0 && (
          <div className="mb-6">
            {/* Header espandibile */}
            <div
              onClick={() => setIsArchiveExpanded(prev => !prev)}
              className="flex items-center justify-between p-3 mb-3 rounded-xl bg-gray-100 active:bg-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Archive size={18} className="text-gray-500" />
                <span className="font-medium text-gray-600 text-sm">
                  Archiviati ({archivedTrips.length})
                </span>
              </div>
              {isArchiveExpanded ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </div>

            {/* Lista viaggi archiviati - Grid 2 colonne */}
            {isArchiveExpanded && (
              <div className="grid grid-cols-2 gap-3">
                {archivedTrips.map((trip) => {
                  const firstDayDate = trip.days?.[0]?.date ? new Date(trip.days[0].date) : new Date(trip.startDate);
                  const lastDayDate = trip.days?.[trip.days.length - 1]?.date
                    ? new Date(trip.days[trip.days.length - 1].date)
                    : new Date(firstDayDate.getTime() + (trip.days.length - 1) * 24 * 60 * 60 * 1000);

                  const formatDateRange = () => {
                    const start = firstDayDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                    const end = lastDayDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                    return `${start} - ${end}`;
                  };

                  return (
                    <div
                      key={trip.id}
                      className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
                      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}
                      onClick={() => {
                        const memberCount = Object.keys(trip.sharing?.members || {}).length;
                        analytics.trackTripOpened(trip.id, trip.name, trip.days.length, memberCount);
                        onOpenTrip(trip.id);
                      }}
                    >
                      {/* Immagine di sfondo */}
                      {trip.image ? (
                        <img
                          src={trip.image}
                          alt={trip.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <MapPin size={40} className="text-white opacity-40" />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Pulsante ripristina - top right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnarchiveConfirm({ id: trip.id, name: trip.name });
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:text-amber-600 hover:bg-white transition-colors shadow-sm"
                        title="Ripristina viaggio"
                      >
                        <Undo2 size={16} />
                      </button>

                      {/* Info in basso */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-bold text-base truncate mb-1">
                          {trip.name}
                        </h3>
                        <div className="flex items-center gap-1 text-white/80 text-xs">
                          <Calendar size={11} className="flex-shrink-0" />
                          <span className="truncate">{formatDateRange()}</span>
                          <span className="text-white/50">·</span>
                          <span className="flex-shrink-0 font-medium">
                            {trip.days.length}g
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {trips.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            <MapPin size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nessun viaggio ancora.</p>
            <p className="text-sm">Tocca + per creare il tuo primo viaggio!</p>
          </div>
        )}
      </div>

      {/* FAB Overlay - quando menu è aperto (nascosto se modal aperto) */}
      {isFabOpen && !showCreateModal && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={() => setIsFabOpen(false)}
        />
      )}

      {/* FAB Menu espandibile - nascosto quando modal è aperto */}
      {!showCreateModal && (
      <div className="fixed bottom-8 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        {/* Opzioni del menu */}
        <div
          className={`flex flex-col items-end gap-2 transition-all duration-200 ${
            isFabOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Importa */}
          <OfflineDisabled>
            <button
              onClick={() => {
                setIsFabOpen(false);
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-3 pl-4 pr-5 py-3 bg-white rounded-full shadow-lg active:scale-95 transition-transform"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: rawColors.success }}
              >
                <Upload size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-gray-700">Importa</span>
            </button>
          </OfflineDisabled>

          {/* Nuovo viaggio */}
          <OfflineDisabled>
            <button
              onClick={() => {
                setIsFabOpen(false);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-3 pl-4 pr-5 py-3 bg-white rounded-full shadow-lg active:scale-95 transition-transform"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: rawColors.action }}
              >
                <MapPin size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-gray-700">Nuovo viaggio</span>
            </button>
          </OfflineDisabled>
        </div>

        {/* FAB principale */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200 pointer-events-auto ${
            isFabOpen ? 'rotate-45' : ''
          }`}
          style={{
            background: rawColors.action,
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
          }}
        >
          <Plus size={28} className="text-white" strokeWidth={2.5} />
        </button>
      </div>
      )}
    </div>
  );
};

export default HomeView;