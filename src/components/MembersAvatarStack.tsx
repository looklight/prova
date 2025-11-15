import React from 'react';
import Avatar from './Avatar';

interface MembersAvatarStackProps {
  members: {
    userId: string;
    displayName: string;
    avatar?: string;
    role: 'owner' | 'member';
  }[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e?: React.MouseEvent) => void;
}

const MembersAvatarStack: React.FC<MembersAvatarStackProps> = ({
  members,
  maxVisible = 3,
  size = 'md',
  onClick
}) => {
  // Filtra solo membri attivi
  const activeMembers = members.filter(m => m);
  const visibleMembers = activeMembers.slice(0, maxVisible);
  const remainingCount = Math.max(0, activeMembers.length - maxVisible);

  // Dimensioni avatar
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const avatarSize = sizeClasses[size];

  if (activeMembers.length === 0) {
    return null;
  }

  return (
    <div 
      className={`inline-flex items-center ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      title={`${activeMembers.length} ${activeMembers.length === 1 ? 'membro' : 'membri'}`}
    >
      {/* Avatar sovrapposti */}
      <div className="flex -space-x-2">
        {visibleMembers.map((member, index) => (
          <div
            key={member.userId}
            className="relative"
            style={{ zIndex: visibleMembers.length - index }}
          >
            <Avatar
              src={member.avatar}
              name={member.displayName}
              size={size === 'sm' ? 'xs' : size}
              className="border-2 border-white shadow-sm"
            />
          </div>
        ))}

        {/* Badge +N per membri extra */}
        {remainingCount > 0 && (
          <div
            className={`${avatarSize} rounded-full border-2 border-white bg-gray-200 flex items-center justify-center font-semibold text-gray-700 shadow-sm`}
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersAvatarStack;