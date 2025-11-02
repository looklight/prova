import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MediaButtonProps {
  icon: LucideIcon;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
  onClick?: () => void;
  isLabel?: boolean;
  children?: React.ReactNode; // Per input file
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
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    green: 'bg-green-50 hover:bg-green-100 text-green-700',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700'
  };

  const baseClass = `flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors w-10 h-10 md:w-auto md:h-auto md:px-3 md:py-2.5 ${colorClasses[color]}`;

  if (isLabel) {
    return (
      <label className={`${baseClass} cursor-pointer`}>
        <Icon size={16} />
        <span className="hidden md:inline">{label}</span>
        {children}
      </label>
    );
  }

  return (
    <button onClick={onClick} className={baseClass} type="button">
      <Icon size={16} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
};

export default MediaButton;