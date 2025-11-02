import React from 'react';

interface BookingToggleProps {
  value: 'na' | 'no' | 'yes';
  onChange: (value: 'na' | 'no' | 'yes') => void;
}

const BookingToggle: React.FC<BookingToggleProps> = ({ value, onChange }) => {
  const states = [
    { key: 'na' as const, color: 'bg-gray-400', position: 0 },
    { key: 'no' as const, color: 'bg-orange-400', position: 1 },
    { key: 'yes' as const, color: 'bg-green-400', position: 2 }
  ];

  const currentIndex = states.findIndex(s => s.key === value);
  const sliderLeft = currentIndex * 36;

  return (
    <div 
      className="relative inline-flex bg-gray-200 rounded-full p-1 gap-0" 
      style={{ width: '114px', height: '40px' }}
    >
      <div 
        className={`absolute rounded-full transition-all duration-300 ease-in-out ${states[currentIndex].color}`}
        style={{ 
          width: '34px', 
          height: '32px', 
          left: `${4 + sliderLeft}px`,
          top: '4px'
        }}
      />
      
      {states.map((state) => (
        <button
          key={state.key}
          type="button"
          onClick={() => onChange(state.key)}
          className="relative z-10 flex items-center justify-center"
          style={{ width: '36px', height: '32px', flexShrink: 0 }}
        >
          <div 
            className={`rounded-full transition-colors duration-200 ${
              value === state.key ? 'bg-white' : state.color
            }`}
            style={{ width: '16px', height: '16px' }}
          />
        </button>
      ))}
    </div>
  );
};

export default BookingToggle;