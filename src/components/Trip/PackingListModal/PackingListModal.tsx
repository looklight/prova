import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, Settings2, Package, Plus, Check } from 'lucide-react';
import { colors, rawColors } from '../../../styles/theme';
import { Avatar } from '../../ui';
import type { PackingListModalProps, PackingListMode, PackingCategory, PackingItem } from './types';

// Oggetti suggeriti per categoria (ordinati alfabeticamente)
const SUGGESTED_ITEMS: Record<PackingCategory, string[]> = {
  documents: ['Assicurazione viaggio', 'Carta d\'identità', 'Passaporto', 'Patente', 'Patente internazionale', 'Tessera sanitaria', 'Visto'],
  clothing: ['Calzini', 'Cappello', 'Ciabatte', 'Costume', 'Felpa', 'Giacca', 'Intimo', 'Magliette', 'Occhiali da sole', 'Pantaloni', 'Pigiama', 'Scarpe comode'],
  toiletries: ['Bagnoschiuma', 'Cerotti', 'Crema solare', 'Dentifricio', 'Deodorante', 'Medicinali', 'Rasoio', 'Shampoo', 'Spazzolino', 'Trucchi'],
  electronics: ['Adattatore presa', 'Caricatore telefono', 'Cavetti', 'Cuffie', 'E-reader', 'Fotocamera', 'Power bank', 'Tablet'],
  other: ['Borsa da spiaggia', 'Bottiglia acqua', 'Cuscino viaggio', 'Guida turistica', 'Lucchetto', 'Ombrello', 'Snack', 'Zaino']
};

// Configurazione categorie
const CATEGORIES: { id: PackingCategory; label: string; emoji: string; color: string }[] = [
  { id: 'documents', label: 'Documenti', emoji: '📄', color: rawColors.action },
  { id: 'clothing', label: 'Vestiti', emoji: '👕', color: '#9333EA' },
  { id: 'toiletries', label: 'Igiene', emoji: '🧴', color: '#EC4899' },
  { id: 'electronics', label: 'Tech', emoji: '📱', color: '#F97316' },
  { id: 'other', label: 'Altro', emoji: '🎒', color: rawColors.textMuted }
];

