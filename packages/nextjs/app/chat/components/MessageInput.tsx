// ============================================================================
// MessageInput Component - Text input for sending messages
// ============================================================================

import { MAX_CHARS } from "../constants";

interface MessageInputProps {
  value: string;
  isProcessing: boolean;
  isReady: boolean;
  canSend: boolean;
  chatMode: "dm" | "group";
  onChange: (value: string) => void;
  onSend: () => void;
}

export function MessageInput({
  value,
  isProcessing,
  isReady,
  canSend,
  chatMode,
  onChange,
  onSend,
}: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isProcessing) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 max-w-3xl mx-auto">
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            placeholder="Type your message..."
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-11 px-4 pr-14 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-[15px]"
            maxLength={MAX_CHARS}
            disabled={isProcessing || !canSend}
          />
          <span className="absolute right-4 text-xs text-gray-400">
            {value.length}/{MAX_CHARS}
          </span>
        </div>
        <button
          onClick={onSend}
          disabled={isProcessing || !isReady || !canSend || !value.trim()}
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/25"
        >
          {isProcessing ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
