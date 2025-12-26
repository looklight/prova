/**
 * OfflineDisabled
 * 
 * Wrapper component che disabilita automaticamente gli input quando l'utente è offline
 */
import React from 'react';
import { useOnline } from '../../contexts/OnlineContext';

interface OfflineDisabledProps {
  children: React.ReactElement;
  tooltip?: string;
  showTooltip?: boolean;
}

const OfflineDisabled: React.FC<OfflineDisabledProps> = ({ 
  children, 
  tooltip = "Sei offline",
  showTooltip = true 
}) => {
  const isOnline = useOnline();

  if (isOnline) {
    return children;
  }

  // Verifica se il children ha flex-1 nella className
  const childClassName = children.props.className || '';
  const hasFlex1 = childClassName.includes('flex-1');

  return (
    <div 
      className={`relative ${hasFlex1 ? 'flex-1' : 'inline-block'}`}
      title={showTooltip ? tooltip : undefined}
    >
      {React.cloneElement(children, {
        disabled: true,
        className: `${childClassName} opacity-50 cursor-not-allowed`,
        style: {
          ...children.props.style,
          pointerEvents: 'none',
          ...(hasFlex1 && { width: '100%' })
        }
      })}
    </div>
  );
};

export default OfflineDisabled;