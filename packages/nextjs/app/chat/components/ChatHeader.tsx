// ============================================================================
// ChatHeader Component - Header for chat area (DM or Group)
// ============================================================================

import { Group, Contact } from "../types";
import { generateAvatarColor } from "../utils";

interface ChatHeaderProps {
  chatMode: "dm" | "group";
  selectedContact: string | null;
  selectedGroup: Group | null;
  contacts: Contact[];
  groupMembers: string[];
  address?: string;
  isProcessing: boolean;
  onBack: () => void;
  onAddMember: () => void;
  onShareRoomCode: () => void;
  onLeaveGroup: () => void;
  onBlockUser: (address: string) => void;
  getContactName: (address: string) => string;
}

export function ChatHeader({
  chatMode,
  selectedContact,
  selectedGroup,
  contacts,
  groupMembers,
  address,
  isProcessing,
  onBack,
  onAddMember,
  onShareRoomCode,
  onLeaveGroup,
  onBlockUser,
  getContactName,
}: ChatHeaderProps) {
  // Group chat header
  if (chatMode === "group" && selectedGroup) {
    return (
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 flex-shrink-0">
        <button 
          onClick={onBack}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold">
          {selectedGroup.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{selectedGroup.name}</h3>
          <p className="text-xs text-gray-500">{groupMembers.length} members</p>
        </div>
        {/* Share Room Code & Add Member - Only for owner */}
        {selectedGroup.owner.toLowerCase() === address?.toLowerCase() && (
          <>
            <button
              onClick={onShareRoomCode}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              title="Share invite code"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={onAddMember}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              title="Add member"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
          </>
        )}
        {/* Leave Group - for all members */}
        <button
          onClick={onLeaveGroup}
          disabled={isProcessing}
          className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-500"
          title="Leave group"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  // DM chat header
  if (selectedContact) {
    const isBlocked = contacts.find(c => c.address.toLowerCase() === selectedContact.toLowerCase())?.isBlocked;
    
    return (
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 flex-shrink-0">
        <button 
          onClick={onBack}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={`w-11 h-11 rounded-2xl ${generateAvatarColor(selectedContact)} flex items-center justify-center text-white font-semibold`}>
          {getContactName(selectedContact).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{getContactName(selectedContact)}</h3>
          <p className="text-xs text-gray-500 truncate">{selectedContact}</p>
        </div>
        {/* Block/Unblock Button */}
        <button
          onClick={() => onBlockUser(selectedContact)}
          disabled={isProcessing}
          className={`p-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            isBlocked
              ? "bg-green-100 text-green-600 hover:bg-green-200"
              : "bg-red-50 text-red-500 hover:bg-red-100"
          }`}
          title={isBlocked ? "Unblock user" : "Block user"}
        >
          {isBlocked ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium hidden sm:inline">Unblock</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-xs font-medium hidden sm:inline">Block</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Empty state header
  return (
    <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 flex-shrink-0">
      <button 
        onClick={onBack}
        className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="w-11 h-11 rounded-2xl bg-gray-200 flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">Select a conversation</h3>
        <p className="text-xs text-gray-500">Or start a new chat</p>
      </div>
    </div>
  );
}
