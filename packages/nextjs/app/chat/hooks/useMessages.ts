// ============================================================================
// useMessages Hook - Message loading, sending, and decryption logic
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useFHEDecrypt, useInMemoryStorage } from "@fhevm/sdk/react";
import { 
  AttachmentType, 
  EncryptedMessage, 
  DecryptedMessage 
} from "../types";
import { 
  encodeMessageToUint64Chunks, 
  decodeMessageFromChunks, 
  normalizeHandle,
  toHex,
  toBytes32,
} from "../utils";
import { MAX_CHARS } from "../constants";

interface UseMessagesProps {
  address?: string;
  chatConfig: { address: string; abi: any };
  instance: any;
  ethersSigner: any;
  isReady: boolean;
  getContract: (mode: "read" | "write") => ethers.Contract | undefined;
  setStatusMessage: (msg: string) => void;
  setIsProcessing: (val: boolean) => void;
}

export function useMessages({
  address,
  chatConfig,
  instance,
  ethersSigner,
  isReady,
  getContract,
  setStatusMessage,
  setIsProcessing,
}: UseMessagesProps) {
  const [inboxMessages, setInboxMessages] = useState<EncryptedMessage[]>([]);
  const [outboxMessages, setOutboxMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [allHandles, setAllHandles] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState("");

  // Decryption setup
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  
  const requests = useMemo(() => {
    if (!chatConfig.address || allHandles.length === 0) return [];
    const validHandles = allHandles.filter((h: string) => h && h !== ethers.ZeroHash);
    if (validHandles.length === 0) return [];
    return validHandles.map((handle: string) => ({
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
    ethersSigner,
    fhevmDecryptionSignatureStorage,
    requests,
  });

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

      for (const id of inboxIds) {
        const header = await contract.getMessageHeader(id);
        const chunkHandles: string[] = [];
        
        for (let i = 0; i < Number(header.chunkCount); i++) {
          const chunk = await contract.getMessageChunk(id, i);
          const handleHex = normalizeHandle(chunk);
          chunkHandles.push(handleHex);
          handles.push(handleHex);
        }

        inbox.push({
          id,
          header: {
            from: header.from,
            to: header.to,
            timestamp: header.timestamp,
            chunkCount: Number(header.chunkCount),
            attachmentType: Number(header.attachmentType || 0) as AttachmentType,
          },
          chunkHandles,
        });
      }

      for (const id of outboxIds) {
        const header = await contract.getMessageHeader(id);
        const chunkHandles: string[] = [];
        
        for (let i = 0; i < Number(header.chunkCount); i++) {
          const chunk = await contract.getMessageChunk(id, i);
          const handleHex = normalizeHandle(chunk);
          chunkHandles.push(handleHex);
          handles.push(handleHex);
        }

        outbox.push({
          id,
          header: {
            from: header.from,
            to: header.to,
            timestamp: header.timestamp,
            chunkCount: Number(header.chunkCount),
            attachmentType: Number(header.attachmentType || 0) as AttachmentType,
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
  }, [chatConfig.address, address, isReady, getContract, setStatusMessage, setIsProcessing]);

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
        attachmentType: msg.header.attachmentType,
        attachmentCid: msg.attachmentCid,
      });
    }

    processed.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setDecryptedMessages(processed);
  }, [decryptedResults, inboxMessages, outboxMessages, address]);

  // Send message - recipient passed as parameter
  const sendMessage = async (recipient: string) => {
    if (!recipient || !ethers.isAddress(recipient)) {
      setStatusMessage("Please enter a valid recipient address");
      return;
    }

    if (recipient.toLowerCase() === address?.toLowerCase()) {
      setStatusMessage("Cannot send message to yourself");
      return;
    }

    if (!messageInput.trim()) {
      setStatusMessage("Please enter a message");
      return;
    }

    if (messageInput.length > MAX_CHARS) {
      setStatusMessage(`Message too long (max ${MAX_CHARS} characters)`);
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
      const contractAddr = ethers.getAddress(chatConfig.address);
      const userAddr = ethers.getAddress(address);
      
      const buffer = instance.createEncryptedInput(contractAddr, userAddr);
      for (const chunk of chunks) {
        buffer.add64(chunk);
      }

      setStatusMessage("Sending to FHEVM gateway...");
      const ciphertexts = await buffer.encrypt();

      if (!ciphertexts.handles || ciphertexts.handles.length === 0) {
        throw new Error("Encryption failed");
      }

      const handles = ciphertexts.handles.map((h: Uint8Array) => toBytes32(h));
      const inputProof = toHex(ciphertexts.inputProof);

      setStatusMessage("Sending transaction...");
      const contract = getContract("write");
      if (!contract) throw new Error("Contract not available");

      try {
        await contract.sendMessage.staticCall(recipient, handles, inputProof);
      } catch (staticErr: any) {
        throw new Error(staticErr?.reason || staticErr?.message || "Transaction will fail");
      }

      const tx = await contract.sendMessage(recipient, handles, inputProof);
      setStatusMessage("Waiting for confirmation...");
      await tx.wait();

      setStatusMessage("Message sent!");
      setMessageInput("");
      
      await loadMessages();
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Decrypt messages
  const handleDecrypt = async () => {
    if (!canDecrypt || allHandles.length === 0 || requests.length === 0) {
      setStatusMessage("No messages to decrypt");
      return;
    }

    setIsProcessing(true);
    setStatusMessage(`Decrypting ${requests.length} message chunks...`);

    try {
      await decrypt();
      setStatusMessage("Decryption complete!");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Zama Relayer')) {
        setStatusMessage("Decryption service temporarily unavailable. Please try again.");
      } else {
        setStatusMessage(`Error: ${errorMsg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    inboxMessages,
    outboxMessages,
    decryptedMessages,
    decryptedResults,
    allHandles,
    setAllHandles,
    messageInput,
    setMessageInput,
    canDecrypt,
    isDecrypting,
    loadMessages,
    sendMessage,
    handleDecrypt,
  };
}
