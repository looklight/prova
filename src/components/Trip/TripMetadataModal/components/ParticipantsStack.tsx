import React from 'react';
import { Plus, Crown } from 'lucide-react';
import { Avatar } from '../../../ui';
import { colors, rawColors } from '../../../../styles/theme';
import type { ParticipantsStackProps } from '../types';

const ParticipantsStack: React.FC<ParticipantsStackProps> = ({
  members,
  currentUserId,
  onStackClick,
  onAddClick,
  isOwner,
  maxVisible = 5,
  mode
}) => {
  const visibleMembers = members.slice(0, maxVisible);
  const overflowCount = Math.max(0, members.length - maxVisible);

  return (
    <div className="space-y-3">
      <label
        className="block text-sm font-semibold"
        style={{ color: colors.textMuted }}
      >
        Chi partecipa
      </label>

      <div className="flex items-center gap-3">
        {/* Stacked Avatars */}
        <div
          className="flex -space-x-3 cursor-pointer"
          onClick={onStackClick}
          role="button"
          tabIndex={0}
        >
          {visibleMembers.map((member, index) => (
            <div
              key={member.userId}
              className="relative rounded-full ring-2 ring-white hover:z-10 transition-transform"
              style={{
                zIndex: visibleMembers.length - index,
                // @ts-ignore
                '--tw-ring-color': member.userId === currentUserId ? colors.accent : 'white'
              } as React.CSSProperties}
              title={member.displayName}
            >
              <Avatar
                src={member.avatar}
                name={member.displayName}
                size="md"
              />
              {/* Crown badge for owner */}
              {member.role === 'owner' && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white"
                  style={{ backgroundColor: rawColors.warning }}
                >
                  <Crown size={10} style={{ color: rawColors.warningDark }} />
                </div>
              )}
            </div>
          ))}

          {/* Overflow count */}
          {overflowCount > 0 && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold ring-2 ring-white"
              style={{
                backgroundColor: colors.bgSubtle,
                color: colors.textMuted,
                zIndex: 0
              }}
            >
              +{overflowCount}
            </div>
          )}
        </div>

        {/* Add Button - only in edit mode and if owner */}
        {mode === 'edit' && isOwner && onAddClick && (
          <button
            type="button"
            onClick={onAddClick}
            className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-colors hover:border-solid"
            style={{
              borderColor: colors.border,
              color: colors.textMuted
            }}
            title="Invita partecipanti"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {/* Helper text in create mode */}
      {mode === 'create' && (
        <p className="text-xs" style={{ color: colors.textMuted }}>
          Potrai invitare altri partecipanti dopo aver creato il viaggio
        </p>
      )}
    </div>
  );
};

export default ParticipantsStack;
