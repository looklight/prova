import React from 'react';
import { PanelRightClose } from 'lucide-react';
import { colors, rawColors } from '../../../styles/theme';

// ============================================
// ALTROVE - TabBar
// Barra tab: Pianificazione | Note | Spese
// Con underline animata
// ============================================

type TabId = 'planning' | 'notes' | 'expenses';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  expensesTotal?: number;
  hasNotes?: boolean;
  isDesktop?: boolean;
  onClosePanel?: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  expensesTotal = 0,
  hasNotes = false,
  isDesktop = false,
  onClosePanel
}) => {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'notes', label: 'Note' },
    { id: 'planning', label: 'Pianificazione' },
    { id: 'expenses', label: 'Spese' }
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div
      className="relative flex border-b"
      style={{ borderColor: colors.border, height: '48px' }}
    >
      {/* Pulsante chiudi pannello (solo desktop) - posizionato a sinistra */}
      {isDesktop && onClosePanel && (
        <button
          onClick={onClosePanel}
          className="flex-shrink-0 px-3 flex items-center justify-center hover:bg-gray-100 transition-colors"
          style={{ color: colors.textMuted }}
          title="Espandi calendario"
        >
          <PanelRightClose size={18} />
        </button>
      )}

      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const showExpensesBadge = tab.id === 'expenses' && expensesTotal > 0;
        const showNotesDot = tab.id === 'notes' && hasNotes;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
              isActive ? '' : 'hover:bg-gray-50'
            }`}
            style={{
              color: isActive ? rawColors.accent : colors.textMuted
            }}
          >
            <span>{tab.label}</span>

            {/* Indicatore note */}
            {showNotesDot && (
              <div
                className="ml-1.5 w-1 h-1 rounded-full"
                style={{ backgroundColor: rawColors.accent }}
              />
            )}

            {/* Badge spese */}
            {showExpensesBadge && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: colors.successSoft,
                  color: colors.success
                }}
              >
                {expensesTotal.toFixed(0)}€
              </span>
            )}
          </button>
        );
      })}

      {/* Underline animata */}
      <div
        className="absolute bottom-0 h-0.5 rounded-full transition-all duration-300 ease-out"
        style={{
          backgroundColor: rawColors.accent,
          width: `calc(${100 / tabs.length}% - 32px)`,
          left: `calc(${(activeIndex / tabs.length) * 100}% + 16px)`
        }}
      />
    </div>
  );
};

export default TabBar;