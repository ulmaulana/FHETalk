// ============================================================================
// NewChatModal Component - Modal for starting new chat
// ============================================================================

interface NewChatModalProps {
  isOpen: boolean;
  recipientInput: string;
  newContactName: string;
  onRecipientChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function NewChatModal({
  isOpen,
  recipientInput,
  newContactName,
  onRecipientChange,
  onNameChange,
  onSubmit,
  onClose,
}: NewChatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
          <h3 className="font-semibold text-lg">New Chat</h3>
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
              value={recipientInput}
              onChange={e => onRecipientChange(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Name (optional)</label>
            <input
              type="text"
              placeholder="Contact name"
              value={newContactName}
              onChange={e => onNameChange(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25"
          >
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}
