import React, { useState } from 'react';
import { ChevronRight, Plus, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../../ui';
import { colors, rawColors } from '../../../../styles/theme';
import type { ParticipantsStackProps } from '../types';

const ParticipantsStack: React.FC<ParticipantsStackProps> = ({
  members,
  currentUserId,
  onStackClick,
  onAddClick,
  isOwner,
  maxVisible = 4,
  mode
}) => {
  const visibleMembers = members.slice(0, maxVisible);
  const overflowCount = Math.max(0, members.length - maxVisible);
  const [showHint, setShowHint] = useState(false);

  // In create mode, show user avatar with invite hint
  if (mode === 'create') {
    const currentMember = members.find(m => m.userId === currentUserId);

    const handleAddClick = () => {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 5000);
    };

    return (
      <div
        className="w-full rounded-2xl"
        style={{ backgroundColor: colors.bgSubtle }}
      >
        <div className="px-4 py-3">
          {/* Titolo */}
          <span
            className="block text-base font-semibold mb-3"
            style={{ color: colors.text }}
          >
            Chi viaggia con te?
          </span>

          {/* Avatar + pulsante add */}
          <div className="flex items-center gap-3">
            {/* Avatar con corona */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white">
                <Avatar
                  src={currentMember?.avatar}
                  name={currentMember?.displayName || 'Tu'}
                  size="lg"
                />
              </div>
              {/* Badge corona */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white"
                style={{ backgroundColor: rawColors.warning }}
              >
                <Crown size={10} color={rawColors.warningDark} />
              </div>
            </div>

            {/* Pulsante + cliccabile */}
            <button
              type="button"
              onClick={handleAddClick}
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-dashed transition-all active:scale-95"
              style={{
                borderColor: colors.border,
                backgroundColor: 'transparent'
              }}
            >
              <Plus size={24} style={{ color: colors.textPlaceholder }} />
            </button>

            {/* Testo descrittivo - compare al click */}
            <AnimatePresence>
              {showHint && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm flex-1"
                  style={{ color: colors.textMuted }}
                >
                  Potrai invitare altri membri dopo aver creato il viaggio
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode - viaggio già creato
  return (
    <div
      className="w-full rounded-2xl"
      style={{ backgroundColor: colors.bgSubtle }}
    >
      <div className="px-4 py-3">
        {/* Titolo */}
        <span
          className="block text-base font-semibold mb-3"
          style={{ color: colors.text }}
        >
          Chi viaggia con te?
        </span>

        {/* Avatar dei membri + pulsante add */}
        <div className="flex items-center">
          {/* Avatar dei membri sovrapposti */}
          <div className="flex -space-x-3" onClick={onStackClick}>
            {visibleMembers.map((member, index) => (
              <div
                key={member.userId}
                className="relative flex-shrink-0 cursor-pointer"
                style={{ zIndex: visibleMembers.length - index }}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white">
                  <Avatar
                    src={member.avatar}
                    name={member.displayName}
                    size="lg"
                  />
                </div>
                {/* Badge corona per owner */}
                {member.role === 'owner' && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white"
                    style={{ backgroundColor: rawColors.warning, zIndex: 10 }}
                  >
                    <Crown size={10} color={rawColors.warningDark} />
                  </div>
                )}
              </div>
            ))}

            {/* Overflow count */}
            {overflowCount > 0 && (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-semibold cursor-pointer ring-2 ring-white"
                style={{
                  backgroundColor: rawColors.action,
                  color: 'white',
                  zIndex: 0
                }}
              >
                +{overflowCount}
              </div>
            )}
          </div>

          {/* Pulsante + per aggiungere membri */}
          {isOwner && onAddClick && (
            <button
              type="button"
              onClick={onAddClick}
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-dashed transition-all active:scale-95 ml-3"
              style={{
                borderColor: colors.border,
                backgroundColor: 'transparent'
              }}
            >
              <Plus size={24} style={{ color: colors.textPlaceholder }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsStack;
