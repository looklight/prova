import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

/**
 * 📅 LoadingScreen - Minimal Fade-in
 * 
 * Design ultra-minimale ottimizzato per caricamenti rapidi (<1s)
 * Logo calendario con dots + testo che pulsa
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Caricamento..."
}) => {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #3DBDB5 100%)' }}
    >
      
      {/* Logo Calendar Dots */}
      <div className="mb-8">
        <svg 
          width="80" 
          height="80" 
          viewBox="0 0 80 80" 
          fill="none"
          className="drop-shadow-lg"
        >
          <defs>
            {/* Subtle glow effect */}
            <filter id="logoGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Calendar outline */}
          <rect
            x="15"
            y="20"
            width="50"
            height="45"
            rx="4"
            stroke="white"
            strokeWidth="2.5"
            fill="none"
            opacity="0.9"
            filter="url(#logoGlow)"
          />

          {/* Top binding rings */}
          <line
            x1="28"
            y1="15"
            x2="28"
            y2="25"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <line
            x1="52"
            y1="15"
            x2="52"
            y2="25"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Header divider */}
          <line
            x1="15"
            y1="32"
            x2="65"
            y2="32"
            stroke="white"
            strokeWidth="2"
            opacity="0.9"
          />

          {/* Dots grid (3x3) */}
          {/* Row 1 */}
          <circle cx="28" cy="42" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="40" cy="42" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="0.2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="52" cy="42" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="0.4s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Row 2 */}
          <circle cx="28" cy="50" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="40" cy="50" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="0.8s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="52" cy="50" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="1s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Row 3 */}
          <circle cx="28" cy="58" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="1.2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="40" cy="58" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="1.4s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="52" cy="58" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>

      {/* Testo con pulse sottile */}
      <div className="text-center">
        <p className="text-white text-xl font-medium tracking-wide animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;