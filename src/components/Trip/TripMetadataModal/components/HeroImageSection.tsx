import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { colors, rawColors } from '../../../../styles/theme';
import type { HeroImageSectionProps } from '../types';

/**
 * Gradiente placeholder quando non c'è immagine
 * Usa i colori del design system: accent → warm
 */
const PLACEHOLDER_GRADIENT = `linear-gradient(135deg,
  ${rawColors.accent} 0%,
  ${rawColors.warm} 100%
)`;

const HeroImageSection: React.FC<HeroImageSectionProps> = ({
  image,
  isUploading,
  onImageUpload,
  onImageRemove,
  tripName,
  onNameChange
}) => {
  return (
    <div className="relative w-full aspect-[4/5] overflow-hidden">
      {/* Background: Image or Gradient Placeholder */}
      {image ? (
        <img
          src={image}
          alt="Cover viaggio"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full"
          style={{ background: PLACEHOLDER_GRADIENT }}
        />
      )}

      {/* Gradient overlay - fades to dark at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)'
        }}
      />

      {/* Camera/Upload Button - top right */}
      <label
        htmlFor="hero-cover-upload"
        className="absolute top-4 right-4 p-3 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        {isUploading ? (
          <Loader2 size={20} className="text-white animate-spin" />
        ) : (
          <Camera size={20} className="text-white" />
        )}
      </label>
      <input
        id="hero-cover-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageUpload}
        disabled={isUploading}
      />

      {/* Remove image button - only if there's an image */}
      {image && !isUploading && (
        <button
          type="button"
          onClick={onImageRemove}
          className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: 'white'
          }}
        >
          Rimuovi
        </button>
      )}

      {/* Title Input - bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <input
          type="text"
          value={tripName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nome del viaggio"
          className="w-full bg-transparent text-white text-2xl font-bold
                     placeholder-white/50 focus:outline-none
                     border-b-2 border-white/30 focus:border-white/60
                     transition-colors pb-2"
          style={{
            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        />
      </div>
    </div>
  );
};

export default HeroImageSection;
