// ============================================================================
// Utility Functions - Chat Module
// ============================================================================

import { Contact } from "./types";
import { CONTACTS_KEY, AVATAR_COLORS } from "./constants";

// ============================================================================
// Local Storage
// ============================================================================

export function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveContacts(contacts: Contact[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

// ============================================================================
// Message Encoding/Decoding
// ============================================================================

export function encodeMessageToUint64Chunks(message: string): bigint[] {
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

  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) {
    end--;
  }

  return new TextDecoder().decode(new Uint8Array(bytes.slice(0, end)));
}

// ============================================================================
// Formatting
// ============================================================================

export function shortenAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeTime(date: Date): string {
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

export function generateAvatarColor(address: string): string {
  const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ============================================================================
// Hex Conversion Utilities
// ============================================================================

export function toHex(data: Uint8Array): string {
  return "0x" + Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function toBytes32(data: Uint8Array): string {
  if (data.length === 32) {
    return toHex(data);
  }
  if (data.length > 32) {
    throw new Error(`Handle too long: ${data.length} bytes`);
  }
  const padded = new Uint8Array(32);
  padded.set(data, 0);
  return toHex(padded);
}

export function normalizeHandle(chunk: unknown): string {
  if (typeof chunk === 'bigint') {
    return '0x' + chunk.toString(16).padStart(64, '0');
  } else if (typeof chunk === 'string') {
    let handleHex = chunk.startsWith('0x') ? chunk : '0x' + chunk;
    if (handleHex.length < 66) {
      handleHex = '0x' + handleHex.slice(2).padStart(64, '0');
    }
    return handleHex;
  }
  return '0x' + String(chunk).padStart(64, '0');
}
