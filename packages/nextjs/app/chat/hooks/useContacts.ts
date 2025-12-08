// ============================================================================
// useContacts Hook - Contact management logic
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { Contact, RecentChat, EncryptedMessage, DecryptedMessage } from "../types";
import { loadContacts, saveContacts, shortenAddress } from "../utils";

interface UseContactsProps {
  address?: string;
  getContract: (mode: "read" | "write") => ethers.Contract | undefined;
  setStatusMessage: (msg: string) => void;
  setIsProcessing: (val: boolean) => void;
  inboxMessages: EncryptedMessage[];
  outboxMessages: EncryptedMessage[];
  decryptedMessages: DecryptedMessage[];
}

export function useContacts({
  address,
  getContract,
  setStatusMessage,
  setIsProcessing,
  inboxMessages,
  outboxMessages,
  decryptedMessages,
}: UseContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  
  // New Chat Modal State
  const [showNewChat, setShowNewChat] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [newContactName, setNewContactName] = useState("");

  // Load contacts on mount
  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  const addContact = useCallback((addr?: string, contactName?: string) => {
    const targetAddress = addr || recipientInput;
    if (!targetAddress || !ethers.isAddress(targetAddress)) {
      setStatusMessage("Invalid address");
      return;
    }

    const normalizedAddress = targetAddress.toLowerCase();
    if (contacts.some(c => c.address.toLowerCase() === normalizedAddress)) {
      return;
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
  }, [contacts, recipientInput, newContactName, setStatusMessage]);

  const removeContact = useCallback((contactAddress: string) => {
    const updated = contacts.filter(c => c.address.toLowerCase() !== contactAddress.toLowerCase());
    setContacts(updated);
    saveContacts(updated);
    if (selectedContact?.toLowerCase() === contactAddress.toLowerCase()) {
      setSelectedContact(null);
    }
  }, [contacts, selectedContact]);

  const getContactName = useCallback((contactAddress: string): string => {
    const contact = contacts.find(c => c.address.toLowerCase() === contactAddress.toLowerCase());
    return contact ? contact.name : shortenAddress(contactAddress);
  }, [contacts]);

  // Block/unblock user
  const toggleBlockUser = async (targetAddress: string) => {
    if (!targetAddress) return;
    const contact = contacts.find(c => c.address.toLowerCase() === targetAddress.toLowerCase());
    const currentlyBlocked = contact?.isBlocked || false;
    
    setIsProcessing(true);
    setStatusMessage(currentlyBlocked ? "Unblocking user..." : "Blocking user...");
    try {
      const contract = getContract("write");
      if (!contract) {
        setStatusMessage("Contract not ready. Please wait and try again.");
        setIsProcessing(false);
        return;
      }
      const tx = await contract.setBlockStatus(targetAddress, !currentlyBlocked);
      await tx.wait();
      
      const updated = contacts.map(c => 
        c.address.toLowerCase() === targetAddress.toLowerCase() 
          ? { ...c, isBlocked: !currentlyBlocked }
          : c
      );
      setContacts(updated);
      saveContacts(updated);
      setStatusMessage(currentlyBlocked ? "User unblocked" : "User blocked");
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Build recent chats from messages
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

    return Array.from(chatMap.values()).sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
    );
  }, [inboxMessages, outboxMessages, decryptedMessages, address, getContactName]);

  return {
    contacts,
    setContacts,
    selectedContact,
    setSelectedContact,
    showNewChat,
    setShowNewChat,
    recipientInput,
    setRecipientInput,
    newContactName,
    setNewContactName,
    addContact,
    removeContact,
    getContactName,
    toggleBlockUser,
    recentChats,
  };
}
