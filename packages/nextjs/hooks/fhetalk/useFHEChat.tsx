"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm/sdk";
import {
  useFHEDecrypt,
  useInMemoryStorage,
  toHex,
} from "@fhevm/sdk/react";
import { ethers } from "ethers";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract, useWriteContract } from "wagmi";

/**
 * Message header structure matching the contract
 */
export interface MessageHeader {
  from: string;
  to: string;
  timestamp: bigint;
  chunkCount: number;
}

/**
 * Encrypted message with header and chunk handles
 */
export interface EncryptedMessage {
  id: bigint;
  header: MessageHeader;
  chunkHandles: string[];
}

/**
 * Decrypted message ready for display
 */
export interface DecryptedMessage {
  id: bigint;
  from: string;
  to: string;
  timestamp: Date;
  content: string;
  isFromMe: boolean;
}

/**
 * Encode a string message into uint64 chunks (8 bytes per chunk)
 * @param message The string to encode
 * @returns Array of BigInt values, each representing 8 bytes
 */
export function encodeMessageToUint64Chunks(message: string): bigint[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(message); // UTF-8 bytes

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

/**
 * Decode uint64 chunks back into a string
 * @param chunkHandles Array of chunk handle strings
 * @param decryptedMap Map of handle => decrypted BigInt value
 * @returns Decoded string message
 */
export function decodeMessageFromChunks(
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

  // Trim trailing zero padding
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) {
    end--;
  }

  const clean = bytes.slice(0, end);
  return new TextDecoder().decode(new Uint8Array(clean));
}

/**
 * useFHEChat - Hook for FHE-encrypted chat operations
 * 
 * Provides functionality to:
 * - Send encrypted messages
 * - Load inbox/outbox message IDs
 * - Load message headers and encrypted chunks
 * - Decrypt messages
 */
