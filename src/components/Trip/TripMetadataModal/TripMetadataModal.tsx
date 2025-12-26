import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion, PanInfo, useAnimation } from 'framer-motion';
import { InviteOptionsModal } from '../../Sharing';
import UserProfileModal from '../../Profile/UserProfileModal';
import TripMembersModal from '../TripMembersModal';
import { PackingListModal } from '../PackingListModal';
import { colors } from '../../../styles/theme';

import { useTripMetadataForm } from './useTripMetadataForm';
import HeroImageSection from './components/HeroImageSection';
import DatePill from './components/DatePill';
import DatePickerSheet from './components/DatePickerSheet';
import ParticipantsStack from './components/ParticipantsStack';
import DestinationsSection from './components/DestinationsSection';
import CurrenciesSection from './components/CurrenciesSection';
import PackingListButton from './components/PackingListButton';
import ModalFooter from './components/ModalFooter';

import type { TripMetadataModalProps } from './types';

/** Soglia in pixel per chiudere con swipe */
const SWIPE_CLOSE_THRESHOLD = 100;

const TripMetadataModal: React.FC<TripMetadataModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentUser,
  mode
}) => {
  const form = useTripMetadataForm({
    isOpen,
    initialData,
    currentUser,
    mode,
    onSave,
    onClose
  });

  const controls = useAnimation();
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showPackingListModal, setShowPackingListModal] = useState(false);

  // Compute packing list stats
  const packingStats = useMemo(() => {
    const items = form.packingList.items;
    const checkedCount = items.filter(item =>
      item.checkedBy.includes(currentUser.uid)
    ).length;
    return { itemCount: items.length, checkedCount };
  }, [form.packingList.items, currentUser.uid]);

  // Avvia animazione apertura
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
    }
  }, [isOpen, controls]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Chiudi se trascinato abbastanza in basso o con velocità sufficiente
    if (info.offset.y > SWIPE_CLOSE_THRESHOLD || info.velocity.y > 500) {
      onClose();
    } else {
      // Torna in posizione
      controls.start({ y: 0 });
    }
  };

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <motion.div
              className="w-full max-w-lg sm:rounded-2xl sm:mx-4 rounded-t-3xl overflow-hidden flex flex-col"
              style={{
                maxHeight: '95vh',
                backgroundColor: colors.bgCard
              }}
              initial={{ y: '100%' }}
              animate={controls}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {/* Hero Image - full width, no padding */}
                <HeroImageSection
                  image={form.image}
                  isUploading={form.isUploading}
                  onImageUpload={form.handleImageUpload}
                  onImageRemove={form.handleImageRemove}
                  tripName={form.tripName}
                  onNameChange={form.setTripName}
                />

                {/* Content below hero - with padding */}
                <div className="px-5 py-5 space-y-6">
                  {/* Date Picker - only in create mode */}
                  {mode === 'create' && (
                    <DatePill
                      startDate={form.dateRange?.from}
                      endDate={form.dateRange?.to}
                      onClick={() => form.setShowDatePicker(true)}
                    />
                  )}

                  {/* Participants */}
                  <ParticipantsStack
                    members={form.activeMembers}
                    currentUserId={currentUser.uid}
                    onStackClick={mode === 'edit' ? () => setShowMembersModal(true) : undefined}
                    onAddClick={() => form.setShowInviteModal(true)}
                    isOwner={form.isOwner}
                    mode={mode}
                  />

                  {/* Destinations */}
                  <DestinationsSection
                    destinations={form.destinations}
                    onAdd={form.addDestination}
                    onRemove={form.removeDestination}
                  />

                  {/* Currencies */}
                  <CurrenciesSection
                    currencies={form.preferredCurrencies}
                    onChange={form.setPreferredCurrencies}
                  />

                  {/* Packing List */}
                  <PackingListButton
                    itemCount={packingStats.itemCount}
                    checkedCount={packingStats.checkedCount}
                    onClick={() => setShowPackingListModal(true)}
                  />
                </div>
              </div>

              {/* Footer */}
              <ModalFooter
                mode={mode}
                onCancel={onClose}
                onSave={form.handleSave}
                isValid={form.isValid}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Picker Bottom Sheet */}
      {mode === 'create' && (
        <DatePickerSheet
          isOpen={form.showDatePicker}
          onClose={() => form.setShowDatePicker(false)}
          dateRange={form.dateRange}
          onDateChange={form.setDateRange}
        />
      )}

      {/* Invite Modal - only in edit mode */}
      {mode === 'edit' && form.tripForInvite && (
        <InviteOptionsModal
          isOpen={form.showInviteModal}
          onClose={() => form.setShowInviteModal(false)}
          trip={form.tripForInvite}
          currentUser={currentUser}
        />
      )}

      {/* User Profile Modal */}
      {form.selectedUserProfile && (() => {
        const memberData = form.activeMembers.find(
          m => m.userId === form.selectedUserProfile
        );
        return (
          <UserProfileModal
            isOpen={true}
            onClose={() => form.setSelectedUserProfile(null)}
            userId={form.selectedUserProfile}
            tripContext={memberData ? {
              role: memberData.role,
              joinedAt: memberData.joinedAt,
              displayName: memberData.displayName,
              username: memberData.username,
              avatar: memberData.avatar
            } : mode === 'create' && form.selectedUserProfile === currentUser.uid ? {
              role: 'owner',
              displayName: currentUser.displayName,
              username: currentUser.username,
              avatar: currentUser.photoURL
            } : undefined}
          />
        );
      })()}

      {/* Members Modal - only in edit mode */}
      {mode === 'edit' && form.tripForInvite && (
        <TripMembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          trip={form.tripForInvite}
          currentUser={currentUser}
        />
      )}

      {/* Packing List Modal */}
      <PackingListModal
        isOpen={showPackingListModal}
        onClose={() => setShowPackingListModal(false)}
        packingList={form.packingList}
        onPackingListChange={form.setPackingList}
        members={form.activeMembers}
        currentUserId={currentUser.uid}
      />
    </>
  );
};

export default TripMetadataModal;
