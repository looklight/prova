import React from 'react';
import { FolderOpen, ChevronRight, Image, FileDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors, rawColors } from '../../../../styles/theme';

interface MediaRepositoryButtonProps {
  imageCount: number;
  documentCount: number;
  onClick: () => void;
}

const MediaRepositoryButton: React.FC<MediaRepositoryButtonProps> = ({
  imageCount,
  documentCount,
  onClick
}) => {
  const totalCount = imageCount + documentCount;
  const hasMedia = totalCount > 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-2xl transition-all"
      style={{
        backgroundColor: hasMedia ? rawColors.accentSoft : colors.bgSubtle,
        border: 'none'
      }}
    >
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${rawColors.accent} 0%, ${rawColors.accentDark || rawColors.accent} 100%)`
            }}
          >
            <FolderOpen size={20} color="white" />
          </div>

          {/* Text */}
          <div className="flex flex-col items-start flex-1">
            <span
              className="text-base font-semibold"
              style={{ color: colors.text }}
            >
              {hasMedia ? 'Media del viaggio' : 'Nessun media'}
            </span>
            <div
              className="flex items-center gap-3 text-sm"
              style={{ color: colors.textMuted }}
            >
              {hasMedia ? (
                <>
                  <span className="flex items-center gap-1">
                    <Image size={14} />
                    {imageCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileDown size={14} />
                    {documentCount}
                  </span>
                </>
              ) : (
                <span>Carica foto e documenti</span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight
            size={20}
            style={{ color: colors.textMuted }}
            className="flex-shrink-0"
          />
        </div>
      </div>
    </motion.button>
  );
};

export default MediaRepositoryButton;
