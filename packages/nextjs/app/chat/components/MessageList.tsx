// ============================================================================
// MessageList Component - Display messages (encrypted or decrypted)
// ============================================================================

import { RefObject } from "react";
import { DecryptedMessage, EncryptedMessage, GroupMessage, Group } from "../types";
import { shortenAddress, formatTime } from "../utils";

interface MessageListProps {
  chatMode: "dm" | "group";
  selectedContact: string | null;
  selectedGroup: Group | null;
  encryptedConversation: EncryptedMessage[];
  currentConversation: DecryptedMessage[];
  groupMessages: GroupMessage[];
  address?: string;
  messagesEndRef: RefObject<HTMLDivElement>;
  getContactName: (address: string) => string;
}

const CHAT_BG_PATTERN = "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

export function MessageList({
  chatMode,
  selectedContact,
  selectedGroup,
  encryptedConversation,
  currentConversation,
  groupMessages,
  address,
  messagesEndRef,
  getContactName,
}: MessageListProps) {
  return (
    <div 
      className="flex-1 overflow-y-auto p-4 md:p-6" 
      style={{ backgroundImage: CHAT_BG_PATTERN }}
    >
      {/* Group Messages */}
      {chatMode === "group" && selectedGroup ? (
        <GroupMessageList 
          messages={groupMessages}
          selectedGroup={selectedGroup}
          messagesEndRef={messagesEndRef}
        />
      ) : !selectedContact ? (
        <EmptyState />
      ) : encryptedConversation.length === 0 ? (
        <StartConversation contactName={getContactName(selectedContact)} />
      ) : (
        <DMMessageList
          encryptedConversation={encryptedConversation}
          currentConversation={currentConversation}
          address={address}
          messagesEndRef={messagesEndRef}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <div className="w-28 h-28 rounded-3xl bg-amber-100 flex items-center justify-center mb-6 shadow-lg">
        <svg className="w-14 h-14 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p className="text-xl font-semibold text-gray-600 mb-2">Welcome to FHETalk</p>
      <p className="text-sm text-center max-w-sm text-gray-500">Select a conversation from the sidebar or start a new chat to begin messaging securely.</p>
    </div>
  );
}

function StartConversation({ contactName }: { contactName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <div className="w-24 h-24 rounded-3xl bg-amber-100 flex items-center justify-center mb-6 shadow-lg">
        <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <p className="text-xl font-semibold text-gray-600 mb-2">Start the conversation</p>
      <p className="text-sm text-center text-gray-500">Send your first encrypted message to {contactName}</p>
    </div>
  );
}

function GroupMessageList({
  messages,
  selectedGroup,
  messagesEndRef,
}: {
  messages: GroupMessage[];
  selectedGroup: Group;
  messagesEndRef: RefObject<HTMLDivElement>;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="w-24 h-24 rounded-3xl bg-amber-100 flex items-center justify-center mb-6 shadow-lg">
          <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-gray-600 mb-2">Group Chat</p>
        <p className="text-sm text-center text-gray-500">Send the first message to {selectedGroup.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-2 md:px-4">
      {messages.map((msg, idx) => {
        const isEncrypted = msg.content === "[Encrypted]";
        return (
          <div key={idx} className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"}`}>
            <div className="inline-block">
              {!msg.isFromMe && (
                <p className="text-xs text-gray-500 mb-1 ml-1">{shortenAddress(msg.from)}</p>
              )}
              <div className={`px-3 py-1 rounded-full ${
                msg.isFromMe
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-800 shadow-sm border border-gray-100"
              }`}>
                {isEncrypted ? (
                  <div className="flex items-center gap-2 text-sm leading-none opacity-80 italic">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Encrypted
                  </div>
                ) : (
                  <span className="text-sm leading-none">{msg.content}</span>
                )}
              </div>
              <div className={`flex items-center gap-1 text-xs text-gray-500 mt-1 px-1 ${msg.isFromMe ? "justify-end" : "justify-start"}`}>
                {formatTime(msg.timestamp)}
                {msg.isFromMe && (
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

function DMMessageList({
  encryptedConversation,
  currentConversation,
  address,
  messagesEndRef,
}: {
  encryptedConversation: EncryptedMessage[];
  currentConversation: DecryptedMessage[];
  address?: string;
  messagesEndRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div className="space-y-3 px-2 md:px-4">
      {currentConversation.length === 0 ? (
        // Encrypted messages
        encryptedConversation.map((msg, idx) => {
          const isFromMe = msg.header.from.toLowerCase() === address?.toLowerCase();
          return (
            <div key={idx} className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
              <div className="inline-block">
                <div className={`px-3 py-1 rounded-full ${
                  isFromMe
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100"
                }`}>
                  <div className="flex items-center gap-3.5 text-sm leading-none opacity-80 italic">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Encrypted message
                  </div>
                </div>
                <div className={`text-xs text-gray-500 mt-1 px-1 ${isFromMe ? "text-right" : "text-left"}`}>
                  {formatTime(new Date(Number(msg.header.timestamp) * 1000))}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        // Decrypted messages
        currentConversation.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"}`}>
            <div className="inline-block">
              <div className={`px-3 py-1 rounded-full ${
                msg.isFromMe
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-800 shadow-sm border border-gray-100"
              }`}>
                <span className="text-sm leading-none">{msg.content}</span>
              </div>
              <div className={`flex items-center gap-1 text-xs text-gray-500 mt-1 px-1 ${msg.isFromMe ? "justify-end" : "justify-start"}`}>
                {formatTime(msg.timestamp)}
                {msg.isFromMe && (
                  <svg className="w-4.5 h-4.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
