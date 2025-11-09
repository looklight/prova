import React from 'react';
import { Edit2, Check, Plus, ChevronLeft, Trash2 } from 'lucide-react';

interface CalendarHeaderProps {
  trip: any;
  editMode: boolean;
  selectedDays: number[];
  moveAfterIndex: number | null;
  onBack?: () => void;
  onMetadataClick: () => void;
  onEditModeToggle: () => void;
  onRemoveSelectedDays: () => void;
  onAddDay: () => void;
  onMoveAfterChange: (value: number | null) => void;
  onMoveDays: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  trip,
  editMode,
  selectedDays,
  moveAfterIndex,
  onBack,
  onMetadataClick,
  onEditModeToggle,
  onRemoveSelectedDays,
  onAddDay,
  onMoveAfterChange,
  onMoveDays
}) => {
  return (
    <div className="bg-white px-2 py-4 shadow-sm sticky top-0 z-20">
      {/* ========== HEADER PRINCIPALE ========== */}
      <div className="flex items-center justify-between mb-2">
        
        {/* Bottone BACK (solo mobile) */}
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full ml-2 mr-1">
            <ChevronLeft size={24} />
          </button>
        )}
        
        {/* TITOLO VIAGGIO + AVATAR (cliccabile per metadata) */}
        <div 
          className="flex items-center gap-2 flex-1 min-w-0 ml-0 mr-2 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -m-2 transition-colors"
          onClick={onMetadataClick}
        >
          {/* Avatar/Logo */}
          <div className="flex-shrink-0">
            {trip.image || trip.metadata?.image ? (
              <img 
                src={trip.image || trip.metadata?.image} 
                alt="Trip" 
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" 
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {(trip.name || trip.metadata?.name || 'N')[0].toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Nome viaggio */}
          <h1 className="text-xl font-bold flex-1 min-w-0 truncate">
            {trip.metadata?.name || trip.name}
          </h1>
        </div>
        
        {/* 🖊️ BOTTONE EDIT/FINE (ingrandito: p-3 + size 24) */}
        <button
          onClick={onEditModeToggle}
          className={`rounded-full flex items-center gap-1 font-semibold transition-all shadow-sm flex-shrink-0 ${
            editMode 
              ? 'bg-green-100 text-green-600 hover:bg-green-200 px-3 py-3 mr-2' 
              : 'bg-gray-200 hover:bg-green-200 text-gray-700 hover:text-green-900 p-3 mr-4'
          }`}
        >
          {editMode ? (
            <>
              <Check size={24} />
              <span>Fine</span>
            </>
          ) : (
            <Edit2 size={24} />
          )}
        </button>
      </div>

      {/* ========== TOOLBAR EDIT MODE ========== */}
      {editMode && (
        <div className="space-y-2 mt-2">
          
          {/* Bottoni RIMUOVI e AGGIUNGI */}
          <div className="flex gap-2">
            {/* Bottone RIMUOVI giorni selezionati */}
            <button 
              onClick={onRemoveSelectedDays} 
              disabled={selectedDays.length === 0}
              className={`flex-1 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-1 transition-all ${
                selectedDays.length > 0 
                  ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 active:scale-95' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Trash2 size={16} /> Rimuovi {selectedDays.length > 0 && `(${selectedDays.length})`}
            </button>
            
            {/* Bottone AGGIUNGI giorno */}
            <button 
              onClick={onAddDay} 
              className="flex-1 py-2 bg-green-500 text-white rounded-full text-sm font-medium flex items-center justify-center gap-1 hover:bg-green-600 active:bg-green-700 active:scale-95 transition-all"
            >
              <Plus size={16} /> Giorno ({trip.days.length})
            </button>
          </div>
          
          {/* Pannello SPOSTA giorni (visibile solo con selezione attiva) */}
          {selectedDays.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">{selectedDays.length} giorni selezionati</div>
              
              {/* Dropdown selezione posizione */}
              <select
                value={moveAfterIndex ?? ''}
                onChange={(e) => onMoveAfterChange(e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
              >
                <option value="">Sposta dopo il giorno...</option>
                {trip.days.map((day: any, index: number) => (
                  <option key={day.id} value={index}>Giorno {day.number}</option>
                ))}
              </select>
              
              {/* Bottone conferma spostamento */}
              <button
                onClick={onMoveDays}
                disabled={moveAfterIndex === null}
                className="w-full py-2 bg-blue-500 text-white rounded-full text-sm font-medium disabled:bg-gray-300"
              >
                Sposta
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarHeader;