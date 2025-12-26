import React from 'react';
import { colors, gradients } from '../../../../styles/theme';
import type { ModalFooterProps } from '../types';

const ModalFooter: React.FC<ModalFooterProps> = ({
  mode,
  onCancel,
  onSave,
  isValid = true
}) => {
  return (
    <div
      className="px-4 py-4 border-t flex gap-3"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.bgCard,
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-3 rounded-xl font-semibold transition-colors"
        style={{
          backgroundColor: colors.bgSubtle,
          color: colors.textMuted
        }}
      >
        Annulla
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={!isValid}
        className="flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: gradients.accent
        }}
      >
        {mode === 'create' ? 'Crea viaggio' : 'Salva'}
      </button>
    </div>
  );
};

export default ModalFooter;
