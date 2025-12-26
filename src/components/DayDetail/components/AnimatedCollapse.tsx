import React, { useState, useEffect } from 'react';

// ============================================
// AnimatedCollapse
// Wrapper per animare espansione/compressione
// Usa CSS grid per animazione fluida height: auto
// ============================================

interface AnimatedCollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

const AnimatedCollapse: React.FC<AnimatedCollapseProps> = ({
  isOpen,
  children,
  className = ''
}) => {
  // Track quando l'animazione è completata per permettere overflow visible
  const [isFullyOpen, setIsFullyOpen] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      // Aspetta fine animazione (300ms) prima di permettere overflow
      const timer = setTimeout(() => setIsFullyOpen(true), 300);
      return () => clearTimeout(timer);
    } else {
      // Quando si chiude, nascondi subito overflow
      setIsFullyOpen(false);
    }
  }, [isOpen]);

  return (
    <div
      className={`grid transition-all duration-300 ease-out ${className}`}
      style={{
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        opacity: isOpen ? 1 : 0
      }}
    >
      <div style={{ overflow: isFullyOpen ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </div>
  );
};

export default AnimatedCollapse;