const PackingListModal: React.FC<PackingListModalProps> = ({
  isOpen,
  onClose,
  packingList,
  onPackingListChange,
  members,
  currentUserId
}) => {
  const [mode, setMode] = useState<PackingListMode>('check');
  const [selectedCategory, setSelectedCategory] = useState<PackingCategory>('documents');
  const [customItemName, setCustomItemName] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('check');
      setSelectedCategory('documents');
      setCustomItemName('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Stats
  const totalItems = packingList.items.length;
  const checkedItems = packingList.items.filter(item =>
    item.checkedBy.includes(currentUserId)
  ).length;

  // Items già aggiunti (per nascondere i suggerimenti)
  const addedItemNames = useMemo(() =>
    new Set(packingList.items.map(i => i.name.toLowerCase())),
    [packingList.items]
  );

  // Handlers
  const handleAddItem = (name: string, category: PackingCategory) => {
    if (addedItemNames.has(name.toLowerCase())) return;

    const newItem: PackingItem = {
      id: Date.now().toString(),
      name: name.trim(),
      category,
      checkedBy: []
    };

    onPackingListChange({
      items: [...packingList.items, newItem],
      updatedAt: new Date()
    });
  };

  const handleRemoveItem = (id: string) => {
    onPackingListChange({
      items: packingList.items.filter(item => item.id !== id),
      updatedAt: new Date()
    });
  };

  const handleToggleCheck = (id: string) => {
    onPackingListChange({
      items: packingList.items.map(item => {
        if (item.id !== id) return item;
        const isChecked = item.checkedBy.includes(currentUserId);
        return {
          ...item,
          checkedBy: isChecked
            ? item.checkedBy.filter(uid => uid !== currentUserId)
            : [...item.checkedBy, currentUserId]
        };
      }),
      updatedAt: new Date()
    });
  };

  const handleAddCustomItem = () => {
    if (customItemName.trim()) {
      handleAddItem(customItemName.trim(), selectedCategory);
      setCustomItemName('');
    }
  };

  // Items della categoria selezionata (per setup) - ordinati alfabeticamente
  const categoryItems = packingList.items
    .filter(i => i.category === selectedCategory)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  // Suggerimenti non ancora aggiunti
  const availableSuggestions = SUGGESTED_ITEMS[selectedCategory].filter(
    name => !addedItemNames.has(name.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{ maxHeight: '85vh', backgroundColor: colors.bgCard }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎒</span>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: colors.text }}>
                      Packing List
                    </h2>
                    {totalItems > 0 && (
                      <p className="text-sm" style={{ color: colors.textMuted }}>
                        {checkedItems}/{totalItems} pronti
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full transition-colors hover:bg-gray-100"
                  style={{ color: colors.textMuted }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mode Toggle - Verifica prima */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setMode('check')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: mode === 'check' ? rawColors.accent : colors.bgSubtle,
                    color: mode === 'check' ? 'white' : colors.textMuted
                  }}
                >
                  <CheckCircle2 size={16} />
                  Verifica
                </button>
                <button
                  onClick={() => setMode('setup')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: mode === 'setup' ? rawColors.accent : colors.bgSubtle,
                    color: mode === 'setup' ? 'white' : colors.textMuted
                  }}
                >
                  <Settings2 size={16} />
                  Configura
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {mode === 'check' ? (
                /* ========== CHECK MODE ========== */
                <div className="p-4">
                  {totalItems === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-5xl mb-4 block">📦</span>
                      <p style={{ color: colors.textMuted }}>Lista vuota</p>
                      <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                        Vai su "Configura" per aggiungere oggetti
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {CATEGORIES.map(cat => {
                        const items = packingList.items
                          .filter(i => i.category === cat.id)
                          .sort((a, b) => a.name.localeCompare(b.name, 'it'));
                        if (items.length === 0) return null;

                        return (
                          <div key={cat.id} className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span>{cat.emoji}</span>
                              <span className="text-sm font-medium" style={{ color: colors.textMuted }}>
                                {cat.label}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {items.map(item => {
                                const isChecked = item.checkedBy.includes(currentUserId);
                                const checkedByOthers = item.checkedBy.length > 0 && !isChecked;
                                const checkedMembers = item.checkedBy
                                  .map(uid => members.find(m => m.userId === uid))
                                  .filter(Boolean);

                                // Colore cella: verde se spuntato da me, azzurro se spuntato solo da altri, grigio altrimenti
                                const cellBackground = isChecked
                                  ? rawColors.successSoft
                                  : checkedByOthers
                                    ? rawColors.accentSoft
                                    : colors.bgSubtle;

                                return (
                                  <motion.button
                                    key={item.id}
                                    onClick={() => handleToggleCheck(item.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                                    style={{ backgroundColor: cellBackground }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                      style={{
                                        backgroundColor: isChecked ? rawColors.success : 'white',
                                        border: isChecked ? 'none' : `2px solid ${colors.border}`
                                      }}
                                    >
                                      {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                                    </div>

                                    <span
                                      className="flex-1 font-medium"
                                      style={{
                                        color: isChecked ? colors.textMuted : colors.text,
                                        textDecoration: isChecked ? 'line-through' : 'none'
                                      }}
                                    >
                                      {item.name}
                                    </span>

                                    {checkedMembers.length > 0 && (
                                      <div className="flex -space-x-1.5">
                                        {checkedMembers.slice(0, 3).map((member) => (
                                          <Avatar
                                            key={member!.userId}
                                            src={member!.avatar}
                                            name={member!.displayName}
                                            size="xs"
                                            className="border-2 border-white"
                                          />
                                        ))}
                                        {checkedMembers.length > 3 && (
                                          <div
                                            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium border-2 border-white"
                                            style={{ color: colors.textMuted }}
                                          >
                                            +{checkedMembers.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* ========== SETUP MODE ========== */
                <div className="p-4">
                  {/* Category tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
                    {CATEGORIES.map(cat => {
                      const count = packingList.items.filter(i => i.category === cat.id).length;
                      const isSelected = selectedCategory === cat.id;

                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
                          style={{
                            backgroundColor: isSelected ? `${cat.color}20` : colors.bgSubtle,
                            color: isSelected ? cat.color : colors.textMuted,
                            border: isSelected ? `1.5px solid ${cat.color}` : '1.5px solid transparent'
                          }}
                        >
                          <span>{cat.emoji}</span>
                          <span>{cat.label}</span>
                          {count > 0 && (
                            <span
                              className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor: isSelected ? cat.color : colors.border,
                                color: isSelected ? 'white' : colors.textMuted
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Items aggiunti */}
                  {categoryItems.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                        Aggiunti
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categoryItems.map(item => (
                          <motion.button
                            key={item.id}
                            onClick={() => handleRemoveItem(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
                            style={{
                              backgroundColor: rawColors.accentSoft,
                              color: rawColors.accent
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Check size={14} />
                            <span>{item.name}</span>
                            <X size={12} className="ml-1 opacity-60" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggerimenti */}
                  {availableSuggestions.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                        Tocca per aggiungere
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableSuggestions.map(name => (
                          <motion.button
                            key={name}
                            onClick={() => handleAddItem(name, selectedCategory)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
                            style={{
                              backgroundColor: colors.bgSubtle,
                              color: colors.text,
                              border: `1px dashed ${colors.border}`
                            }}
                            whileHover={{ scale: 1.02, backgroundColor: rawColors.accentSoft }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Plus size={14} style={{ color: colors.textMuted }} />
                            <span>{name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input personalizzato */}
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                      Aggiungi altro
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
                        placeholder="Nome oggetto..."
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{
                          backgroundColor: colors.bgSubtle,
                          color: colors.text,
                          border: `1px solid ${colors.border}`
                        }}
                      />
                      <button
                        onClick={handleAddCustomItem}
                        disabled={!customItemName.trim()}
                        className="px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
                        style={{
                          backgroundColor: rawColors.accent,
                          color: 'white'
                        }}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4"
              style={{ borderTop: `1px solid ${colors.border}` }}
            >
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold transition-all"
                style={{
                  backgroundColor: rawColors.accent,
                  color: 'white'
                }}
              >
                Fatto
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PackingListModal;
