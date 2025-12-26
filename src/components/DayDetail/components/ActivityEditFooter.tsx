import React from 'react';
import { Trash2 } from 'lucide-react';
import { colors } from '../../../styles/theme';

// ============================================
// ALTROVE - ActivityEditFooter
// Footer per ActivityEditMode con elimina/fine
// ============================================

interface ActivityEditFooterProps {
  onDelete: () => void;
  onClose: () => void;
}

const ActivityEditFooter: React.FC<ActivityEditFooterProps> = ({
  onDelete,
  onClose
}) => {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-t"
      style={{ borderColor: colors.border }}
    >
      {/* Elimina */}
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors hover:bg-red-50"
        style={{ color: colors.warm }}
      >
        <Trash2 size={16} />
        <span>Elimina</span>
      </button>

      {/* Fine */}
      <button
        onClick={onClose}
        className="text-sm font-medium px-5 py-2 rounded-lg transition-colors hover:opacity-90"
        style={{
          backgroundColor: colors.warm,
          color: 'white'
        }}
      >
        Fine
      </button>
    </div>
  );
};

export default ActivityEditFooter;
