import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DayHeaderProps {
  trip: any;
  currentDay: any;
  dayIndex: number;
  onBack?: () => void;
  onChangeDayIndex: (index: number) => void;
  isDesktop: boolean;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  trip,
  currentDay,
  dayIndex,
  onBack,
  onChangeDayIndex,
  isDesktop
}) => {
  return (
    <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20">
      <div className="flex items-center mb-2">
        {!isDesktop && onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full ml-4 mr-4">
            <Calendar size={24} />
          </button>
        )}
        
        <button 
          onClick={() => dayIndex > 0 && onChangeDayIndex(dayIndex - 1)} 
          disabled={dayIndex === 0}
          className={`p-2 rounded-full ${dayIndex > 0 ? 'hover:bg-gray-100' : 'opacity-30'}`}
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="text-center flex-1 mx-2">
          <h1 className="text-xl font-bold">{trip.name}</h1>
          <div className="text-lg font-semibold">Giorno {currentDay.number}</div>
          <div className="text-xs text-gray-500">
            {currentDay.date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: '2-digit' })}
          </div>
        </div>
        
        <button 
          onClick={() => dayIndex < trip.days.length - 1 && onChangeDayIndex(dayIndex + 1)}
          disabled={dayIndex === trip.days.length - 1}
          className={`p-2 rounded-full ${dayIndex < trip.days.length - 1 ? 'hover:bg-gray-100' : 'opacity-30'}`}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default DayHeader;