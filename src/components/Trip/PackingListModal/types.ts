/**
 * PackingListModal Types
 */

import type { PackingItem, PackingCategory, PackingList, MemberWithId } from '../TripMetadataModal/types';

export type { PackingItem, PackingCategory, PackingList };

export type PackingListMode = 'setup' | 'check';

export interface PackingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  packingList: PackingList;
  onPackingListChange: (packingList: PackingList) => void;
  members: MemberWithId[];
  currentUserId: string;
}
