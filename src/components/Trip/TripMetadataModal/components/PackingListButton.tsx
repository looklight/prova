import React from 'react';
import { Package, ChevronRight } from 'lucide-react';
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
    <div className="space-y-3">
      <label
        className="block text-sm font-semibold"
        style={{ color: colors.textMuted }}
      >
        Packing List
      </label>

      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-4 rounded-xl transition-all active:scale-[0.98]"
        style={{
          backgroundColor: colors.bgSubtle,
          border: `1px solid ${colors.border}`
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: allChecked ? rawColors.successSoft : colors.accentSoft
          }}
        >
          <Package
            size={20}
            style={{ color: allChecked ? rawColors.success : rawColors.accent }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 text-left">
          <p
            className="font-semibold"
            style={{ color: colors.text }}
          >
            {hasItems ? `${itemCount} oggetti` : 'Crea la tua lista'}
          </p>
          <p
            className="text-sm"
            style={{ color: colors.textMuted }}
          >
            {hasItems
              ? allChecked
                ? 'Tutto pronto!'
                : `${checkedCount}/${itemCount} pronti`
              : 'Aggiungi cosa portare'}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight
          size={20}
          style={{ color: colors.textMuted }}
        />
      </button>
    </div>
  );
};

export default PackingListButton;
