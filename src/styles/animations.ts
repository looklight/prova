// ============================================
// ALTROVE - Animation System
// Animazioni riutilizzabili per tutta l'app
// ============================================

// Durate standard
export const durations = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
} as const;

// Easing curves
export const easings = {
  // Standard easing
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Bounce/spring
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

  // Smooth
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

// Stili inline per animazioni (da usare con style={})
export const animationStyles = {
  // Fade
  fadeIn: {
    animation: `fadeIn ${durations.normal}ms ${easings.easeOut} forwards`,
  },
  fadeOut: {
    animation: `fadeOut ${durations.normal}ms ${easings.easeIn} forwards`,
  },

  // Scale + Fade (per modali, bubble, card)
  scaleIn: {
    animation: `scaleIn ${durations.normal}ms ${easings.spring} forwards`,
  },
  scaleOut: {
    animation: `scaleOut ${durations.normal}ms ${easings.easeIn} forwards`,
  },

  // Slide (per pannelli, drawer)
  slideUp: {
    animation: `slideUp ${durations.slow}ms ${easings.smooth} forwards`,
  },
  slideDown: {
    animation: `slideDown ${durations.normal}ms ${easings.easeIn} forwards`,
  },

  // Expand/Collapse (per accordion, edit mode)
  expandIn: {
    animation: `expandIn ${durations.slow}ms ${easings.smooth} forwards`,
  },
  collapseOut: {
    animation: `collapseOut ${durations.normal}ms ${easings.easeIn} forwards`,
  },

  // Bubble (per tooltip, dropdown)
  bubbleIn: {
    animation: `bubbleIn ${durations.normal}ms ${easings.spring} forwards`,
  },
  bubbleOut: {
    animation: `bubbleOut ${durations.fast}ms ${easings.easeIn} forwards`,
  },

  // Modal slide (per bottom sheets)
  modalSlideIn: {
    animation: `modalSlideIn ${durations.slow}ms ${easings.easeOut} forwards`,
  },
  modalSlideOut: {
    animation: `modalSlideOut ${durations.normal}ms ${easings.easeIn} forwards`,
  },

  // Subtle pulse (per indicare interattività)
  subtlePulse: {
    animation: `subtlePulse 600ms ${easings.easeOut} forwards`,
  },
} as const;

// CSS Keyframes da iniettare nel documento
export const keyframesCSS = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.92);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

@keyframes expandIn {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes collapseOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.97);
  }
}

@keyframes bubbleIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes bubbleOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.9) translateY(-5px);
  }
}

@keyframes modalSlideIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes modalSlideOut {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes subtlePulse {
  0% { transform: scale(1); }
  15% { transform: scale(1.08); }
  30% { transform: scale(0.97); }
  45% { transform: scale(1.03); }
  60% { transform: scale(0.99); }
  100% { transform: scale(1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

// Helper per iniettare i keyframes (chiamare una volta all'avvio dell'app)
let keyframesInjected = false;
export const injectKeyframes = () => {
  if (keyframesInjected || typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'altrove-animations';
  style.textContent = keyframesCSS;
  document.head.appendChild(style);
  keyframesInjected = true;
};

// Transition helpers per stili inline
export const transitions = {
  all: (duration = durations.normal) => ({
    transition: `all ${duration}ms ${easings.smooth}`,
  }),
  transform: (duration = durations.normal) => ({
    transition: `transform ${duration}ms ${easings.smooth}`,
  }),
  opacity: (duration = durations.normal) => ({
    transition: `opacity ${duration}ms ${easings.smooth}`,
  }),
  colors: (duration = durations.fast) => ({
    transition: `background-color ${duration}ms ${easings.ease}, color ${duration}ms ${easings.ease}, border-color ${duration}ms ${easings.ease}`,
  }),
} as const;

// Export default
export default {
  durations,
  easings,
  animationStyles,
  transitions,
  injectKeyframes,
};
