import React from 'react';
import { ChevronRight, Image, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors } from '../../../../styles/theme';

interface MediaRepositoryButtonProps {
  imageCount: number;
  documentCount: number;
  previews: string[];
  onClick: () => void;
}

const MediaRepositoryButton: React.FC<MediaRepositoryButtonProps> = ({
  imageCount,
  documentCount,
  previews,
  onClick
}) => {
  const totalCount = imageCount + documentCount;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left rounded-2xl"
      style={{ backgroundColor: colors.bgSubtle }}
    >
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-sm font-medium"
            style={{ color: colors.textMuted }}
          >
            Documenti di viaggio
          </span>
          <div className="flex items-center gap-1" style={{ color: colors.textMuted }}>
            <span className="text-xs flex items-center gap-1">
              <Image size={12} />
              {imageCount}
            </span>
            <span className="text-xs flex items-center gap-1 ml-2">
              <FileText size={12} />
              {documentCount}
            </span>
            <ChevronRight size={16} className="ml-1" />
          </div>
        </div>

        {/* Preview Grid - stesso formato del DayDetail */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.slice(0, 6).map((url, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg overflow-hidden"
                style={{ backgroundColor: colors.bgCard }}
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* Mostra conteggio extra se ci sono più di 6 immagini */}
        {totalCount > 6 && (
          <div
            className="text-xs text-center mt-3"
            style={{ color: colors.textMuted }}
          >
            +{totalCount - 6} altri file
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default MediaRepositoryButton;
