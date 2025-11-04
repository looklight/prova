import React, { useState } from 'react';
import { X, Search, Link as LinkIcon } from 'lucide-react';
import UsernameSearchSection from './UsernameSearchSection';
import InviteLinkSection from './InviteLinkSection';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">👥 Invita Membri</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('username')}
            className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'username'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Search size={20} />
            Cerca Username
          </button>
          
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'link'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <LinkIcon size={20} />
            Link
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
      </div>
    </div>
  );
};

export default InviteOptionsModal;