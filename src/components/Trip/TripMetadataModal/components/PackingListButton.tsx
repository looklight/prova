import React from 'react';
import { Package, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { colors, rawColors } from '../../../../styles/theme';
import type { PackingListButtonProps } from '../types';

const PackingListButton: React.FC<PackingListButtonProps> = ({
  itemCount,
  checkedCount,
  onClick
}) => {
  const hasItems = itemCount > 0;
  const allChecked = hasItems && checkedCount === itemCount;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-2xl transition-all"
      style={{
        backgroundColor: hasItems
          ? allChecked
            ? rawColors.successSoft
            : rawColors.warmSoft
          : colors.bgSubtle,
        border: 'none'
      }}
    >
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: allChecked
                ? `linear-gradient(135deg, ${rawColors.success} 0%, ${rawColors.successDark} 100%)`
                : hasItems
                  ? rawColors.warm
                  : `linear-gradient(135deg, ${rawColors.warm} 0%, ${rawColors.warmDark} 100%)`
            }}
          >
            {allChecked ? (
              <CheckCircle2 size={20} color="white" />
            ) : (
              <Package size={20} color="white" />
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col items-start flex-1">
            <span
              className="text-base font-semibold"
              style={{ color: colors.text }}
            >
              {hasItems
                ? allChecked
                  ? 'Tutto pronto!'
                  : 'Packing list'
                : 'Cosa portare?'}
            </span>
            <span
              className="text-sm"
              style={{ color: allChecked ? rawColors.success : colors.textMuted }}
            >
              {hasItems
                ? `${checkedCount}/${itemCount} oggetti pronti`
                : 'Crea la tua Packing List'}
            </span>
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

export default PackingListButton;
