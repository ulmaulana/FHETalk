// ============================================================================
// Group Modals - Create Group, Join Group, Add Member, Room Code
// ============================================================================

import { useState } from "react";
import { Group } from "../../types";

// ============================================================================
// Create Group Modal
// ============================================================================

interface CreateGroupModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  groupName: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function CreateGroupModal({
  isOpen,
  isProcessing,
  groupName,
  onNameChange,
  onSubmit,
  onClose,
}: CreateGroupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Create Group</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
            <input
              type="text"
              placeholder="My Group"
              value={groupName}
              onChange={e => onNameChange(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={isProcessing || !groupName.trim()}
            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
          >
            {isProcessing ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Join Group Modal
// ============================================================================

interface JoinGroupModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  inviteCode: string;
  onInviteCodeChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function JoinGroupModal({
  isOpen,
  isProcessing,
  inviteCode,
  onInviteCodeChange,
  onSubmit,
  onClose,
}: JoinGroupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Join Group</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Invite Code</label>
            <input
              type="text"
              placeholder="e.g. 5-ABC123XY"
              value={inviteCode}
              onChange={e => onInviteCodeChange(e.target.value.toUpperCase())}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-mono"
            />
            <p className="text-xs text-gray-500 mt-2">Paste the invite code you received from the group owner</p>
          </div>
          <button
            onClick={onSubmit}
            disabled={isProcessing || !inviteCode}
            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
          >
            {isProcessing ? "Joining..." : "Join Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Add Member Modal
// ============================================================================

interface AddMemberModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  selectedGroup: Group | null;
  memberAddress: string;
  groupMembers: string[];
  onAddressChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function AddMemberModal({
  isOpen,
  isProcessing,
  selectedGroup,
  memberAddress,
  groupMembers,
  onAddressChange,
  onSubmit,
  onClose,
}: AddMemberModalProps) {
  if (!isOpen || !selectedGroup) return null;

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Add Member</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={memberAddress}
              onChange={e => onAddressChange(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="mb-6 p-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">Current members: {groupMembers.length}</p>
            <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
              {groupMembers.map((m, i) => (
                <p key={i} className="text-xs text-gray-500 truncate">{m}</p>
              ))}
            </div>
          </div>
          <button
            onClick={onSubmit}
            disabled={isProcessing || !memberAddress}
            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
          >
            {isProcessing ? "Adding..." : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Room Code Modal
// ============================================================================

interface RoomCodeModalProps {
  isOpen: boolean;
  selectedGroup: Group | null;
  roomCode: string | null;
  onSaveRoomCode: (groupId: string, code: string) => void;
  onClose: () => void;
}

export function RoomCodeModal({
  isOpen,
  selectedGroup,
  roomCode,
  onSaveRoomCode,
  onClose,
}: RoomCodeModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [saved, setSaved] = useState(false);
  
  if (!isOpen || !selectedGroup) return null;

  // Auto-add groupId prefix if roomCode doesn't have it
  const normalizedCode = roomCode 
    ? (roomCode.includes("-") ? roomCode : `${selectedGroup.groupId}-${roomCode}`)
    : null;
  const displayCode = normalizedCode || (saved ? manualCode : null);

  const handleCopy = () => {
    if (displayCode) {
      navigator.clipboard.writeText(displayCode);
    }
  };

  const handleCopyInvite = () => {
    const inviteText = `Join my group "${selectedGroup.name}" on FHETalk!\nInvite Code: ${displayCode || "N/A"}`;
    navigator.clipboard.writeText(inviteText);
  };

  const handleSaveManualCode = () => {
    if (manualCode.trim()) {
      onSaveRoomCode(selectedGroup.groupId.toString(), manualCode.trim().toUpperCase());
      setSaved(true);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Invite Code</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-500 mb-2">Share this code to invite others</p>
            <p className="font-bold text-gray-700 text-lg">{selectedGroup.name}</p>
          </div>
          
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl border-2 border-amber-200">
            <p className="text-xs text-amber-600 mb-2">Invite Code</p>
            {displayCode ? (
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xl font-bold text-amber-700 tracking-wider break-all">{displayCode}</p>
                <button 
                  onClick={handleCopy}
                  className="p-2 hover:bg-amber-100 rounded-xl transition-colors flex-shrink-0"
                  title="Copy code"
                >
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-500 text-sm">Invite code not found. Enter it manually (format: groupId-code):</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 5-ABC123XY"
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    maxLength={20}
                  />
                  <button
                    onClick={handleSaveManualCode}
                    disabled={!manualCode.trim()}
                    className="px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyInvite}
            disabled={!displayCode}
            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Copy Invite Message
          </button>
        </div>
      </div>
    </div>
  );
}
