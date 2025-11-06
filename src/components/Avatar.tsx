import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  name, 
  size = 'md',
  className = '' 
}) => {
  // Dimensioni predefinite
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
    '2xl': 'w-32 h-32 text-4xl'
  };

  // Estrai iniziale (prima lettera del nome)
  const getInitial = (name: string) => {
    if (!name || name.trim() === '') return '?';
    return name.trim()[0].toUpperCase();
  };

  // Genera colore basato sul nome (consistente per stesso nome)
  const getColorFromName = (name: string) => {
    const colors = [
      'from-blue-500 to-purple-500',
      'from-green-500 to-teal-500',
      'from-pink-500 to-rose-500',
      'from-orange-500 to-amber-500',
      'from-indigo-500 to-blue-500',
      'from-red-500 to-pink-500',
      'from-yellow-500 to-orange-500',
      'from-cyan-500 to-blue-500',
      'from-violet-500 to-purple-500',
      'from-emerald-500 to-green-500'
    ];
    
    // Hash semplice del nome
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initial = getInitial(name);
  const gradientColor = getColorFromName(name);

  return src ? (
    <img
      src={src}
      alt={name}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${gradientColor} ${className}`}
    >
      {initial}
    </div>
  );
};

export default Avatar;