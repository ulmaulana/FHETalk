// ============================================================================
// StatusToast Component - Toast notification for status messages
// ============================================================================

interface StatusToastProps {
  message: string;
  onClose: () => void;
}

export function StatusToast({ message, onClose }: StatusToastProps) {
  if (!message) return null;

  const isError = message.toLowerCase().includes('error') || 
                  message.toLowerCase().includes('invalid') || 
                  message.toLowerCase().includes('failed');
  const isSuccess = message.toLowerCase().includes('success') || 
                    message.toLowerCase().includes('sent');

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs ${
        isError
          ? 'bg-red-500 text-white'
          : isSuccess
          ? 'bg-green-500 text-white'
          : 'bg-gray-800 text-white'
      }`}>
        <span className="font-medium">{message}</span>
        <button 
          onClick={onClose}
          className="p-0.5 hover:bg-white/20 rounded transition-colors ml-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
