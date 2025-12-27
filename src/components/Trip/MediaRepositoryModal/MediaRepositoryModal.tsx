import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Image, FileDown, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, rawColors } from '../../../styles/theme';
import ImageViewer from '../../DayDetail/modals/ImageViewer';

// ============================================
// ALTROVE - MediaRepositoryModal
// Repository di tutti i media del viaggio
// ============================================

interface MediaItem {
  id: number;
  url: string;
  path?: string;
  name?: string;
  uploaderId?: string;
  type: 'image' | 'document';
  source: string; // es: "Attività: Visita museo" o "Pernottamento"
}

interface DayMedia {
  dayId: string;
  dayNumber: number;
  date: Date;
  items: MediaItem[];
}

interface TripDay {
  id: string;
  date: string;
}

interface MemberInfo {
  odId: string;
  displayName: string;
  avatar?: string;
}

interface MediaRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: TripDay[];
  tripData: Record<string, any>;
  members: MemberInfo[];
}

const MediaRepositoryModal: React.FC<MediaRepositoryModalProps> = ({
  isOpen,
  onClose,
  days,
  tripData,
  members
}) => {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Helper per trovare membro da odId
  const getMemberByUserId = (odId?: string) => {
    if (!odId) return null;
    return members.find(m => m.odId === odId);
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      // Espandi tutti i giorni che hanno media
      const daysWithMedia = new Set<string>();
      mediaByDay.forEach(day => {
        if (day.items.length > 0) {
          daysWithMedia.add(day.dayId);
        }
      });
      setExpandedDays(daysWithMedia);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Estrai tutti i media organizzati per giorno
  const mediaByDay = useMemo<DayMedia[]>(() => {
    if (!days || !tripData) return [];

    return days.map((day, index) => {
      const items: MediaItem[] = [];
      const dayId = day.id;

      // 1. Estrai media dalle attività
      const activitiesKey = `${dayId}-attivita`;
      const activitiesData = tripData[activitiesKey];

      if (activitiesData?.activities && Array.isArray(activitiesData.activities)) {
        activitiesData.activities.forEach((activity: any) => {
          const activityName = activity.title || 'Attività';

          // Immagini
          if (activity.images && Array.isArray(activity.images)) {
            activity.images.forEach((img: any) => {
              items.push({
                id: img.id,
                url: img.url,
                path: img.path,
                uploaderId: img.uploaderId,
                type: 'image',
                source: activityName
              });
            });
          }

          // Documenti
          if (activity.documents && Array.isArray(activity.documents)) {
            activity.documents.forEach((doc: any) => {
              items.push({
                id: doc.id,
                url: doc.url,
                path: doc.path,
                name: doc.name,
                uploaderId: doc.uploaderId,
                type: 'document',
                source: activityName
              });
            });
          }
        });
      }

      // 2. Estrai media dal pernottamento
      const accommodationKey = `${dayId}-pernottamento`;
      const accommodationData = tripData[accommodationKey];

      if (accommodationData) {
        const accommodationName = accommodationData.title || 'Pernottamento';

        // Immagini
        if (accommodationData.images && Array.isArray(accommodationData.images)) {
          accommodationData.images.forEach((img: any) => {
            items.push({
              id: img.id,
              url: img.url,
              path: img.path,
              uploaderId: img.uploaderId,
              type: 'image',
              source: accommodationName
            });
          });
        }

        // Documenti
        if (accommodationData.documents && Array.isArray(accommodationData.documents)) {
          accommodationData.documents.forEach((doc: any) => {
            items.push({
              id: doc.id,
              url: doc.url,
              path: doc.path,
              name: doc.name,
              uploaderId: doc.uploaderId,
              type: 'document',
              source: accommodationName
            });
          });
        }
      }

      return {
        dayId,
        dayNumber: index + 1,
        date: new Date(day.date),
        items
      };
    });
  }, [days, tripData]);

  // Stats totali
  const stats = useMemo(() => {
    let images = 0;
    let documents = 0;
    mediaByDay.forEach(day => {
      day.items.forEach(item => {
        if (item.type === 'image') images++;
        else documents++;
      });
    });
    return { images, documents, total: images + documents };
  }, [mediaByDay]);

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const handleMediaClick = (item: MediaItem) => {
    if (item.type === 'image') {
      setViewerImageUrl(item.url);
    } else {
      // Apri PDF in nuova tab
      window.open(item.url, '_blank');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

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
                    style={{
                      background: `linear-gradient(135deg, ${rawColors.accent} 0%, ${rawColors.accentDark || rawColors.accent} 100%)`
                    }}
                  >
                    <Image size={18} color="white" />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: colors.text }}
                    >
                      Media del viaggio
                    </h2>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {stats.images} foto, {stats.documents} documenti
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
                      Nessun media
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      Le foto e i documenti che carichi appariranno qui
                    </p>
                  </div>
                ) : (
                  mediaByDay.map(day => {
                    if (day.items.length === 0) return null;

                    const isExpanded = expandedDays.has(day.dayId);
                    const dayImages = day.items.filter(i => i.type === 'image');
                    const dayDocs = day.items.filter(i => i.type === 'document');

                    return (
                      <div
                        key={day.dayId}
                        className="rounded-xl overflow-hidden"
                        style={{ backgroundColor: colors.bgSubtle }}
                      >
                        {/* Day Header */}
                        <button
                          onClick={() => toggleDay(day.dayId)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                              style={{
                                backgroundColor: rawColors.accent,
                                color: 'white'
                              }}
                            >
                              {day.dayNumber}
                            </div>
                            <div className="text-left">
                              <p
                                className="text-sm font-medium"
                                style={{ color: colors.text }}
                              >
                                Giorno {day.dayNumber}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: colors.textMuted }}
                              >
                                {formatDate(day.date)} • {day.items.length} file
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp size={18} style={{ color: colors.textMuted }} />
                          ) : (
                            <ChevronDown size={18} style={{ color: colors.textMuted }} />
                          )}
                        </button>

                        {/* Day Content - raggruppato per attività */}
                        {isExpanded && (() => {
                          // Raggruppa i media per source (nome attività)
                          const mediaBySource = new Map<string, MediaItem[]>();
                          day.items.forEach(item => {
                            const existing = mediaBySource.get(item.source) || [];
                            existing.push(item);
                            mediaBySource.set(item.source, existing);
                          });

                          return (
                            <div className="px-4 pb-4 space-y-4">
                              {Array.from(mediaBySource.entries()).map(([source, items]) => {
                                const images = items.filter(i => i.type === 'image');
                                const docs = items.filter(i => i.type === 'document');

                                return (
                                  <div key={source}>
                                    {/* Header attività */}
                                    <p
                                      className="text-xs font-semibold mb-2 px-2 py-1 rounded-md inline-block"
                                      style={{
                                        color: colors.text,
                                        backgroundColor: 'rgba(0,0,0,0.05)'
                                      }}
                                    >
                                      {source}
                                    </p>

                                    {/* Immagini dell'attività */}
                                    {images.length > 0 && (
                                      <div className="grid grid-cols-4 gap-2 mb-2">
                                        {images.map(item => {
                                          const uploader = getMemberByUserId(item.uploaderId);
                                          return (
                                            <button
                                              key={item.id}
                                              onClick={() => handleMediaClick(item)}
                                              className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity relative"
                                            >
                                              <img
                                                src={item.url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                              />
                                              {uploader?.avatar && (
                                                <div className="absolute bottom-1 right-1">
                                                  <img
                                                    src={uploader.avatar}
                                                    alt=""
                                                    className="w-4 h-4 rounded-full border border-white object-cover"
                                                  />
                                                </div>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Documenti dell'attività */}
                                    {docs.length > 0 && (
                                      <div className="space-y-1">
                                        {docs.map(item => {
                                          const uploader = getMemberByUserId(item.uploaderId);
                                          return (
                                            <button
                                              key={item.id}
                                              onClick={() => handleMediaClick(item)}
                                              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors"
                                              style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                                            >
                                              <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative"
                                                style={{ backgroundColor: '#FEE2E2' }}
                                              >
                                                <FileDown size={14} style={{ color: '#DC2626' }} />
                                                {uploader?.avatar && (
                                                  <img
                                                    src={uploader.avatar}
                                                    alt=""
                                                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-white object-cover"
                                                  />
                                                )}
                                              </div>
                                              <p
                                                className="text-xs font-medium truncate flex-1 text-left"
                                                style={{ color: colors.text }}
                                              >
                                                {item.name || 'Documento'}
                                              </p>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
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
    </>
  );
};

export default MediaRepositoryModal;
