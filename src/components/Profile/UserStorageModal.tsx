import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Image, FileDown, Trash2, ChevronDown, ChevronUp, AlertTriangle, Loader } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { colors, rawColors } from '../../styles/theme';
import { deleteImage } from '../../services/storageService';
import ImageViewer from '../DayDetail/modals/ImageViewer';
import { ActivityTypeIcon } from '../../utils/activityTypes';

// ============================================
// UserStorageModal
// Gestione file caricati dall'utente
// ============================================

interface MediaFile {
  id: number;
  url: string;
  path?: string;
  name?: string;
  size?: number;
  uploaderId?: string;
  type: 'image' | 'document';
  activityType?: string;
  source: string; // nome attività/pernottamento
}

interface TripMedia {
  tripId: string;
  tripName: string;
  tripImage?: string;
  files: MediaFile[];
  totalSize: number;
}

interface UserStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: any[];
  userId: string;
  onFileDeleted?: () => void;
}

const UserStorageModal: React.FC<UserStorageModalProps> = ({
  isOpen,
  onClose,
  trips,
  userId,
  onFileDeleted
}) => {
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ file: MediaFile; tripId: string; dayId: string; entityType: string; entityId?: string } | null>(null);

  // Estrai tutti i file dell'utente organizzati per viaggio
  const mediaByTrip = useMemo<TripMedia[]>(() => {
    if (!trips?.length || !userId) return [];

    const result: TripMedia[] = [];

    trips.forEach((trip: any) => {
      if (!trip.data) return;

      const files: MediaFile[] = [];

      trip.days?.forEach((day: any) => {
        const dayId = day.id;

        // Attività
        const activitiesKey = `${dayId}-attivita`;
        const activitiesData = trip.data[activitiesKey];
        if (activitiesData?.activities && Array.isArray(activitiesData.activities)) {
          activitiesData.activities.forEach((activity: any) => {
            const activityName = activity.title || 'Attività';
            const activityType = activity.type || 'generic';

            // Immagini
            if (activity.images && Array.isArray(activity.images)) {
              activity.images.forEach((img: any) => {
                if (img.uploaderId === userId) {
                  files.push({
                    id: img.id,
                    url: img.url,
                    path: img.path,
                    size: img.size,
                    uploaderId: img.uploaderId,
                    type: 'image',
                    source: activityName,
                    activityType,
                    // Metadati per eliminazione
                    ...{ _dayId: dayId, _entityType: 'activity', _entityId: activity.id }
                  });
                }
              });
            }

            // Documenti
            if (activity.documents && Array.isArray(activity.documents)) {
              activity.documents.forEach((doc: any) => {
                if (doc.uploaderId === userId) {
                  files.push({
                    id: doc.id,
                    url: doc.url,
                    path: doc.path,
                    name: doc.name,
                    size: doc.size,
                    uploaderId: doc.uploaderId,
                    type: 'document',
                    source: activityName,
                    activityType,
                    ...{ _dayId: dayId, _entityType: 'activity', _entityId: activity.id }
                  });
                }
              });
            }
          });
        }

        // Pernottamento
        const accommodationKey = `${dayId}-pernottamento`;
        const accommodationData = trip.data[accommodationKey];
        if (accommodationData) {
          const accommodationName = accommodationData.title || 'Pernottamento';

          // Immagini
          if (accommodationData.images && Array.isArray(accommodationData.images)) {
            accommodationData.images.forEach((img: any) => {
              if (img.uploaderId === userId) {
                files.push({
                  id: img.id,
                  url: img.url,
                  path: img.path,
                  size: img.size,
                  uploaderId: img.uploaderId,
                  type: 'image',
                  source: accommodationName,
                  activityType: 'accommodation',
                  ...{ _dayId: dayId, _entityType: 'accommodation' }
                });
              }
            });
          }

          // Documenti
          if (accommodationData.documents && Array.isArray(accommodationData.documents)) {
            accommodationData.documents.forEach((doc: any) => {
              if (doc.uploaderId === userId) {
                files.push({
                  id: doc.id,
                  url: doc.url,
                  path: doc.path,
                  name: doc.name,
                  size: doc.size,
                  uploaderId: doc.uploaderId,
                  type: 'document',
                  source: accommodationName,
                  activityType: 'accommodation',
                  ...{ _dayId: dayId, _entityType: 'accommodation' }
                });
              }
            });
          }
        }
      });

      if (files.length > 0) {
        const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
        result.push({
          tripId: trip.id,
          tripName: trip.name || 'Viaggio senza nome',
          tripImage: trip.image,
          files,
          totalSize
        });
      }
    });

    return result;
  }, [trips, userId]);

  // Stats totali
  const stats = useMemo(() => {
    let images = 0;
    let documents = 0;
    let totalSize = 0;
    mediaByTrip.forEach(trip => {
      trip.files.forEach(file => {
        if (file.type === 'image') images++;
        else documents++;
        totalSize += file.size || 0;
      });
    });
    return { images, documents, total: images + documents, totalSize };
  }, [mediaByTrip]);

  const toggleTrip = (tripId: string) => {
    setExpandedTrips(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const handleMediaClick = (file: MediaFile) => {
    if (file.type === 'image') {
      setViewerImageUrl(file.url);
    } else {
      window.open(file.url, '_blank');
    }
  };

  const handleDeleteClick = (file: MediaFile, tripId: string) => {
    const meta = file as any;
    setConfirmDelete({
      file,
      tripId,
      dayId: meta._dayId,
      entityType: meta._entityType,
      entityId: meta._entityId
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    const { file, tripId, dayId, entityType, entityId } = confirmDelete;
    const fileKey = `${file.id}-${file.path}`;

    setDeletingFiles(prev => new Set(prev).add(fileKey));

    try {
      // 1. Elimina da Storage
      if (file.path) {
        await deleteImage(file.path);
      }

      // 2. Aggiorna Firestore per rimuovere il riferimento
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const updatedData = { ...tripData.data };

        if (entityType === 'activity' && entityId) {
          const activitiesKey = `${dayId}-attivita`;
          if (updatedData[activitiesKey]?.activities) {
            const activities = updatedData[activitiesKey].activities.map((activity: any) => {
              if (activity.id === entityId) {
                const arrayKey = file.type === 'image' ? 'images' : 'documents';
                return {
                  ...activity,
                  [arrayKey]: (activity[arrayKey] || []).filter((f: any) => f.id !== file.id)
                };
              }
              return activity;
            });
            updatedData[activitiesKey] = { ...updatedData[activitiesKey], activities };
          }
        } else if (entityType === 'accommodation') {
          const accommodationKey = `${dayId}-pernottamento`;
          if (updatedData[accommodationKey]) {
            const arrayKey = file.type === 'image' ? 'images' : 'documents';
            updatedData[accommodationKey] = {
              ...updatedData[accommodationKey],
              [arrayKey]: (updatedData[accommodationKey][arrayKey] || []).filter((f: any) => f.id !== file.id)
            };
          }
        }

        await updateDoc(tripRef, {
          data: updatedData,
          updatedAt: new Date()
        });
      }

      // Notifica il parent
      onFileDeleted?.();
      setConfirmDelete(null);
    } catch (error) {
      console.error('Errore eliminazione file:', error);
      alert('Errore durante l\'eliminazione del file');
    } finally {
      setDeletingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileKey);
        return next;
      });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Espandi tutti i viaggi all'apertura
  React.useEffect(() => {
    if (isOpen && mediaByTrip.length > 0) {
      setExpandedTrips(new Set(mediaByTrip.map(t => t.tripId)));
    }
  }, [isOpen, mediaByTrip]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <motion.div
              className="w-full max-w-lg sm:rounded-2xl sm:mx-4 rounded-t-3xl overflow-hidden flex flex-col"
              style={{
                maxHeight: '85vh',
                backgroundColor: colors.bgCard
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <Image size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: colors.text }}
                    >
                      I tuoi file
                    </h2>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {stats.images} foto, {stats.documents} documenti • {formatBytes(stats.totalSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} style={{ color: colors.textMuted }} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
                {stats.total === 0 ? (
                  <div className="text-center py-12">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: colors.bgSubtle }}
                    >
                      <Image size={28} style={{ color: colors.textMuted }} />
                    </div>
                    <p
                      className="text-base font-medium mb-1"
                      style={{ color: colors.text }}
                    >
                      Nessun file caricato
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      I file che carichi nei tuoi viaggi appariranno qui
                    </p>
                  </div>
                ) : (
                  mediaByTrip.map(tripMedia => {
                    const isExpanded = expandedTrips.has(tripMedia.tripId);

                    return (
                      <div
                        key={tripMedia.tripId}
                        className="rounded-xl overflow-hidden"
                        style={{ backgroundColor: colors.bgSubtle }}
                      >
                        {/* Trip Header */}
                        <button
                          onClick={() => toggleTrip(tripMedia.tripId)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {tripMedia.tripImage ? (
                              <img
                                src={tripMedia.tripImage}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: rawColors.accentSoft }}
                              >
                                <Image size={16} style={{ color: rawColors.accent }} />
                              </div>
                            )}
                            <div className="text-left">
                              <p
                                className="text-sm font-medium"
                                style={{ color: colors.text }}
                              >
                                {tripMedia.tripName}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: colors.textMuted }}
                              >
                                {tripMedia.files.length} file • {formatBytes(tripMedia.totalSize)}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp size={18} style={{ color: colors.textMuted }} />
                          ) : (
                            <ChevronDown size={18} style={{ color: colors.textMuted }} />
                          )}
                        </button>

                        {/* Files Grid */}
                        {isExpanded && (
                          <div className="px-4 pb-4">
                            <div className="grid grid-cols-3 gap-2">
                              {tripMedia.files.map(file => {
                                const fileKey = `${file.id}-${file.path}`;
                                const isDeleting = deletingFiles.has(fileKey);

                                return (
                                  <div
                                    key={file.id}
                                    className="relative group"
                                  >
                                    {file.type === 'image' ? (
                                      <button
                                        onClick={() => handleMediaClick(file)}
                                        className="aspect-square w-full rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                                        disabled={isDeleting}
                                      >
                                        <img
                                          src={file.url}
                                          alt=""
                                          className={`w-full h-full object-cover ${isDeleting ? 'opacity-50' : ''}`}
                                        />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleMediaClick(file)}
                                        className="aspect-square w-full rounded-lg flex flex-col items-center justify-center p-2 hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: '#FEE2E2' }}
                                        disabled={isDeleting}
                                      >
                                        <FileDown size={20} style={{ color: '#DC2626' }} />
                                        <span
                                          className="text-[10px] mt-1 truncate w-full text-center"
                                          style={{ color: '#DC2626' }}
                                        >
                                          {file.name?.slice(0, 12) || 'PDF'}
                                        </span>
                                      </button>
                                    )}

                                    {/* Size badge */}
                                    {file.size && (
                                      <div
                                        className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}
                                      >
                                        {formatBytes(file.size)}
                                      </div>
                                    )}

                                    {/* Delete button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(file, tripMedia.tripId);
                                      }}
                                      className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      disabled={isDeleting}
                                    >
                                      <Trash2 size={12} />
                                    </button>

                                    {/* Activity type icon */}
                                    <div className="absolute bottom-1 left-1">
                                      <div
                                        className="p-1 rounded"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                                      >
                                        <ActivityTypeIcon type={file.activityType} size={12} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Viewer */}
      <ImageViewer
        isOpen={viewerImageUrl !== null}
        imageUrl={viewerImageUrl || ''}
        onClose={() => setViewerImageUrl(null)}
      />

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Elimina file
                  </h3>
                  <p className="text-sm text-gray-500">
                    Questa azione non può essere annullata
                  </p>
                </div>
              </div>

              {confirmDelete.file.type === 'image' && (
                <img
                  src={confirmDelete.file.url}
                  alt=""
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}

              {confirmDelete.file.type === 'document' && (
                <div
                  className="w-full h-20 rounded-lg flex items-center justify-center gap-2 mb-4"
                  style={{ backgroundColor: '#FEE2E2' }}
                >
                  <FileDown size={24} style={{ color: '#DC2626' }} />
                  <span className="text-sm font-medium" style={{ color: '#DC2626' }}>
                    {confirmDelete.file.name || 'Documento PDF'}
                  </span>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Il file verrà eliminato definitivamente dallo storage.
                {confirmDelete.file.size && (
                  <span className="font-medium"> Libererai {formatBytes(confirmDelete.file.size)}.</span>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  disabled={deletingFiles.size > 0}
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={deletingFiles.size > 0}
                >
                  {deletingFiles.size > 0 ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Eliminazione...
                    </>
                  ) : (
                    'Elimina'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UserStorageModal;
