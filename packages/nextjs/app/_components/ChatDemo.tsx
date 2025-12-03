"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { FHEVMProvider, useFHEVM, useInMemoryStorage, useFHEDecrypt } from "@fhevm/sdk/react";
import { ethers } from "ethers";
import { getContractConfig } from "~~/contracts";

// ============================================================================
// Types
// ============================================================================

interface MessageHeader {
  from: string;
  to: string;
  timestamp: bigint;
  chunkCount: number;
}

interface EncryptedMessage {
  id: bigint;
  header: MessageHeader;
  chunkHandles: string[];
}

interface DecryptedMessage {
  id: bigint;
  from: string;
  to: string;
  timestamp: Date;
  content: string;
  isFromMe: boolean;
}

interface Contact {
  address: string;
  name: string;
  addedAt: number;
}

interface RecentChat {
  address: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  isEncrypted: boolean;
  unreadCount?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

const CONTACTS_KEY = "fhetalk-contacts";

function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContacts(contacts: Contact[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

function encodeMessageToUint64Chunks(message: string): bigint[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(message);
  const chunks: bigint[] = [];
  
  for (let i = 0; i < bytes.length; i += 8) {
    let value = 0n;
    for (let j = 0; j < 8; j++) {
      const idx = i + j;
      const b = idx < bytes.length ? bytes[idx] : 0;
      value = (value << 8n) | BigInt(b);
    }
    chunks.push(value);
  }
  return chunks;
}

function decodeMessageFromChunks(
  chunkHandles: string[],
  decryptedMap: Record<string, bigint>
): string {
  const bytes: number[] = [];

  for (const h of chunkHandles) {
    const value = decryptedMap[h];
    if (value === undefined) continue;
    let v = value;

    const chunkBytes = new Array(8).fill(0);
    for (let i = 7; i >= 0; i--) {
      chunkBytes[i] = Number(v & 0xffn);
      v >>= 8n;
    }
    bytes.push(...chunkBytes);
  }

  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) {
    end--;
  }

  return new TextDecoder().decode(new Uint8Array(bytes.slice(0, end)));
}

function shortenAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function generateAvatarColor(address: string): string {
  const colors = [
    "bg-amber-500",
    "bg-gray-700",
    "bg-amber-600",
    "bg-gray-800",
    "bg-amber-400",
    "bg-gray-600",
  ];
  const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// ============================================================================
// Chat Demo Content Component
// ============================================================================

function ChatDemoContent() {
  const { isConnected, chain, address } = useAccount();
  const chainId = chain?.id;

  // Contract configuration
  const chatConfig = getContractConfig("FHETalk");

  // FHEVM configuration
  const fhevmConfig = useMemo(() => ({
    rpcUrl: chainId === 31337 ? "http://localhost:8545" : "https://eth-sepolia.g.alchemy.com/v2/demo",
    chainId: chainId || 11155111,
    mockChains: { 31337: "http://localhost:8545" }
  }), [chainId]);

  // FHEVM hooks
  const { instance, isInitialized: isReady, status } = useFHEVM(fhevmConfig);

  // Ethers signer
  const ethersSigner = useMemo(() => {
    if (!isConnected || !address) return undefined;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      return new ethers.JsonRpcSigner(provider, address);
    } catch {
      return undefined;
    }
  }, [isConnected, address]);

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Messages state
  const [inboxMessages, setInboxMessages] = useState<EncryptedMessage[]>([]);
  const [outboxMessages, setOutboxMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [allHandles, setAllHandles] = useState<string[]>([]);

  // Auto-scroll to bottom when new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [decryptedMessages, scrollToBottom]);

  // Load contacts on mount
  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  // Decryption setup
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  
  const requests = useMemo(() => {
    if (!chatConfig.address || allHandles.length === 0) return undefined;
    return allHandles
      .filter((h: string) => h !== ethers.ZeroHash)
      .map((handle: string) => ({
        handle,
        contractAddress: chatConfig.address as `0x${string}`,
      }));
  }, [chatConfig.address, allHandles]);

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    results: decryptedResults,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    requests,
  });

  // Get ethers contract
  const getContract = useCallback((mode: "read" | "write") => {
    if (!chatConfig.address || !chatConfig.abi) return undefined;
    
    if (mode === "write" && ethersSigner) {
      return new ethers.Contract(chatConfig.address, chatConfig.abi, ethersSigner);
    }
    
    if (mode === "read" && isConnected) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      return new ethers.Contract(chatConfig.address, chatConfig.abi, provider);
    }
    
    return undefined;
  }, [chatConfig, ethersSigner, isConnected]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!chatConfig.address || !address || !isReady) return;

