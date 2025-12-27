/**
 * TripMetadataModal Types
 * Interfacce TypeScript per il modal di creazione/modifica viaggio
 */

import { DateRange } from 'react-day-picker';

// ============= DESTINAZIONI =============

export interface Destination {
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// ============= VALUTE =============

export interface PreferredCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number;
  lastUpdated: string;
}

// ============= PACKING LIST =============

export type PackingCategory = 'documents' | 'clothing' | 'toiletries' | 'electronics' | 'other';

export interface PackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  checkedBy: string[]; // array di userId
}

export interface PackingList {
  items: PackingItem[];
  updatedAt?: Date;
}

// ============= MEMBRI =============

export interface TripMember {
  role: 'owner' | 'member';
  status: 'active' | 'invited' | 'removed';
  displayName: string;
  username?: string;
  avatar?: string;
  joinedAt?: Date;
}

export interface TripSharing {
  memberIds: string[];
  members: Record<string, TripMember>;
}

// ============= UTENTE =============

export interface CurrentUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  email?: string;
}

// ============= TRIP METADATA =============

export interface TripMetadata {
  name: string;
  image: string | null;
  imagePath?: string | null;
  destinations: Destination[];
  startDate?: Date;
  endDate?: Date;
  currency?: {
    preferred: Record<string, PreferredCurrency>;
  };
  packingList?: PackingList;
}

export interface TripInitialData extends TripMetadata {
  tripId?: string;
  sharing?: TripSharing;
}

// ============= PROPS COMPONENTI =============

export interface TripMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: TripMetadata) => void;
  initialData?: TripInitialData;
  currentUser: CurrentUser;
  mode: 'create' | 'edit';
  onInviteClick?: () => void;
}

export interface HeroImageSectionProps {
  image: string | null;
  isUploading: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  tripName: string;
  onNameChange: (name: string) => void;
}

export interface DatePillProps {
  startDate?: Date;
  endDate?: Date;
  onClick: () => void;
  disabled?: boolean;
}

export interface DatePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  mode?: 'create' | 'edit';
}

export interface MemberWithId extends TripMember {
  userId: string;
}

export interface ParticipantsStackProps {
  members: MemberWithId[];
  currentUserId: string;
  onStackClick?: () => void;
  onAddClick?: () => void;
  isOwner: boolean;
  maxVisible?: number;
  mode: 'create' | 'edit';
}

export interface DestinationsSectionProps {
  destinations: Destination[];
  onAdd: (destination: Destination) => void;
  onRemove: (index: number) => void;
  maxDestinations?: number;
}

export interface CurrenciesSectionProps {
  currencies: Record<string, PreferredCurrency>;
  onChange: (currencies: Record<string, PreferredCurrency>) => void;
}

export interface ModalFooterProps {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSave: () => void;
  isValid?: boolean;
}

export interface PackingListButtonProps {
  itemCount: number;
  checkedCount: number;
  onClick: () => void;
}
