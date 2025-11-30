import React from 'react';

interface BookingToggleProps {
  value: 'na' | 'no' | 'yes';
  onChange: (value: 'na' | 'no' | 'yes') => void;
}

const BookingToggle: React.FC<BookingToggleProps> = ({ value, onChange }) => {
  const states = [
    { key: 'na' as const, color: 'bg-gray-400' },
    { key: 'no' as const, color: 'bg-orange-400' },
    { key: 'yes' as const, color: 'bg-green-400' }
  ];

  // Dimensioni base
  const slotSize = 32;        // Larghezza di ogni slot
  const sliderSize = 30;      // Slider leggermente più piccolo per padding visivo
  const padding = 4;          // Padding esterno del container
  const dotSize = 14;         // Pallino interno
  
  const containerWidth = (slotSize * 3) + (padding * 2);  // 96 + 8 = 104px
  const containerHeight = slotSize + (padding * 2);        // 32 + 8 = 40px

  const currentIndex = states.findIndex(s => s.key === value);
  
  // Slider centrato nello slot: padding + (slot * index) + offset per centrare
  const sliderOffset = (slotSize - sliderSize) / 2;  // (32-28)/2 = 2px
  const sliderLeft = padding + (slotSize * currentIndex) + sliderOffset;

  return (
    <div 
      className="relative inline-flex bg-gray-200 rounded-full items-center" 
      style={{ 
        width: `${containerWidth}px`, 
        height: `${containerHeight}px`,
        padding: `${padding}px`
      }}
    >
      {/* Slider animato */}
      <div 
        className={`absolute rounded-full transition-all duration-300 ease-in-out ${states[currentIndex].color}`}
        style={{ 
          width: `${sliderSize}px`, 
          height: `${sliderSize}px`, 
          left: `${sliderLeft}px`,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      
      {/* Bottoni */}
      {states.map((state) => (
        <button
          key={state.key}
          type="button"
          onClick={() => onChange(state.key)}
          className="relative z-10 flex items-center justify-center"
          style={{ 
            width: `${slotSize}px`, 
            height: `${slotSize}px`, 
            flexShrink: 0 
          }}
        >
          <div 
            className={`rounded-full transition-colors duration-200 ${
              value === state.key ? 'bg-white' : state.color
            }`}
            style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
          />
        </button>
      ))}
    </div>
  );
};

export default BookingToggle;