"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Contact structure for the FHETalk address book
 */
export interface Contact {
  address: string;
  name: string;
  addedAt: number; // Unix timestamp
}

const STORAGE_KEY = "fhetalk-contacts";

/**
 * Load contacts from localStorage
 */
function loadContactsFromStorage(): Contact[] {
  if (typeof window === "undefined") return [];
  
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save contacts to localStorage
 */
function saveContactsToStorage(contacts: Contact[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

/**
 * useContacts - Hook for managing local contact list
 * 
 * Contacts are stored in localStorage, not on-chain.
 * This provides a simple address book functionality.
 */
export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load contacts on mount
  useEffect(() => {
    const loaded = loadContactsFromStorage();
    setContacts(loaded);
    setIsLoaded(true);
  }, []);

  // Save contacts whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveContactsToStorage(contacts);
    }
  }, [contacts, isLoaded]);

  /**
   * Add a new contact
   */
  const addContact = useCallback((address: string, name: string): boolean => {
    const normalizedAddress = address.toLowerCase();
    
    // Check if already exists
    if (contacts.some(c => c.address.toLowerCase() === normalizedAddress)) {
      return false;
    }

    const newContact: Contact = {
      address: normalizedAddress,
      name: name.trim(),
      addedAt: Date.now(),
    };

    setContacts(prev => [...prev, newContact]);
    return true;
  }, [contacts]);

  /**
   * Update an existing contact
   */
  const updateContact = useCallback((address: string, name: string): boolean => {
    const normalizedAddress = address.toLowerCase();
    
    setContacts(prev => prev.map(c => 
      c.address.toLowerCase() === normalizedAddress
        ? { ...c, name: name.trim() }
        : c
    ));
    return true;
  }, []);

  /**
   * Remove a contact
   */
  const removeContact = useCallback((address: string): boolean => {
    const normalizedAddress = address.toLowerCase();
    
    setContacts(prev => prev.filter(
      c => c.address.toLowerCase() !== normalizedAddress
    ));
    return true;
  }, []);

  /**
   * Get a contact by address
   */
  const getContact = useCallback((address: string): Contact | undefined => {
    const normalizedAddress = address.toLowerCase();
    return contacts.find(c => c.address.toLowerCase() === normalizedAddress);
  }, [contacts]);

  /**
   * Get display name for an address (contact name or shortened address)
   */
  const getDisplayName = useCallback((address: string): string => {
    const contact = getContact(address);
    if (contact) return contact.name;
    
    // Return shortened address: 0x1234...5678
    if (address.length >= 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
  }, [getContact]);

  /**
   * Check if an address is in contacts
   */
  const isContact = useCallback((address: string): boolean => {
    const normalizedAddress = address.toLowerCase();
    return contacts.some(c => c.address.toLowerCase() === normalizedAddress);
  }, [contacts]);

  /**
   * Search contacts by name or address
   */
  const searchContacts = useCallback((query: string): Contact[] => {
    const q = query.toLowerCase();
    return contacts.filter(
      c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }, [contacts]);

  /**
   * Clear all contacts
   */
  const clearAllContacts = useCallback((): void => {
    setContacts([]);
  }, []);

  /**
   * Import contacts from JSON
   */
  const importContacts = useCallback((json: string): boolean => {
    try {
      const imported: Contact[] = JSON.parse(json);
      if (!Array.isArray(imported)) return false;
      
      // Validate and merge
      const valid = imported.filter(
        c => typeof c.address === "string" && typeof c.name === "string"
      );
      
      setContacts(prev => {
        const existing = new Set(prev.map(c => c.address.toLowerCase()));
        const newContacts = valid.filter(
          c => !existing.has(c.address.toLowerCase())
        );
        return [...prev, ...newContacts];
      });
      
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Export contacts to JSON
   */
  const exportContacts = useCallback((): string => {
    return JSON.stringify(contacts, null, 2);
  }, [contacts]);

  return {
    // Data
    contacts,
    isLoaded,
    
    // CRUD operations
    addContact,
    updateContact,
    removeContact,
    getContact,
    
    // Utilities
    getDisplayName,
    isContact,
    searchContacts,
    
    // Bulk operations
    clearAllContacts,
    importContacts,
    exportContacts,
  };
};
