// ============================================================================
// Sidebar Component - Chat list, contacts, groups with tabs
// ============================================================================

import { Contact, RecentChat, Group, ActiveTab } from "../types";
import { shortenAddress, formatRelativeTime, generateAvatarColor } from "../utils";

interface SidebarProps {
  showMobileSidebar: boolean;
  activeTab: ActiveTab;
  searchQuery: string;
  filteredChats: RecentChat[];
  filteredContacts: Contact[];
  groups: Group[];
  selectedContact: string | null;
  selectedGroup: Group | null;
  address?: string;
  onTabChange: (tab: ActiveTab) => void;
  onSearchChange: (query: string) => void;
  onSelectChat: (address: string) => void;
  onSelectGroup: (group: Group) => void;
  onRemoveContact: (address: string) => void;
  onNewChat: () => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  showMobileSidebar,
  activeTab,
  searchQuery,
  filteredChats,
  filteredContacts,
  groups,
  selectedContact,
  selectedGroup,
  address,
  onTabChange,
  onSearchChange,
  onSelectChat,
  onSelectGroup,
  onRemoveContact,
  onNewChat,
  onCreateGroup,
  onJoinGroup,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <div className={`
        ${showMobileSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        fixed lg:relative inset-y-0 left-0 z-30 w-80 lg:w-[340px] 
        bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        lg:flex
      `}>
        {/* Sidebar Header with Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => onTabChange("chats")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all relative ${
                activeTab === "chats" 
                  ? "text-amber-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="flex items-center gap-1">
                  Chats
                  {filteredChats.length > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">{filteredChats.length}</span>
                  )}
                </span>
              </div>
              {activeTab === "chats" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
              )}
            </button>
            <button
              onClick={() => onTabChange("groups")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all relative ${
                activeTab === "groups" 
                  ? "text-amber-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="flex items-center gap-1">
                  Groups
                  {groups.length > 0 && (
                    <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full leading-none">{groups.length}</span>
                  )}
                </span>
              </div>
              {activeTab === "groups" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
              )}
            </button>
            <button
              onClick={() => onTabChange("contacts")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all relative ${
                activeTab === "contacts" 
                  ? "text-amber-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                {/* Address Book Icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="flex items-center gap-1">
                  Contacts
                  {filteredContacts.length > 0 && (
                    <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full leading-none">{filteredContacts.length}</span>
                  )}
                </span>
              </div>
              {activeTab === "contacts" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
              )}
            </button>
          </div>
          
          {/* Search Input */}
          <div className="p-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={activeTab === "chats" ? "Search chats..." : "Search contacts..."}
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Chats Tab */}
          {activeTab === "chats" && (
            <ChatsTab 
              chats={filteredChats}
              selectedContact={selectedContact}
              onSelectChat={onSelectChat}
            />
          )}

          {/* Contacts Tab */}
          {activeTab === "contacts" && (
            <ContactsTab
              contacts={filteredContacts}
              selectedContact={selectedContact}
              onSelectChat={onSelectChat}
              onRemoveContact={onRemoveContact}
            />
          )}

          {/* Groups Tab */}
          {activeTab === "groups" && (
            <GroupsTab
              groups={groups}
              selectedGroup={selectedGroup}
              address={address}
              onSelectGroup={onSelectGroup}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          {activeTab === "groups" ? (
            <>
              <button
                onClick={onCreateGroup}
                className="w-full py-3 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Group
              </button>
              <button
                onClick={onJoinGroup}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Join Group
              </button>
            </>
          ) : (
            <button
              onClick={onNewChat}
              className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ChatsTab({ 
  chats, 
  selectedContact, 
  onSelectChat 
}: { 
  chats: RecentChat[]; 
  selectedContact: string | null;
  onSelectChat: (address: string) => void;
}) {
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-center font-medium">No conversations yet</p>
        <p className="text-sm text-center mt-1">Start a new chat to begin</p>
      </div>
    );
  }

  return (
    <>
      {chats.map(chat => (
        <button
          key={chat.address}
          onClick={() => onSelectChat(chat.address)}
          className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all border-b border-gray-100 relative active:scale-[0.98] ${
            selectedContact === chat.address 
              ? "bg-amber-50 border-l-4 border-l-amber-500" 
              : "border-l-4 border-l-transparent"
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-2xl ${generateAvatarColor(chat.address)} flex items-center justify-center text-white font-semibold text-lg`}>
              {chat.name.charAt(0).toUpperCase()}
            </div>
            {selectedContact === chat.address && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-900 truncate">{chat.name}</span>
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {formatRelativeTime(chat.lastMessageTime)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {chat.isEncrypted && (
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              <p className={`text-sm truncate ${chat.isEncrypted ? "text-gray-400 italic" : "text-gray-600"}`}>
                {chat.lastMessage}
              </p>
            </div>
          </div>
        </button>
      ))}
    </>
  );
}

function ContactsTab({
  contacts,
  selectedContact,
  onSelectChat,
  onRemoveContact,
}: {
  contacts: Contact[];
  selectedContact: string | null;
  onSelectChat: (address: string) => void;
  onRemoveContact: (address: string) => void;
}) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-center font-medium">No contacts yet</p>
        <p className="text-sm text-center mt-1">Add contacts to start chatting</p>
      </div>
    );
  }

  return (
    <>
      {contacts.map(contact => (
        <div
          key={contact.address}
          className={`p-4 flex items-center gap-3 hover:bg-gray-50 transition-all border-b border-gray-100 active:scale-[0.98] cursor-pointer ${
            selectedContact === contact.address 
              ? "bg-amber-50 border-l-4 border-l-amber-500" 
              : "border-l-4 border-l-transparent"
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-2xl ${generateAvatarColor(contact.address)} flex items-center justify-center text-white font-semibold text-lg`}>
              {contact.name.charAt(0).toUpperCase()}
            </div>
            {selectedContact === contact.address && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          <button
            onClick={() => onSelectChat(contact.address)}
            className="flex-1 min-w-0 text-left"
          >
            <div className="font-semibold text-gray-900 truncate">{contact.name}</div>
            <div className="text-xs text-gray-500">{shortenAddress(contact.address)}</div>
          </button>
          <button
            onClick={() => onRemoveContact(contact.address)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Remove contact"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </>
  );
}

function GroupsTab({
  groups,
  selectedGroup,
  address,
  onSelectGroup,
}: {
  groups: Group[];
  selectedGroup: Group | null;
  address?: string;
  onSelectGroup: (group: Group) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-center font-medium">No groups yet</p>
        <p className="text-sm text-center mt-1">Create or join a group</p>
      </div>
    );
  }

  return (
    <>
      {groups.map(group => (
        <button
          key={group.groupId.toString()}
          onClick={() => onSelectGroup(group)}
          className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all border-b border-gray-100 ${
            selectedGroup?.groupId === group.groupId 
              ? "bg-amber-50 border-l-4 border-l-amber-500" 
              : "border-l-4 border-l-transparent"
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-lg`}>
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-semibold text-gray-900 truncate">{group.name}</div>
            <div className="text-xs text-gray-500">ID: {group.groupId.toString()}</div>
          </div>
          {group.owner.toLowerCase() === address?.toLowerCase() && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Owner</span>
          )}
        </button>
      ))}
    </>
  );
}