export const useFHEChat = (parameters: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = parameters;
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();

  // Wagmi + ethers interop
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  // Resolve deployed contract info
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: encryptedChat } = useDeployedContractInfo({ contractName: "FHETalk", chainId: allowedChainId });

  // State
  const [message, setMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [inboxMessages, setInboxMessages] = useState<EncryptedMessage[]>([]);
  const [outboxMessages, setOutboxMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [allHandles, setAllHandles] = useState<string[]>([]);

  // Helpers
  const hasContract = Boolean(encryptedChat?.address && encryptedChat?.abi);
  const hasProvider = Boolean(ethersReadonlyProvider);
  const hasSigner = Boolean(ethersSigner);

  const getContract = useCallback((mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      encryptedChat!.address,
      encryptedChat!.abi as any,
      providerOrSigner,
    );
  }, [hasContract, encryptedChat, ethersReadonlyProvider, ethersSigner]);

  // Decryption setup
  const requests = useMemo(() => {
    if (!hasContract || allHandles.length === 0) return undefined;
    return allHandles
      .filter(h => h !== ethers.ZeroHash)
      .map(handle => ({
        handle,
        contractAddress: encryptedChat!.address,
      }));
  }, [hasContract, encryptedChat?.address, allHandles]);

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decMsg,
    results: decryptedResults,
  } = useFHEDecrypt({
    instance: instance ?? null,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    requests,
  });

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  /**
   * Send an encrypted message to a recipient
   */
  const sendMessage = useCallback(async (to: string, text: string) => {
    if (!instance || !hasContract || !hasSigner) {
      setMessage("Missing dependencies for sending");
      return false;
    }

    if (!text.trim()) {
      setMessage("Message cannot be empty");
      return false;
    }

    if (text.length > 256) {
      setMessage("Message too long (max 256 characters)");
      return false;
    }

    setIsProcessing(true);
    setMessage("Encrypting message...");

    try {
      const signer = ethersSigner!;
      const fromAddress = await signer.getAddress();

      // Encode message to uint64 chunks
      const chunks = encodeMessageToUint64Chunks(text);
      setMessage(`Encoding ${chunks.length} chunks...`);

      // Create encrypted input buffer
      const buffer = instance.createEncryptedInput(encryptedChat!.address, fromAddress);

      for (const chunk of chunks) {
        buffer.add64(chunk);
      }

      // Encrypt
      setMessage("Sending to FHEVM gateway...");
      const ciphertexts = await buffer.encrypt();

      if (!ciphertexts.handles || ciphertexts.handles.length === 0) {
        throw new Error("Encryption failed - no handles returned");
      }

      // Convert handles to proper format for contract
      // externalEuint64[] maps to uint256[] in the ABI, so we need BigInt
      const handles = ciphertexts.handles.map((h: Uint8Array) => {
        const hex = toHex(h);
        return BigInt(hex);
      });
      const inputProof = toHex(ciphertexts.inputProof);

      // Call contract
      setMessage("Sending transaction...");
      const contract = getContract("write")!;
      const tx = await contract.sendMessage(to, handles, inputProof);
      
      setMessage("Waiting for confirmation...");
      await tx.wait();

      setMessage("Message sent successfully!");
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessage(`Failed to send: ${errorMsg}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [instance, hasContract, hasSigner, ethersSigner, encryptedChat, getContract]);

  /**
   * Load inbox message IDs for the current user
   */
  const loadInboxIds = useCallback(async (): Promise<bigint[]> => {
    if (!hasContract || !hasProvider || !hasSigner) return [];

    try {
      const contract = getContract("read")!;
      const signer = ethersSigner!;
      const myAddress = await signer.getAddress();
      const ids: bigint[] = await contract.getInboxIds(myAddress);
      return ids;
    } catch (error) {
      console.error("Failed to load inbox:", error);
      return [];
    }
  }, [hasContract, hasProvider, hasSigner, getContract, ethersSigner]);

  /**
   * Load outbox message IDs for the current user
   */
  const loadOutboxIds = useCallback(async (): Promise<bigint[]> => {
    if (!hasContract || !hasProvider || !hasSigner) return [];

    try {
      const contract = getContract("read")!;
      const signer = ethersSigner!;
      const myAddress = await signer.getAddress();
      const ids: bigint[] = await contract.getOutboxIds(myAddress);
      return ids;
    } catch (error) {
      console.error("Failed to load outbox:", error);
      return [];
    }
  }, [hasContract, hasProvider, hasSigner, getContract, ethersSigner]);

  /**
   * Load a single message (header + encrypted chunks)
   */
  const loadMessage = useCallback(async (messageId: bigint): Promise<EncryptedMessage | null> => {
    if (!hasContract || !hasProvider) return null;

    try {
      const contract = getContract("read")!;
      
      const headerRaw = await contract.getMessageHeader(messageId);
      const header: MessageHeader = {
        from: headerRaw.from,
        to: headerRaw.to,
        timestamp: headerRaw.timestamp,
        chunkCount: Number(headerRaw.chunkCount),
      };

      const chunkHandles: string[] = [];
      for (let i = 0; i < header.chunkCount; i++) {
        const chunk = await contract.getMessageChunk(messageId, i);
        chunkHandles.push(chunk as string);
      }

      return { id: messageId, header, chunkHandles };
    } catch (error) {
      console.error(`Failed to load message ${messageId}:`, error);
      return null;
    }
  }, [hasContract, hasProvider, getContract]);

  /**
   * Refresh all messages (inbox + outbox)
   */
  const refreshMessages = useCallback(async () => {
    if (!hasContract || !hasProvider || !hasSigner) {
      setMessage("Not connected");
      return;
    }

    setIsProcessing(true);
    setMessage("Loading messages...");

    try {
      const myAddress = await ethersSigner!.getAddress();
      
      // Load inbox and outbox IDs
      const [inboxIds, outboxIds] = await Promise.all([
        loadInboxIds(),
        loadOutboxIds(),
      ]);

      // Load all messages
      const inboxMsgs: EncryptedMessage[] = [];
      const outboxMsgs: EncryptedMessage[] = [];
      const handles: string[] = [];

      for (const id of inboxIds) {
        const msg = await loadMessage(id);
        if (msg) {
          inboxMsgs.push(msg);
          handles.push(...msg.chunkHandles);
        }
      }

      for (const id of outboxIds) {
        const msg = await loadMessage(id);
        if (msg) {
          outboxMsgs.push(msg);
          handles.push(...msg.chunkHandles);
        }
      }

      setInboxMessages(inboxMsgs);
      setOutboxMessages(outboxMsgs);
      setAllHandles([...new Set(handles)]); // Deduplicate
      setMessage(`Loaded ${inboxMsgs.length} inbox, ${outboxMsgs.length} outbox messages`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessage(`Failed to refresh: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  }, [hasContract, hasProvider, hasSigner, ethersSigner, loadInboxIds, loadOutboxIds, loadMessage]);

  /**
   * Decrypt all loaded messages
   */
  const decryptAllMessages = useCallback(async () => {
    if (!canDecrypt || allHandles.length === 0) {
      setMessage("No messages to decrypt or missing permissions");
      return;
    }

    setIsProcessing(true);
    setMessage("Requesting decryption...");

    try {
      await decrypt();
      setMessage("Decryption complete!");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessage(`Decryption failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  }, [canDecrypt, allHandles, decrypt]);

  // Process decrypted results into messages
  useEffect(() => {
    if (!decryptedResults || Object.keys(decryptedResults).length === 0) return;
    if (!ethersSigner) return;

    const processMessages = async () => {
      const myAddress = (await ethersSigner.getAddress()).toLowerCase();
      const allMessages = [...inboxMessages, ...outboxMessages];
      const processed: DecryptedMessage[] = [];

      for (const msg of allMessages) {
        // Check if all chunks are decrypted
        const allDecrypted = msg.chunkHandles.every(h => decryptedResults[h] !== undefined);
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

      // Sort by timestamp
      processed.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setDecryptedMessages(processed);
    };

    processMessages();
  }, [decryptedResults, inboxMessages, outboxMessages, ethersSigner]);

  /**
   * Get conversation with a specific address
   */
  const getConversationWith = useCallback((address: string): DecryptedMessage[] => {
    const addr = address.toLowerCase();
    return decryptedMessages.filter(
      msg => msg.from.toLowerCase() === addr || msg.to.toLowerCase() === addr
    );
  }, [decryptedMessages]);

  /**
   * Get unique contacts from messages
   */
  const getContacts = useCallback(async (): Promise<string[]> => {
    if (!ethersSigner) return [];
    const myAddress = (await ethersSigner.getAddress()).toLowerCase();
    
    const contacts = new Set<string>();
    
    for (const msg of inboxMessages) {
      const addr = msg.header.from.toLowerCase();
      if (addr !== myAddress) contacts.add(addr);
    }
    
    for (const msg of outboxMessages) {
      const addr = msg.header.to.toLowerCase();
      if (addr !== myAddress) contacts.add(addr);
    }
    
    return Array.from(contacts);
  }, [ethersSigner, inboxMessages, outboxMessages]);

  return {
    // Contract info
    contractAddress: encryptedChat?.address,
    
    // Connection status
    isConnected,
    chainId,
    accounts,
    hasContract,
    hasSigner,

    // Operations
    sendMessage,
    refreshMessages,
    decryptAllMessages,
    getConversationWith,
    getContacts,

    // State
    inboxMessages,
    outboxMessages,
    decryptedMessages,
    allHandles,

    // Status
    message,
    isProcessing,
    canDecrypt,
    isDecrypting,
    decryptedResults,
  };
};