    setIsProcessing(true);
    setStatusMessage("Loading messages...");

    try {
      const contract = getContract("read");
      if (!contract) throw new Error("Contract not available");

      const [inboxIds, outboxIds] = await Promise.all([
        contract.getInboxIds(address),
        contract.getOutboxIds(address),
      ]);

      const inbox: EncryptedMessage[] = [];
      const outbox: EncryptedMessage[] = [];
      const handles: string[] = [];

      // Load inbox messages
      for (const id of inboxIds) {
        const header = await contract.getMessageHeader(id);
        const chunkHandles: string[] = [];
        
        for (let i = 0; i < Number(header.chunkCount); i++) {
          const chunk = await contract.getMessageChunk(id, i);
          chunkHandles.push(chunk);
          handles.push(chunk);
        }

        inbox.push({
          id,
          header: {
            from: header.from,
            to: header.to,
            timestamp: header.timestamp,
            chunkCount: Number(header.chunkCount),
          },
          chunkHandles,
        });
      }

      // Load outbox messages
      for (const id of outboxIds) {
        const header = await contract.getMessageHeader(id);
        const chunkHandles: string[] = [];
        
        for (let i = 0; i < Number(header.chunkCount); i++) {
          const chunk = await contract.getMessageChunk(id, i);
          chunkHandles.push(chunk);
          handles.push(chunk);
        }

        outbox.push({
          id,
          header: {
            from: header.from,
            to: header.to,
            timestamp: header.timestamp,
            chunkCount: Number(header.chunkCount),
          },
          chunkHandles,
        });
      }

      setInboxMessages(inbox);
      setOutboxMessages(outbox);
      setAllHandles([...new Set(handles)]);
      setStatusMessage(`Loaded ${inbox.length} received, ${outbox.length} sent messages`);
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [chatConfig.address, address, isReady, getContract]);

