"use client";

// ============================================================================
// Chat - Main Chat Component (Modular Version)
// All UI, UX, and functionality with FHE encryption
// Logic split into modular hooks for easier maintenance
// ============================================================================

import { useMemo, useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { FHEVMProvider, useFHEVM } from "@fhevm/sdk/react";
import { ethers } from "ethers";
import { getContractConfig } from "~~/contracts";

// Types
import { ActiveTab, Group, GroupMessage } from "./types";

// Utils
import { decodeMessageFromChunks } from "./utils";

// Components
import {
  Header,
  StatusToast,
  Sidebar,
  ChatHeader,
  MessageList,
  MessageInput,
  NewChatModal,
  ProfileModal,
  CreateGroupModal,
  JoinGroupModal,
  AddMemberModal,
  RoomCodeModal,
} from "./components";

// Hooks
import { useContract } from "./hooks/useContract";
import { useProfile } from "./hooks/useProfile";
import { useContacts } from "./hooks/useContacts";
import { useMessages } from "./hooks/useMessages";
import { useGroups } from "./hooks/useGroups";

// ============================================================================
// Chat Content Component
// ============================================================================

function ChatContent() {
  const { chain, address } = useAccount();
  const chainId = chain?.id;

  // Contract configuration
  const chatConfig = getContractConfig("FHETalk");

  // FHEVM configuration - use Infura if set, fallback to publicnode
  const sepoliaRpcUrl = useMemo(() => {
    if (chainId === 31337) return "http://localhost:8545";
    
    // Primary: env variable (Infura/Alchemy)
    // Fallback: publicnode (free, no rate limit)
    const primary = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
    const fallback = "https://ethereum-sepolia-rpc.publicnode.com";
    
    // Log untuk debugging (hapus setelah fix)
    if (typeof window !== "undefined") {
      console.log("[FHEVM] Using RPC:", primary ? "ENV (Infura/Alchemy)" : "Fallback (publicnode)");
    }
    
    return primary || fallback;
  }, [chainId]);

  const fhevmConfig = useMemo(() => ({
    rpcUrl: sepoliaRpcUrl,
    chainId: chainId || 11155111,
    mockChains: { 31337: "http://localhost:8545" }
  }), [chainId, sepoliaRpcUrl]);

  // FHEVM hooks
  const { instance, isInitialized: isReady, status, error } = useFHEVM(fhevmConfig);

  // Debug: Log FHEVM error to console
  useEffect(() => {
    if (error) {
      console.error("[FHEVM ERROR]", error.message, error);
    }
    console.log("[FHEVM STATUS]", status, { isReady, hasInstance: !!instance });
  }, [error, status, isReady, instance]);

  // Contract hook
  const { ethersSigner, getContract, isContractReady } = useContract();

  // ========== SHARED STATE ==========
  const [statusMessage, setStatusMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMode, setChatMode] = useState<"dm" | "group">("dm");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat transition animation state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentChatKey, setCurrentChatKey] = useState<string>("");

  // ========== PROFILE HOOK ==========
  const profile = useProfile({
    address,
    getContract,
    setStatusMessage,
    setIsProcessing,
  });

  // ========== MESSAGES HOOK ==========
  const messages = useMessages({
    address,
    chatConfig,
    instance,
    ethersSigner,
    isReady,
    getContract,
    setStatusMessage,
    setIsProcessing,
  });

  // ========== CONTACTS HOOK ==========
  const contacts = useContacts({
    address,
    getContract,
    setStatusMessage,
    setIsProcessing,
    inboxMessages: messages.inboxMessages,
    outboxMessages: messages.outboxMessages,
    decryptedMessages: messages.decryptedMessages,
  });

  // ========== GROUPS HOOK ==========
  const groups = useGroups({
    address,
    chatConfig,
    instance,
    getContract,
    setStatusMessage,
    setIsProcessing,
    setAllHandles: messages.setAllHandles,
  });

  // ========== EFFECTS ==========

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.decryptedMessages]);

  // Load profile and groups on mount - wait for contract to be ready
  useEffect(() => {
    if (isReady && address && isContractReady) {
      profile.loadMyProfile();
      groups.loadGroups();
    }
  }, [isReady, address, isContractReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load messages - wait for contract to be ready
  useEffect(() => {
    if (isReady && address && chatConfig.address && isContractReady) {
      messages.loadMessages();
    }
  }, [isReady, address, chatConfig.address, isContractReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger transition animation when chat changes
  useEffect(() => {
    const newKey = chatMode === "group" 
      ? `group-${groups.selectedGroup?.groupId}` 
      : `dm-${contacts.selectedContact}`;
    
    if (currentChatKey && newKey !== currentChatKey) {
      setIsTransitioning(true);
      // 250ms - quick transition, just enough to show loading
      const timer = setTimeout(() => setIsTransitioning(false), 250);
      return () => clearTimeout(timer);
    }
    setCurrentChatKey(newKey);
  }, [chatMode, groups.selectedGroup?.groupId, contacts.selectedContact]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== HANDLERS ==========

  const handleSelectChat = (addr: string) => {
    contacts.setSelectedContact(addr);
    groups.setSelectedGroup(null);
    setChatMode("dm");
    setShowMobileSidebar(false);
    contacts.setShowNewChat(false);
  };

  const handleSelectGroup = async (group: Group) => {
    await groups.selectGroup(group);
    contacts.setSelectedContact(null);
    setChatMode("group");
    setShowMobileSidebar(false);
  };

  const handleStartNewChat = () => {
    if (!contacts.recipientInput || !ethers.isAddress(contacts.recipientInput)) {
      setStatusMessage("Please enter a valid wallet address");
      return;
    }
    contacts.addContact(contacts.recipientInput, contacts.newContactName);
    contacts.setSelectedContact(contacts.recipientInput.toLowerCase());
    contacts.setShowNewChat(false);
    contacts.setRecipientInput("");
    contacts.setNewContactName("");
  };

  const handleBack = () => {
    if (chatMode === "group") {
      groups.setSelectedGroup(null);
      setChatMode("dm");
    }
    setShowMobileSidebar(true);
  };

  const handleSendMessage = () => {
    if (chatMode === "group") {
      groups.sendGroupMessage(messages.messageInput, () => messages.setMessageInput(""));
    } else if (contacts.selectedContact) {
      messages.sendMessage(contacts.selectedContact);
    }
  };

  // Filter chats/contacts by search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return contacts.recentChats;
    const q = searchQuery.toLowerCase();
    return contacts.recentChats.filter(
      chat => chat.name.toLowerCase().includes(q) || chat.address.toLowerCase().includes(q)
    );
  }, [contacts.recentChats, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts.contacts;
    const q = searchQuery.toLowerCase();
    return contacts.contacts.filter(
      c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }, [contacts.contacts, searchQuery]);

  // Encrypted messages for selected contact
  const encryptedConversation = useMemo(() => {
    if (!contacts.selectedContact || !address) return [];
    const contactAddr = contacts.selectedContact.toLowerCase();
    const myAddr = address.toLowerCase();
    const allMsgs = [...messages.inboxMessages, ...messages.outboxMessages];
    return allMsgs
      .filter(msg => 
        (msg.header.from.toLowerCase() === contactAddr && msg.header.to.toLowerCase() === myAddr) ||
        (msg.header.to.toLowerCase() === contactAddr && msg.header.from.toLowerCase() === myAddr)
      )
      .sort((a, b) => Number(a.header.timestamp) - Number(b.header.timestamp));
  }, [contacts.selectedContact, messages.inboxMessages, messages.outboxMessages, address]);

  // Decrypted conversation with selected contact
  const currentConversation = useMemo(() => {
    if (!contacts.selectedContact) return [];
    const contactAddr = contacts.selectedContact.toLowerCase();
    return messages.decryptedMessages.filter(
      msg => msg.from.toLowerCase() === contactAddr || msg.to.toLowerCase() === contactAddr
    );
  }, [contacts.selectedContact, messages.decryptedMessages]);

  // Decoded group messages - include selectedGroup in deps to refresh on group switch
  const decodedGroupMessages = useMemo((): GroupMessage[] => {
    // Return empty if no group selected or messages not for this group
    if (!groups.selectedGroup) return [];
    
    if (!messages.decryptedResults || Object.keys(messages.decryptedResults).length === 0) {
      return groups.groupMessages;
    }
    
    return groups.groupMessages.map(msg => {
      if (!msg.chunkHandles || msg.chunkHandles.length === 0) return msg;
      
      const allDecrypted = msg.chunkHandles.every(h => messages.decryptedResults[h] !== undefined);
      if (!allDecrypted) return msg;
      
      const content = decodeMessageFromChunks(msg.chunkHandles, messages.decryptedResults);
      return { ...msg, content };
    });
  }, [groups.groupMessages, groups.selectedGroup, messages.decryptedResults]);

  // ========== RENDER ==========

  return (
    <div className="h-screen w-screen bg-white overflow-hidden">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <Header
          isReady={isReady}
          status={status}
          isProcessing={isProcessing}
          isDecrypting={messages.isDecrypting}
          canDecrypt={messages.canDecrypt}
          allHandlesLength={messages.allHandles.length}
          myProfile={profile.myProfile}
          showMobileSidebar={showMobileSidebar}
          onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
          onRefresh={messages.loadMessages}
          onDecrypt={messages.handleDecrypt}
          onOpenProfile={() => profile.setShowProfileModal(true)}
        />

        {/* Status Toast */}
        <StatusToast 
          message={statusMessage} 
          onClose={() => setStatusMessage("")} 
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            showMobileSidebar={showMobileSidebar}
            activeTab={activeTab}
            searchQuery={searchQuery}
            filteredChats={filteredChats}
            filteredContacts={filteredContacts}
            groups={groups.groups}
            selectedContact={contacts.selectedContact}
            selectedGroup={groups.selectedGroup}
            address={address}
            onTabChange={setActiveTab}
            onSearchChange={setSearchQuery}
            onSelectChat={handleSelectChat}
            onSelectGroup={handleSelectGroup}
            onRemoveContact={contacts.removeContact}
            onNewChat={() => contacts.setShowNewChat(true)}
            onCreateGroup={() => groups.setShowCreateGroup(true)}
            onJoinGroup={() => groups.setShowJoinGroup(true)}
            onCloseMobile={() => setShowMobileSidebar(false)}
          />

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Modals */}
            <NewChatModal
              isOpen={contacts.showNewChat}
              recipientInput={contacts.recipientInput}
              newContactName={contacts.newContactName}
              onRecipientChange={contacts.setRecipientInput}
              onNameChange={contacts.setNewContactName}
              onSubmit={handleStartNewChat}
              onClose={() => contacts.setShowNewChat(false)}
            />

            <ProfileModal
              isOpen={profile.showProfileModal}
              isProcessing={isProcessing}
              profileName={profile.profileName}
              profileAvatar={profile.profileAvatar}
              onNameChange={profile.setProfileName}
              onAvatarChange={profile.setProfileAvatar}
              onSubmit={profile.saveProfile}
              onClose={() => profile.setShowProfileModal(false)}
            />

            <CreateGroupModal
              isOpen={groups.showCreateGroup}
              isProcessing={isProcessing}
              groupName={groups.newGroupName}
              onNameChange={groups.setNewGroupName}
              onSubmit={groups.createGroup}
              onClose={() => groups.setShowCreateGroup(false)}
            />

            <JoinGroupModal
              isOpen={groups.showJoinGroup}
              isProcessing={isProcessing}
              inviteCode={groups.inviteCode}
              onInviteCodeChange={groups.setInviteCode}
              onSubmit={groups.joinGroup}
              onClose={() => groups.setShowJoinGroup(false)}
            />

            <AddMemberModal
              isOpen={groups.showAddMember}
              isProcessing={isProcessing}
              selectedGroup={groups.selectedGroup}
              memberAddress={groups.newMemberAddress}
              groupMembers={groups.groupMembers}
              onAddressChange={groups.setNewMemberAddress}
              onSubmit={groups.addMemberToGroup}
              onClose={() => groups.setShowAddMember(false)}
            />

            <RoomCodeModal
              isOpen={groups.showRoomCode}
              selectedGroup={groups.selectedGroup}
              roomCode={groups.selectedGroup ? groups.getRoomCode(groups.selectedGroup.groupId.toString()) : null}
              onSaveRoomCode={groups.saveRoomCode}
              onClose={() => groups.setShowRoomCode(false)}
            />

            {/* Chat Header */}
            <ChatHeader
              chatMode={chatMode}
              selectedContact={contacts.selectedContact}
              selectedGroup={groups.selectedGroup}
              contacts={contacts.contacts}
              groupMembers={groups.groupMembers}
              address={address}
              isProcessing={isProcessing}
              onBack={handleBack}
              onAddMember={() => groups.setShowAddMember(true)}
              onShareRoomCode={() => groups.setShowRoomCode(true)}
              onBlockUser={contacts.toggleBlockUser}
              getContactName={contacts.getContactName}
            />

            {/* Message List */}
            <MessageList
              chatMode={chatMode}
              selectedContact={contacts.selectedContact}
              selectedGroup={groups.selectedGroup}
              encryptedConversation={encryptedConversation}
              currentConversation={currentConversation}
              groupMessages={decodedGroupMessages}
              address={address}
              messagesEndRef={messagesEndRef as any}
              getContactName={contacts.getContactName}
              isLoading={isTransitioning}
            />

            {/* Message Input */}
            <MessageInput
              value={messages.messageInput}
              isProcessing={isProcessing}
              isReady={isReady}
              canSend={!!(contacts.selectedContact || groups.selectedGroup)}
              chatMode={chatMode}
              onChange={messages.setMessageInput}
              onSend={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Export with Provider
// ============================================================================

const getSepoliaRpcUrl = () => {
  const primary = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  const fallback = "https://ethereum-sepolia-rpc.publicnode.com";
  
  if (typeof window !== "undefined") {
    console.log("[FHEVM Provider] Using RPC:", primary ? "ENV (Infura/Alchemy)" : "Fallback (publicnode)");
  }
  
  return primary || fallback;
};

export function Chat() {
  return (
    <FHEVMProvider config={{
      rpcUrl: getSepoliaRpcUrl(),
      chainId: 11155111,
      mockChains: { 31337: "http://localhost:8545" }
    }}>
      <ChatContent />
    </FHEVMProvider>
  );
}
