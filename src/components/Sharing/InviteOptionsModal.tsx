import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import UsernameSearchSection from './UsernameSearchSection';
import InviteLinkSection from './InviteLinkSection';
import { colors } from '../../styles/theme';

interface InviteOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  currentUser: {
    uid: string;
    displayName: string;
    username?: string;
    photoURL?: string;
  };
}

const InviteOptionsModal: React.FC<InviteOptionsModalProps> = ({
  isOpen,
  onClose,
  trip,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'username' | 'link'>('username');

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{
              maxHeight: '85vh',
              backgroundColor: colors.bgCard
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex justify-between items-center px-5 py-4"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <h2
                className="text-xl font-bold"
                style={{ color: colors.text }}
              >
                Invita membri
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-colors"
                style={{ color: colors.textMuted }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <button
                onClick={() => setActiveTab('username')}
                className="flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  color: activeTab === 'username' ? colors.accent : colors.textMuted,
                  borderBottom: activeTab === 'username' ? `2px solid ${colors.accent}` : '2px solid transparent',
                  marginBottom: '-1px'
                }}
              >
                <Search size={18} />
                Username
              </button>

              <button
                onClick={() => setActiveTab('link')}
                className="flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  color: activeTab === 'link' ? colors.accent : colors.textMuted,
                  borderBottom: activeTab === 'link' ? `2px solid ${colors.accent}` : '2px solid transparent',
                  marginBottom: '-1px'
                }}
              >
                <LinkIcon size={18} />
                Link
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'username' ? (
                <UsernameSearchSection
                  trip={trip}
                  currentUser={currentUser}
                />
              ) : (
                <InviteLinkSection
                  trip={trip}
                  currentUser={currentUser}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InviteOptionsModal;