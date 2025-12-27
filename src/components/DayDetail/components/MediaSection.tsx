import React from 'react';
import { Link, Image, Video, FileText, Loader2, FileDown } from 'lucide-react';
import { colors } from '../../../styles/theme';
import MediaGrid from './MediaGrid';

// ============================================
// ALTROVE - MediaSection
// Sezione media generica riutilizzabile
// ============================================

interface MediaData {
  links?: Array<{ id: number; url: string; title?: string }>;
  images?: Array<{ id: number; url: string; path?: string; uploaderId?: string }>;
  videos?: Array<{ id: number; url: string; note?: string }>;
  mediaNotes?: Array<{ id: number; text: string }>;
  documents?: Array<{ id: number; url: string; path?: string; name: string; uploaderId?: string }>;
}

interface MemberInfo {
  uid: string;
  displayName: string;
  avatar?: string;
}

interface MediaSectionProps {
  data: MediaData;
  isUploadingImage: boolean;
  isUploadingDocument?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  documentInputRef?: React.RefObject<HTMLInputElement>;
  members?: MemberInfo[];
  onRemoveMedia: (type: 'links' | 'images' | 'videos' | 'mediaNotes' | 'documents', id: number) => void;
  onImageClick: (url: string) => void;
  onNoteClick: (note: { id: number; text: string }) => void;
  onOpenMediaDialog: (type: 'link' | 'video' | 'note') => void;
  onImageButtonClick: () => void;
  onDocumentButtonClick?: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDocumentUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showLabel?: boolean;
}

const MediaSection: React.FC<MediaSectionProps> = ({
  data,
  isUploadingImage,
  isUploadingDocument = false,
  fileInputRef,
  documentInputRef,
  members = [],
  onRemoveMedia,
  onImageClick,
  onNoteClick,
  onOpenMediaDialog,
  onImageButtonClick,
  onDocumentButtonClick,
  onImageUpload,
  onDocumentUpload,
  showLabel = true
}) => {
  return (
    <div>
      {showLabel && (
        <label
          className="text-xs font-medium mb-2 block"
          style={{ color: colors.textMuted }}
        >
          Media
        </label>
      )}

      {/* Media esistenti */}
      <MediaGrid
        links={data.links || []}
        images={data.images || []}
        videos={data.videos || []}
        mediaNotes={data.mediaNotes || []}
        documents={data.documents || []}
        isEditMode={true}
        members={members}
        onRemoveMedia={onRemoveMedia}
        onImageClick={onImageClick}
        onNoteClick={onNoteClick}
      />

      {/* Bottoni aggiungi media */}
      <div className="flex justify-center gap-4 mt-3">
        <button
          onClick={() => onOpenMediaDialog('link')}
          className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-colors hover:bg-gray-50"
          style={{ color: colors.accent }}
        >
          <Link size={20} />
          <span className="text-xs">Link</span>
        </button>

        <button
          onClick={onImageButtonClick}
          disabled={isUploadingImage}
          className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-50"
          style={{ color: colors.success }}
        >
          {isUploadingImage ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Image size={20} />
          )}
          <span className="text-xs">Foto</span>
        </button>

        {/* Bottone PDF - subito dopo Foto */}
        {onDocumentButtonClick && (
          <button
            onClick={onDocumentButtonClick}
            disabled={isUploadingDocument}
            className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ color: '#9CA3AF' }}
          >
            {isUploadingDocument ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <FileDown size={20} />
            )}
            <span className="text-xs">PDF</span>
          </button>
        )}

        <button
          onClick={() => onOpenMediaDialog('video')}
          className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-colors hover:bg-gray-50"
          style={{ color: '#A89EC9' }}
        >
          <Video size={20} />
          <span className="text-xs">Video</span>
        </button>

        <button
          onClick={() => onOpenMediaDialog('note')}
          className="flex flex-col items-center gap-1 p-2.5 rounded-lg transition-colors hover:bg-gray-50"
          style={{ color: colors.warning }}
        >
          <FileText size={20} />
          <span className="text-xs">Nota</span>
        </button>
      </div>

      {/* Hidden file input per immagini */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
      />

      {/* Hidden file input per documenti PDF */}
      {documentInputRef && onDocumentUpload && (
        <input
          ref={documentInputRef}
          type="file"
          accept="application/pdf"
          onChange={onDocumentUpload}
          className="hidden"
        />
      )}
    </div>
  );
};

export default MediaSection;
