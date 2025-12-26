import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// ============================================
// ALTROVE - ImageViewer
// Visualizzatore immagini fullscreen con zoom/pan
// Usa Portal per renderizzare nel body (fuori da qualsiasi container)
// Gesture: pinch to zoom, doppio tap per ingrandire, tap fuori per chiudere
// ============================================

interface ImageViewerProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  imageUrl,
  onClose
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Animazione entrata
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Blocca scroll quando aperto
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Chiudi con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Usa createPortal per renderizzare direttamente nel body
  // Questo garantisce che sia SEMPRE a schermo intero, indipendentemente
  // da dove viene chiamato il componente
  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-colors duration-300 ${
        isAnimating ? 'bg-black/95' : 'bg-transparent'
      }`}
      onClick={onClose}
    >
      {/* Image with zoom/pan - gestito solo con gesture */}
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: 'toggle', step: 2.5 }}
      >
        <TransformComponent
          wrapperStyle={{
            width: '100%',
            height: '100%'
          }}
          contentStyle={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={imageUrl}
            alt=""
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '100vh',
              maxWidth: '100vw'
            }}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>,
    document.body
  );
};

export default ImageViewer;
