import React from 'react';
import { Edit2, Check, Plus, ChevronLeft, Trash2, Calendar, Layers } from 'lucide-react';

type EditTarget = 'days' | 'categories';

interface CalendarHeaderProps {
  trip: any;
  editMode: boolean;
  editTarget: EditTarget;
  selectedDays: number[];
  moveAfterIndex: number | null;
  onBack?: () => void;
  onMetadataClick: () => void;
  onEditModeToggle: () => void;
  onEditTargetChange: (target: EditTarget) => void;
  onRemoveSelectedDays: () => void;
  onAddDay: () => void;
  onMoveAfterChange: (value: number | null) => void;
  onMoveDays: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  trip,
  editMode,
  editTarget,
  selectedDays,
  moveAfterIndex,
  onBack,
  onMetadataClick,
  onEditModeToggle,
  onEditTargetChange,
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
        
        {/* TITOLO VIAGGIO + AVATAR */}
        <div 
          className="flex items-center gap-2 flex-1 min-w-0 ml-0 mr-2 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -m-2 transition-colors"
          onClick={onMetadataClick}
        >
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
          
          <h1 className="text-xl font-bold flex-1 min-w-0 truncate">
            {trip.metadata?.name || trip.name}
          </h1>
        </div>
        
        {/* BOTTONE EDIT/FINE */}
        <button
          onClick={onEditModeToggle}
          className={`rounded-full flex items-center gap-1 font-semibold transition-all duration-200 shadow-sm flex-shrink-0 ${
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
        <div className="space-y-2 mt-2 animate-fade-in-down">
          
          {/* TOGGLE: Giorni / Categorie */}
          <div className="relative flex bg-gray-100 rounded-full p-1">
            {/* Indicatore sliding */}
            <div 
              className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm transition-all duration-200 ease-out"
              style={{
                left: editTarget === 'days' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            
            <button
              onClick={() => onEditTargetChange('days')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-sm font-medium transition-colors duration-200 ${
                editTarget === 'days' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Calendar size={16} />
              <span>Giorni</span>
            </button>
            <button
              onClick={() => onEditTargetChange('categories')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-sm font-medium transition-colors duration-200 ${
                editTarget === 'categories' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Layers size={16} />
              <span>Categorie</span>
            </button>
          </div>

          {/* TOOLBAR GIORNI */}
          {editTarget === 'days' && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex gap-2">
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
                
                <button 
                  onClick={onAddDay} 
                  className="flex-1 py-2 bg-green-500 text-white rounded-full text-sm font-medium flex items-center justify-center gap-1 hover:bg-green-600 active:bg-green-700 active:scale-95 transition-all"
                >
                  <Plus size={16} /> Giorno ({trip.days.length})
                </button>
              </div>
              
              {selectedDays.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg animate-fade-in">
                  <div className="text-sm font-medium mb-2">{selectedDays.length} giorni selezionati</div>
                  
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
                  
                  <button
                    onClick={onMoveDays}
                    disabled={moveAfterIndex === null}
                    className="w-full py-2 bg-blue-500 text-white rounded-full text-sm font-medium disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
                  >
                    Sposta
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TOOLBAR CATEGORIE */}
          {editTarget === 'categories' && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in">
              <p className="text-xs text-gray-600 leading-relaxed">
                Puoi usare il <span className="font-medium">Drag&Drop</span> per riordinare le categorie
              </p>
            </div>
          )}
        </div>
      )}

      {/* CSS per animazioni */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInDown {
          from { 
            opacity: 0; 
            transform: translateY(-8px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 200ms ease-out;
        }
        
        .animate-fade-in-down {
          animation: fadeInDown 250ms ease-out;
        }
      `}</style>
    </div>
  );
};

export default CalendarHeader;