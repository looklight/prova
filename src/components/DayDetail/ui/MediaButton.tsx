import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MediaButtonProps {
  icon: LucideIcon;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
  onClick?: () => void;
  isLabel?: boolean;
  children?: React.ReactNode;
}

const MediaButton: React.FC<MediaButtonProps> = ({ 
  icon: Icon, 
  label, 
  color, 
  onClick, 
  isLabel = false,
  children 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 active:bg-blue-100 text-blue-700',
    green: 'bg-green-50 active:bg-green-100 text-green-700',
    purple: 'bg-purple-50 active:bg-purple-100 text-purple-700',
    amber: 'bg-amber-50 active:bg-amber-100 text-amber-700'
  };

  const baseClass = `flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors px-3 py-2.5 ${colorClasses[color]}`;

  if (isLabel) {
    return (
      <label className={`${baseClass} cursor-pointer`}>
        <Icon size={16} />
        <span>{label}</span>
        {children}
      </label>
    );
  }

  return (
    <button onClick={onClick} className={baseClass} type="button">
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
};

export default MediaButton;