  // Auto-load messages when FHEVM is ready and wallet is connected
  useEffect(() => {
    if (isReady && address && chatConfig.address) {
      loadMessages();
    }
  }, [isReady, address, chatConfig.address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process decrypted messages
  useEffect(() => {
    if (!decryptedResults || Object.keys(decryptedResults).length === 0) return;
    if (!address) return;

    const myAddress = address.toLowerCase();
    const allMsgs = [...inboxMessages, ...outboxMessages];
    const processed: DecryptedMessage[] = [];

    for (const msg of allMsgs) {
      const allDecrypted = msg.chunkHandles.every((h: string) => decryptedResults[h] !== undefined);
      if (!allDecrypted) continue;

      const content = decodeMessageFromChunks(msg.chunkHandles, decryptedResults);
      
      processed.push({
        id: msg.id,
        from: msg.header.from,
        to: msg.header.to,
        timestamp: new Date(Number(msg.header.timestamp) * 1000),
        content,
        isFromMe: msg.header.from.toLowerCase() === myAddress,
      });
    }

    processed.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setDecryptedMessages(processed);
  }, [decryptedResults, inboxMessages, outboxMessages, address]);

  // Send message
  const sendMessage = async () => {
    const recipient = selectedContact || recipientInput;
    
    if (!recipient || !ethers.isAddress(recipient)) {
      setStatusMessage("Please enter a valid recipient address");
      return;
    }

    // Cannot send to yourself (contract will reject)
    if (recipient.toLowerCase() === address?.toLowerCase()) {
      setStatusMessage("Cannot send message to yourself");
      return;
    }

    if (!messageInput.trim()) {
      setStatusMessage("Please enter a message");
      return;
    }

    if (messageInput.length > 256) {
      setStatusMessage("Message too long (max 256 characters)");
      return;
    }

    if (!instance || !address) {
      setStatusMessage("FHEVM not ready or wallet not connected");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Encrypting message...");

    try {
      const chunks = encodeMessageToUint64Chunks(messageInput);
      setStatusMessage(`Encoding ${chunks.length} chunks...`);

      // IMPORTANT: Address must be checksummed for FHEVM proof to work
      const contractAddr = ethers.getAddress(chatConfig.address);
      const userAddr = ethers.getAddress(address);
      
      console.log("createEncryptedInput addresses:", { contractAddr, userAddr });
      
      const buffer = instance.createEncryptedInput(contractAddr, userAddr);
      for (const chunk of chunks) {
        buffer.add64(chunk);
      }

      setStatusMessage("Sending to FHEVM gateway...");
      const ciphertexts = await buffer.encrypt();

      if (!ciphertexts.handles || ciphertexts.handles.length === 0) {
        throw new Error("Encryption failed");
      }

      const toHex = (data: Uint8Array) => 
        "0x" + Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("");

      // Ensure handles are exactly 32 bytes for bytes32 type
      // SDK may return shorter handles that need right-padding
      const toBytes32 = (data: Uint8Array): string => {
        if (data.length === 32) {
          return toHex(data);
        }
        if (data.length > 32) {
          throw new Error(`Handle too long: ${data.length} bytes`);
        }
        // Right-pad with zeros to 32 bytes (data is left-aligned)
        const padded = new Uint8Array(32);
        padded.set(data, 0);
        return toHex(padded);
      };

      const handles = ciphertexts.handles.map((h: Uint8Array) => toBytes32(h));
      const inputProof = toHex(ciphertexts.inputProof);
      
      console.log("Handle lengths:", ciphertexts.handles.map((h: Uint8Array) => h.length));
      console.log("Handles (hex):", handles);
      console.log("InputProof length:", inputProof.length);

      // Debug: log what we're sending
      console.log("FHETalk sendMessage params:", {
        recipient,
        sender: address,
        handlesCount: handles.length,
        handles: handles.map(h => h.toString()),
        inputProofLength: inputProof.length,
        contractAddress: chatConfig.address,
      });

      setStatusMessage("Sending transaction...");
      const contract = getContract("write");
      if (!contract) throw new Error("Contract not available");

      // Try static call first to get better error messages
      try {
        await contract.sendMessage.staticCall(recipient, handles, inputProof);
      } catch (staticErr: any) {
        console.error("Static call failed:", staticErr);
        throw new Error(staticErr?.reason || staticErr?.message || "Transaction will fail");
      }

      const tx = await contract.sendMessage(recipient, handles, inputProof);
      setStatusMessage("Waiting for confirmation...");
      await tx.wait();

      setStatusMessage("Message sent!");
      setMessageInput("");
      
      // Reload messages
      await loadMessages();
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Decrypt messages
  const handleDecrypt = async () => {
    if (!canDecrypt || allHandles.length === 0) {
      setStatusMessage("No messages to decrypt");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Requesting decryption...");

    try {
      await decrypt();
      setStatusMessage("Decryption complete!");
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Contact management
  const addContact = (addr?: string, contactName?: string) => {
    const targetAddress = addr || recipientInput;
    if (!targetAddress || !ethers.isAddress(targetAddress)) {
      setStatusMessage("Invalid address");
      return;
    }

    const normalizedAddress = targetAddress.toLowerCase();
    if (contacts.some(c => c.address.toLowerCase() === normalizedAddress)) {
      return; // Already exists, silently ignore
    }

    const newContact: Contact = {
      address: normalizedAddress,
      name: contactName?.trim() || newContactName.trim() || shortenAddress(targetAddress),
      addedAt: Date.now(),
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveContacts(updated);
    if (!addr) {
      setRecipientInput("");
      setNewContactName("");
    }
  };

  const removeContact = (address: string) => {
    const updated = contacts.filter(c => c.address.toLowerCase() !== address.toLowerCase());
    setContacts(updated);
    saveContacts(updated);
    if (selectedContact?.toLowerCase() === address.toLowerCase()) {
      setSelectedContact(null);
    }
  };

  const getContactName = (address: string): string => {
    const contact = contacts.find(c => c.address.toLowerCase() === address.toLowerCase());
    return contact ? contact.name : shortenAddress(address);
  };

  // Build recent chats from messages (like WhatsApp)
  const recentChats = useMemo((): RecentChat[] => {
    if (!address) return [];
    const myAddr = address.toLowerCase();
    const chatMap = new Map<string, RecentChat>();

    const allMsgs = [...inboxMessages, ...outboxMessages];
    
    for (const msg of allMsgs) {
      const otherAddr = msg.header.from.toLowerCase() === myAddr
        ? msg.header.to.toLowerCase()
        : msg.header.from.toLowerCase();
      
      const timestamp = new Date(Number(msg.header.timestamp) * 1000);
      const existing = chatMap.get(otherAddr);
      
      // Find decrypted content if available
      const decrypted = decryptedMessages.find(d => d.id === msg.id);
      const lastMessage = decrypted?.content || "[Encrypted message]";
      const isEncrypted = !decrypted;

      if (!existing || timestamp > existing.lastMessageTime) {
        chatMap.set(otherAddr, {
          address: otherAddr,
          name: getContactName(otherAddr),
          lastMessage,
          lastMessageTime: timestamp,
          isEncrypted,
        });
      }
    }

    // Sort by most recent first
    return Array.from(chatMap.values()).sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
    );
  }, [inboxMessages, outboxMessages, decryptedMessages, address, contacts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get encrypted messages for selected contact (before decrypt)
  const encryptedConversation = useMemo(() => {
    if (!selectedContact || !address) return [];
    const contactAddr = selectedContact.toLowerCase();
    const myAddr = address.toLowerCase();
    const allMsgs = [...inboxMessages, ...outboxMessages];
    return allMsgs
      .filter(msg => 
        (msg.header.from.toLowerCase() === contactAddr && msg.header.to.toLowerCase() === myAddr) ||
        (msg.header.to.toLowerCase() === contactAddr && msg.header.from.toLowerCase() === myAddr)
      )
      .sort((a, b) => Number(a.header.timestamp) - Number(b.header.timestamp));
  }, [selectedContact, inboxMessages, outboxMessages, address]);

  // Get conversation with selected contact (decrypted)
  const currentConversation = useMemo(() => {
    if (!selectedContact) return [];
    const contactAddr = selectedContact.toLowerCase();
    return decryptedMessages.filter(
      msg => msg.from.toLowerCase() === contactAddr || msg.to.toLowerCase() === contactAddr
    );
  }, [selectedContact, decryptedMessages]);

  // Filter recent chats by search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return recentChats;
    const q = searchQuery.toLowerCase();
    return recentChats.filter(
      chat => chat.name.toLowerCase().includes(q) || chat.address.toLowerCase().includes(q)
    );
  }, [recentChats, searchQuery]);

  // Filter contacts by search  
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  // Handle selecting a chat
  const handleSelectChat = (addr: string) => {
    setSelectedContact(addr);
    setShowMobileSidebar(false);
    setShowNewChat(false);
  };

  // Handle starting new chat
  const handleStartNewChat = () => {
    if (!recipientInput || !ethers.isAddress(recipientInput)) {
      setStatusMessage("Please enter a valid wallet address");
      return;
    }
    // Auto-add to contacts if not exists
    addContact(recipientInput, newContactName);
    setSelectedContact(recipientInput.toLowerCase());
    setShowNewChat(false);
    setRecipientInput("");
    setNewContactName("");
  };

  // ========== RENDER ==========

  return (
    <div className="h-screen w-screen bg-white overflow-hidden">
      {/* Main App Container - Full Screen */}
      <div className="w-full h-full flex flex-col">
        {/* App Header */}
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Image 
            src="/FHETalk_logo.png" 
            alt="FHETalk Logo" 
            width={32} 
            height={32} 
            className="rounded-full"
          />
          <div>
            <h1 className="font-semibold text-lg">FHETalk</h1>
            <p className="text-xs text-white/70 hidden sm:block">End-to-end encrypted messaging</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* FHEVM Status Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isReady ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isReady ? "bg-green-400 animate-pulse" : "bg-amber-400"}`}></span>
            FHEVM: {isReady ? "Ready" : status}
          </div>
          
          {/* Action Buttons */}
          <button
            onClick={loadMessages}
            disabled={isProcessing || !isReady}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh messages"
          >
            <svg className={`w-5 h-5 ${isProcessing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleDecrypt}
            disabled={isProcessing || !canDecrypt || allHandles.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            title="Decrypt messages"
          >
            <svg className={`w-5 h-5 ${isDecrypting ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium hidden md:inline">Decrypt Message</span>
          </button>
          
          {/* Wallet Connect */}
          <RainbowKitCustomConnectButton />
        </div>
      </div>

        {/* Status Message - Toast Style */}
        {statusMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border ${
              statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('invalid') || statusMessage.toLowerCase().includes('failed')
                ? 'bg-red-50 border-red-200 text-red-800'
                : statusMessage.toLowerCase().includes('success') || statusMessage.toLowerCase().includes('sent')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-gray-900 border-gray-700 text-white'
            }`}>
              {/* Icon */}
              {statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('invalid') || statusMessage.toLowerCase().includes('failed') ? (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : statusMessage.toLowerCase().includes('success') || statusMessage.toLowerCase().includes('sent') ? (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{statusMessage}</span>
              <button 
                onClick={() => setStatusMessage("")}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
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
                  onClick={() => setActiveTab("chats")}
                  className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
                    activeTab === "chats" 
                      ? "text-amber-600" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chats
                    {filteredChats.length > 0 && (
                      <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{filteredChats.length}</span>
                    )}
                  </div>
                  {activeTab === "chats" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("contacts")}
                  className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
                    activeTab === "contacts" 
                      ? "text-amber-600" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Contacts
                    {contacts.length > 0 && (
                      <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{contacts.length}</span>
                    )}
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
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Chats Tab */}
              {activeTab === "chats" && (
                <>
                  {filteredChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-center font-medium">No conversations yet</p>
                      <p className="text-sm text-center mt-1">Start a new chat to begin</p>
                    </div>
                  ) : (
                    filteredChats.map(chat => (
                      <button
                        key={chat.address}
                        onClick={() => handleSelectChat(chat.address)}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all border-b border-gray-100 relative active:scale-[0.98] ${
                          selectedContact === chat.address 
                            ? "bg-amber-50 border-l-4 border-l-amber-500" 
                            : "border-l-4 border-l-transparent"
                        }`}
                      >
                        {/* Avatar with Active Indicator */}
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
                        
                        {/* Chat Info */}
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
                    ))
                  )}
                </>
              )}

              {/* Contacts Tab */}
              {activeTab === "contacts" && (
                <>
                  {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-center font-medium">No contacts yet</p>
                      <p className="text-sm text-center mt-1">Add contacts to start chatting</p>
                    </div>
                  ) : (
                    filteredContacts.map(contact => (
                      <div
                        key={contact.address}
                        className={`p-4 flex items-center gap-3 hover:bg-gray-50 transition-all border-b border-gray-100 active:scale-[0.98] cursor-pointer ${
                          selectedContact === contact.address 
                            ? "bg-amber-50 border-l-4 border-l-amber-500" 
                            : "border-l-4 border-l-transparent"
                        }`}
                      >
                        {/* Avatar with Active Indicator */}
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
                          onClick={() => handleSelectChat(contact.address)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="font-semibold text-gray-900 truncate">{contact.name}</div>
                          <div className="text-xs text-gray-500">{shortenAddress(contact.address)}</div>
                        </button>
                        <button
                          onClick={() => removeContact(contact.address)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Remove contact"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* New Chat Button */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowNewChat(true)}
                className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            </div>
          </div>

          {/* Mobile Overlay */}
          {showMobileSidebar && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* New Chat Modal */}
            {showNewChat && (
              <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">New Chat</h3>
                    <button onClick={() => setShowNewChat(false)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
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
                        onChange={e => setRecipientInput(e.target.value)}
                        className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name (optional)</label>
                      <input
                        type="text"
                        placeholder="Contact name"
                        value={newContactName}
                        onChange={e => setNewContactName(e.target.value)}
                        className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <button
                      onClick={handleStartNewChat}
                      className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25"
                    >
                      Start Chat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Header */}
            {selectedContact ? (
              <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 flex-shrink-0">
                <button 
                  onClick={() => setShowMobileSidebar(true)}
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
              </div>
            ) : (
              <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 flex-shrink-0">
                <button 
                  onClick={() => setShowMobileSidebar(true)}
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
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
              {!selectedContact ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-28 h-28 rounded-3xl bg-amber-100 flex items-center justify-center mb-6 shadow-lg">
                    <svg className="w-14 h-14 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-gray-600 mb-2">Welcome to FHETalk</p>
                  <p className="text-sm text-center max-w-sm text-gray-500">Select a conversation from the sidebar or start a new chat to begin messaging securely.</p>
                </div>
              ) : encryptedConversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-24 h-24 rounded-3xl bg-amber-100 flex items-center justify-center mb-6 shadow-lg">
                    <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-gray-600 mb-2">Start the conversation</p>
                  <p className="text-sm text-center text-gray-500">Send your first encrypted message to {getContactName(selectedContact)}</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {currentConversation.length === 0 ? (
                    // Encrypted messages
                    encryptedConversation.map((msg, idx) => {
                      const isFromMe = msg.header.from.toLowerCase() === address?.toLowerCase();
                      return (
                        <div key={idx} className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] ${isFromMe ? "order-1" : "order-2"}`}>
                            <div className={`px-4 py-3 rounded-3xl ${
                              isFromMe
                                ? "bg-gray-900 text-white rounded-br-lg"
                                : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-lg"
                            }`}>
                              <div className="flex items-center gap-2 text-sm opacity-80 italic">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Encrypted message
                              </div>
                            </div>
                            <div className={`text-xs text-gray-500 mt-1.5 ${isFromMe ? "text-right" : "text-left"}`}>
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
                        <div className={`max-w-[75%] ${msg.isFromMe ? "order-1" : "order-2"}`}>
                          <div className={`px-4 py-3 rounded-3xl ${
                            msg.isFromMe
                              ? "bg-gray-900 text-white rounded-br-lg"
                              : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-lg"
                          }`}>
                            <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-1 text-xs text-gray-500 mt-1.5 ${msg.isFromMe ? "justify-end" : "justify-start"}`}>
                            {formatTime(msg.timestamp)}
                            {msg.isFromMe && (
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-end gap-3 max-w-3xl mx-auto">
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="w-full px-5 py-3.5 pr-16 bg-gray-100 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                    style={{ minHeight: "52px", maxHeight: "120px" }}
                    rows={1}
                    maxLength={256}
                    disabled={isProcessing || !selectedContact}
                  />
                  <span className="absolute right-5 bottom-4 text-xs text-gray-400">
                    {messageInput.length}/256
                  </span>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={isProcessing || !isReady || !selectedContact || !messageInput.trim()}
                  className="p-3.5 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/25"
                >
                  {isProcessing ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                Messages are end-to-end encrypted with Fully Homomorphic Encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Export with Provider
// ============================================================================

export function ChatDemo() {
  return (
    <FHEVMProvider config={{
      rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
      chainId: 11155111,
      mockChains: { 31337: "http://localhost:8545" }
    }}>
      <ChatDemoContent />
    </FHEVMProvider>
  );
}
