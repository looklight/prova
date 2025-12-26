import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  MoreHorizontal,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  LayoutGrid,
  Layers,
  Map
} from 'lucide-react';
import { OfflineDisabled } from '../ui';
import { rawColors } from '../../styles/theme';

export type EditTab = 'select' | 'move';
export type ViewMode = 'card' | 'table';

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
  /** Tab attiva in edit mode */
  editTab?: EditTab;
  /** Callback per cambiare tab */
  onEditTabChange?: (tab: EditTab) => void;
  /** Vista corrente (card = default, table = griglia) */
  viewMode?: ViewMode;
  /** Callback per cambiare vista */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Callback per aprire la mappa */
  onMapClick?: () => void;
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
  onMoveDays,
  editTab = 'select',
  onEditTabChange,
  viewMode = 'card',
  onViewModeChange,
  onMapClick
}) => {
  // Tab locale se non gestito dal parent
  const [localTab, setLocalTab] = useState<EditTab>('select');
  const activeTab = onEditTabChange ? editTab : localTab;
  const setActiveTab = onEditTabChange || setLocalTab;

  // Reset tab quando si esce da edit mode o si deselezionano tutti i giorni
  useEffect(() => {
    if (!editMode || selectedDays.length === 0) {
      setActiveTab('select');
    }
  }, [editMode, selectedDays.length]);

  const hasSelection = selectedDays.length > 0;

  return (
    <div
      className="px-3 pt-2.5 pb-1.5 -mb-1"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* ========== HEADER COMPATTO ========== */}
      <div className="flex items-center gap-2">

        {/* Bottone BACK */}
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <ChevronLeft size={21} strokeWidth={2} color={rawColors.textWarm} />
          </button>
        )}

        {/* NOME VIAGGIO (pill cliccabile) */}
        <OfflineDisabled>
          <button
            onClick={onMetadataClick}
            className="flex-1 bg-white px-4 py-2.5 rounded-full shadow-sm hover:bg-gray-50 transition-colors min-w-0"
          >
            <span
              className="text-[15px] font-semibold truncate block"
              style={{ color: rawColors.textWarm }}
            >
              {trip.metadata?.name || trip.name}
            </span>
          </button>
        </OfflineDisabled>

        {/* BOTTONE MAPPA */}
        {onMapClick && (
          <button
            onClick={onMapClick}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors flex-shrink-0"
            title="Apri mappa"
          >
            <Map size={19} strokeWidth={2} color={rawColors.accent} />
          </button>
        )}

        {/* BOTTONE EDIT/FINE */}
        <OfflineDisabled>
          <button
            onClick={onEditModeToggle}
            className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-all flex-shrink-0 ${
              editMode
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            {editMode ? (
              <Check size={19} strokeWidth={2.5} color="#FFFFFF" />
            ) : (
              <MoreHorizontal size={19} strokeWidth={2} color={rawColors.textWarm} />
            )}
          </button>
        </OfflineDisabled>
      </div>

      {/* ========== TOOLBAR EDIT MODE ========== */}
      {editMode && (
        <div className="mt-3 animate-fade-in-down">
          <div
            className="flex items-center gap-1.5 rounded-full p-1 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
          >
            {/* === GRUPPO 1: Toggle Vista === */}
            <div
              className="flex rounded-full p-0.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
            >
              <button
                onClick={() => onViewModeChange?.('card')}
                className={`p-2 rounded-full transition-all ${
                  viewMode === 'card'
                    ? 'bg-white shadow-sm'
                    : ''
                }`}
                title="Vista card"
              >
                <Layers
                  size={16}
                  color={viewMode === 'card' ? rawColors.textWarm : rawColors.textWarmMuted}
                />
              </button>
              <button
                onClick={() => onViewModeChange?.('table')}
                className={`p-2 rounded-full transition-all ${
                  viewMode === 'table'
                    ? 'bg-white shadow-sm'
                    : ''
                }`}
                title="Vista tabella"
              >
                <LayoutGrid
                  size={16}
                  color={viewMode === 'table' ? rawColors.textWarm : rawColors.textWarmMuted}
                />
              </button>
            </div>

            {/* Separatore (sempre visibile) */}
            <div
              className="w-px h-6 flex-shrink-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
            />

            {/* === GRUPPO 2: Hint + Azioni selezione con slide === */}
            <div className="flex-1 relative h-9 overflow-hidden">
              {/* Hint per modifica date (visibile quando non c'è selezione) */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
                style={{ 
                  opacity: hasSelection ? 0 : 1,
                  pointerEvents: hasSelection ? 'none' : 'auto'
                }}
              >
                <span
                  className="text-[11px] text-center px-2"
                  style={{ color: rawColors.textWarmMuted }}
                >
                  Puoi modificare le date di viaggio dal calendario
                </span>
              </div>

              {/* Azioni selezione (slide da sinistra) */}
              <div
                className="absolute inset-y-0 left-0 flex items-center gap-2 transition-transform duration-250 ease-out"
                style={{
                  transform: hasSelection ? 'translateX(0)' : 'translateX(-100%)',
                }}
              >
                {/* Badge contatore */}
                <div
                  className="min-w-[28px] h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: rawColors.accent,
                    color: 'white'
                  }}
                >
                  {selectedDays.length}
                </div>

                {/* Sposta */}
                <button
                  onClick={() => {
                    if (activeTab === 'move') {
                      onMoveDays();
                    } else {
                      setActiveTab('move');
                    }
                  }}
                  className="h-9 px-2.5 rounded-full flex items-center gap-1 text-[12px] font-medium transition-all flex-shrink-0 text-white"
                  style={{
                    backgroundColor: activeTab === 'move' ? rawColors.actionDark : rawColors.action
                  }}
                >
                  <ArrowRight size={13} />
                  <span>Sposta</span>
                </button>

                {/* Elimina */}
                <button
                  onClick={onRemoveSelectedDays}
                  className="p-2 rounded-full transition-colors hover:bg-red-50 flex-shrink-0"
                >
                  <Trash2 size={16} color={rawColors.danger} />
                </button>
              </div>
            </div>

            {/* === GRUPPO 3: Aggiungi === */}
            <button
              onClick={onAddDay}
              className="h-9 px-2.5 rounded-full flex items-center gap-1 text-[12px] font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] flex-shrink-0"
              style={{ backgroundColor: rawColors.accent }}
            >
              <Plus size={13} strokeWidth={2.5} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Giorno</span>
              <span
                className="px-1 rounded-full text-[11px] font-bold flex-shrink-0"
                style={{ backgroundColor: rawColors.accentDark, color: 'white' }}
              >
                {trip.days.length}
              </span>
            </button>
          </div>

          {/* Istruzioni contestuali per Sposta */}
          {activeTab === 'move' && hasSelection && (
            <div
              className="mt-2 px-3 py-2 rounded-lg text-xs text-center animate-fade-in"
              style={{ backgroundColor: rawColors.accentSoft, color: rawColors.accentDark }}
            >
              Tocca un giorno per spostare {selectedDays.length === 1 ? 'il giorno selezionato' : `i ${selectedDays.length} giorni`} dopo di esso
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
        
        .duration-250 {
          transition-duration: 250ms;
        }
      `}</style>
    </div>
  );
};

export default CalendarHeader;