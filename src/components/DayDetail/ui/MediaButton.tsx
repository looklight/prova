import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MediaButtonProps {
  icon: LucideIcon;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'cyan';
  onClick?: () => void;
  isLabel?: boolean;
  children?: React.ReactNode;
  badge?: string | number | null;
}

const MediaButton: React.FC<MediaButtonProps> = ({
  icon: Icon,
  label,
  color,
  onClick,
  isLabel = false,
  children,
  badge
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 active:bg-blue-100 text-blue-700',
    green: 'bg-green-50 active:bg-green-100 text-green-700',
    purple: 'bg-purple-50 active:bg-purple-100 text-purple-700',
    amber: 'bg-amber-50 active:bg-amber-100 text-amber-700',
    cyan: 'bg-cyan-50 active:bg-cyan-100 text-cyan-700'
  };

  const baseClass = `flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors px-3 py-2.5 ${colorClasses[color]}`;

  const content = (
    <>
      <Icon size={16} />
      {/* Da mobile la label è nascosta, da desktop visibile */}
      <span className="hidden sm:inline">{label}</span>
      {badge && (
        <span className="bg-cyan-200 text-cyan-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
          {badge}
        </span>
      )}
    </>
  );

  if (isLabel) {
    return (
      <label className={`${baseClass} cursor-pointer`}>
        {content}
        {children}
      </label>
    );
  }

  return (
    <button onClick={onClick} className={baseClass} type="button">
      {content}
    </button>
  );
};

export default MediaButton;