import React from 'react';
import { Star, Bed } from 'lucide-react';
import { colors, rawColors } from '../../styles/theme';

// ============================================
// ALTROVE - CostsByCategory
// Breakdown spese per categoria - stile moderno
// ============================================

interface CostsByCategoryProps {
  stats: {
    total: number;
    byCategory: {
      activities: number;
      accommodation: number;
    };
  };
  isDesktop?: boolean;
}

const CATEGORY_CONFIG = [
  {
    key: 'activities',
    label: 'Attività',
    icon: Star,
    color: rawColors.warm,
  },
  {
    key: 'accommodation',
    label: 'Pernottamento',
    icon: Bed,
    color: rawColors.success,
  }
];

const CostsByCategory: React.FC<CostsByCategoryProps> = ({
  stats,
  isDesktop = false
}) => {
  const total = stats.total || 1;

  return (
    <div className="space-y-4">
      {/* Barra stacked grande */}
      <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
        {CATEGORY_CONFIG.map(cat => {
          const value = stats.byCategory[cat.key as keyof typeof stats.byCategory] || 0;
          const percentage = (value / total) * 100;

          if (percentage === 0) return null;

          return (
            <div
              key={cat.key}
              className="transition-all"
              style={{
                width: `${percentage}%`,
                backgroundColor: cat.color
              }}
            />
          );
        })}
      </div>

      {/* Cards per categoria */}
      <div className="space-y-3">
        {CATEGORY_CONFIG.map(cat => {
          const Icon = cat.icon;
          const value = stats.byCategory[cat.key as keyof typeof stats.byCategory] || 0;
          const percentage = total > 0 ? (value / total) * 100 : 0;

          return (
            <div
              key={cat.key}
              className="rounded-2xl p-4 transition-all"
              style={{ backgroundColor: `${cat.color}10` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon circolare */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                  >
                    <Icon size={22} color={cat.color} strokeWidth={2} />
                  </div>

                  {/* Label + percentage */}
                  <div>
                    <p
                      className="text-base font-semibold"
                      style={{ color: colors.text }}
                    >
                      {cat.label}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      {percentage.toFixed(0)}% del totale
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <p
                  className="text-xl font-bold"
                  style={{ color: cat.color }}
                >
                  {value.toFixed(0)} €
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Messaggio se vuoto */}
      {stats.total === 0 && (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ backgroundColor: colors.bgCard }}
        >
          <p
            className="text-sm italic"
            style={{ color: colors.textPlaceholder }}
          >
            Nessuna spesa registrata
          </p>
        </div>
      )}
    </div>
  );
};

export default CostsByCategory;
