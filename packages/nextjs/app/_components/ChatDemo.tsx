"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { FHEVMProvider, useFHEVM, useInMemoryStorage, useFHEDecrypt } from "@fhevm/sdk/react";
import { FhevmInstance } from "@fhevm/sdk";
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

function formatDate(date: Date): string {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  
  return date.toLocaleDateString();
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
  const { instance, isInitialized: isReady, status, error: fhevmError } = useFHEVM(fhevmConfig);

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
  const [showAddContact, setShowAddContact] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "contacts">("chat");

  // Messages state
  const [inboxMessages, setInboxMessages] = useState<EncryptedMessage[]>([]);
  const [outboxMessages, setOutboxMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [allHandles, setAllHandles] = useState<string[]>([]);

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
    fhevmDecryptionSignatureStorage: fhevmDecryptionSignatureStorage.storage,
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
  const addContact = () => {
    if (!recipientInput || !ethers.isAddress(recipientInput)) {
      setStatusMessage("Invalid address");
      return;
    }

    const normalizedAddress = recipientInput.toLowerCase();
    if (contacts.some(c => c.address.toLowerCase() === normalizedAddress)) {
      setStatusMessage("Contact already exists");
      return;
    }

    const newContact: Contact = {
      address: normalizedAddress,
      name: newContactName.trim() || shortenAddress(recipientInput),
      addedAt: Date.now(),
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveContacts(updated);
    setRecipientInput("");
    setNewContactName("");
    setShowAddContact(false);
    setStatusMessage("Contact added!");
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

  // Get unique conversation partners
  const conversationPartners = useMemo(() => {
    if (!address) return [];
    const myAddr = address.toLowerCase();
    const partners = new Set<string>();

    for (const msg of [...inboxMessages, ...outboxMessages]) {
      const otherAddr = msg.header.from.toLowerCase() === myAddr
        ? msg.header.to.toLowerCase()
        : msg.header.from.toLowerCase();
      partners.add(otherAddr);
    }

    return Array.from(partners);
  }, [inboxMessages, outboxMessages, address]);

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

  // ========== RENDER ==========

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="bg-white border shadow-xl p-8 text-center rounded-lg">
            <div className="mb-4">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-4xl">
                
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to FHETalk</h2>
            <p className="text-gray-600 mb-6">Connect your wallet to start sending encrypted messages</p>
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">FHETalk</h1>
        <p className="text-gray-600">Private messaging powered by Fully Homomorphic Encryption</p>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 p-3 rounded-lg mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${
            isReady ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
          }`}>
            {isReady ? "FHEVM Ready" : `Status: ${status}`}
          </span>
          <span className="text-sm text-gray-600">
            Contract: {chatConfig.address ? shortenAddress(chatConfig.address) : "Not deployed"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMessages}
            disabled={isProcessing || !isReady}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={handleDecrypt}
            disabled={isProcessing || !canDecrypt || allHandles.length === 0}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isDecrypting ? "Decrypting..." : "Decrypt All"}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg mb-4">
          {statusMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - Contacts & Conversations */}
        <div className="lg:col-span-1 bg-white border rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === "chat"
                  ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === "contacts"
                  ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Contacts
            </button>
          </div>

          {/* Content */}
          <div className="p-2 max-h-[500px] overflow-y-auto">
            {activeTab === "chat" ? (
              <>
                {conversationPartners.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No conversations yet</p>
                ) : (
                  conversationPartners.map(addr => (
                    <button
                      key={addr}
                      onClick={() => setSelectedContact(addr)}
                      className={`w-full p-3 text-left rounded-lg mb-1 ${
                        selectedContact === addr
                          ? "bg-blue-100 border border-blue-300"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium text-gray-900">{getContactName(addr)}</div>
                      <div className="text-xs text-gray-500">{shortenAddress(addr)}</div>
                    </button>
                  ))
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="w-full p-2 mb-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  + Add Contact
                </button>
                
                {showAddContact && (
                  <div className="p-2 bg-gray-50 rounded-lg mb-2">
                    <input
                      type="text"
                      placeholder="Wallet Address"
                      value={recipientInput}
                      onChange={e => setRecipientInput(e.target.value)}
                      className="w-full p-2 text-sm border rounded mb-2"
                    />
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={newContactName}
                      onChange={e => setNewContactName(e.target.value)}
                      className="w-full p-2 text-sm border rounded mb-2"
                    />
                    <button
                      onClick={addContact}
                      className="w-full p-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save Contact
                    </button>
                  </div>
                )}

                {contacts.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No contacts saved</p>
                ) : (
                  contacts.map(contact => (
                    <div
                      key={contact.address}
                      className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                    >
                      <button
                        onClick={() => {
                          setSelectedContact(contact.address);
                          setActiveTab("chat");
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-gray-900">{contact.name}</div>
                        <div className="text-xs text-gray-500">{shortenAddress(contact.address)}</div>
                      </button>
                      <button
                        onClick={() => removeContact(contact.address)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        x
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 bg-white border rounded-lg flex flex-col min-h-[500px]">
          {/* Chat Header */}
          <div className="p-4 border-b">
            {selectedContact ? (
              <div>
                <h3 className="font-bold text-gray-900">{getContactName(selectedContact)}</h3>
                <p className="text-sm text-gray-500">{selectedContact}</p>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-gray-900">New Conversation</h3>
                <input
                  type="text"
                  placeholder="Enter recipient address (0x...)"
                  value={recipientInput}
                  onChange={e => setRecipientInput(e.target.value)}
                  className="mt-2 w-full p-2 border rounded text-sm"
                />
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {!selectedContact ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a contact or enter an address to start chatting</p>
              </div>
            ) : encryptedConversation.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No messages yet. Send your first encrypted message!</p>
              </div>
            ) : currentConversation.length === 0 ? (
              /* Show encrypted placeholders when not yet decrypted */
              <div className="space-y-3">
                {encryptedConversation.map((msg, idx) => {
                  const isFromMe = msg.header.from.toLowerCase() === address?.toLowerCase();
                  return (
                    <div
                      key={idx}
                      className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          isFromMe
                            ? "bg-blue-400 text-white"
                            : "bg-gray-200 border text-gray-600"
                        }`}
                      >
                        <p className="break-words italic">
                          [Encrypted - Click "Decrypt All" to view]
                        </p>
                        <p className={`text-xs mt-1 ${isFromMe ? "text-blue-200" : "text-gray-500"}`}>
                          {formatTime(new Date(Number(msg.header.timestamp) * 1000))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Show decrypted messages */
              <div className="space-y-3">
                {currentConversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.isFromMe
                          ? "bg-blue-600 text-white"
                          : "bg-white border text-gray-900"
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.isFromMe ? "text-blue-200" : "text-gray-500"
                      }`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your encrypted message..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isProcessing && sendMessage()}
                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={256}
                disabled={isProcessing}
              />
              <button
                onClick={sendMessage}
                disabled={isProcessing || !isReady || (!selectedContact && !recipientInput)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Sending..." : "Send"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {messageInput.length}/256 characters | Messages are end-to-end encrypted with FHE
            </p>
          </div>
        </div>
      </div>

      {/* Debug Info (collapsible) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-gray-600 text-sm">Debug Info</summary>
        <div className="mt-2 p-4 bg-gray-100 rounded-lg text-sm font-mono">
          <p>Chain ID: {chainId}</p>
          <p>Address: {address}</p>
          <p>FHEVM Status: {status}</p>
          <p>Contract: {chatConfig.address}</p>
          <p>Inbox: {inboxMessages.length} messages</p>
          <p>Outbox: {outboxMessages.length} messages</p>
          <p>Handles: {allHandles.length}</p>
          <p>Decrypted: {Object.keys(decryptedResults || {}).length}</p>
          <p>Can Decrypt: {canDecrypt ? "Yes" : "No"}</p>
        </div>
      </details>
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
