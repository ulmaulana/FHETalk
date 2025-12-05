// ============================================================================
// Header Component - App header with logo, status, and actions
// ============================================================================

import Image from "next/image";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { UserProfile } from "../types";

interface HeaderProps {
  isReady: boolean;
  status: string;
  isProcessing: boolean;
  isDecrypting: boolean;
  canDecrypt: boolean;
  allHandlesLength: number;
  myProfile: UserProfile | null;
  showMobileSidebar: boolean;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  onDecrypt: () => void;
  onOpenProfile: () => void;
}

export function Header({
  isReady,
  status,
  isProcessing,
  isDecrypting,
  canDecrypt,
  allHandlesLength,
  myProfile,
  // showMobileSidebar - kept in props for future use
  onToggleSidebar,
  onRefresh,
  onDecrypt,
  onOpenProfile,
}: HeaderProps) {
  return (
    <div className="bg-gray-900 text-white px-3 sm:px-4 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-800">
      {/* Left: Logo & Brand */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Image 
          src="/FHETalk_logo.png" 
          alt="FHETalk" 
          width={28} 
          height={28} 
          className="rounded-lg"
        />
        <div className="hidden sm:block">
          <span className="font-semibold text-sm">FHETalk</span>
          <span className="text-white/50 text-xs ml-1">- Messages are end-to-end encrypted with Fully Homomorphic Encryption</span>
        </div>
        <span className="font-semibold text-sm sm:hidden">FHETalk</span>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* FHEVM Status */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
          isReady ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isReady ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
          FHEVM: {isReady ? "Ready" : status}
        </div>
        <button
          onClick={onRefresh}
          disabled={isProcessing || !isReady}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={onDecrypt}
          disabled={isProcessing || !canDecrypt || allHandlesLength === 0}
          className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
          title="Decrypt messages"
        >
          <svg className={`w-4 h-4 ${isDecrypting ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
          <span className="text-xs hidden md:inline">Decrypt Message</span>
        </button>
        {/* Profile Button */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/10 rounded-lg transition-colors"
          title="Edit Profile"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs hidden md:inline">{myProfile?.displayName || "Profile"}</span>
        </button>
        <div className="w-px h-4 bg-white/20 mx-1 hidden sm:block" />
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
}
