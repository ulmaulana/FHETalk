// ============================================================================
// Types & Interfaces - Extracted from ChatDemo.tsx
// ============================================================================

export enum AttachmentType {
  None = 0,
  Image = 1,
}

export interface MessageHeader {
  from: string;
  to: string;
  timestamp: bigint;
  chunkCount: number;
  attachmentType: AttachmentType;
}

export interface EncryptedMessage {
  id: bigint;
  header: MessageHeader;
  chunkHandles: string[];
  attachmentCid?: string;
}

export interface DecryptedMessage {
  id: bigint;
  from: string;
  to: string;
  timestamp: Date;
  content: string;
  isFromMe: boolean;
  attachmentType: AttachmentType;
  attachmentCid?: string;
}

export interface UserProfile {
  displayName: string;
  avatarCid: string;
  updatedAt: bigint;
  exists: boolean;
}

export interface Contact {
  address: string;
  name: string;
  addedAt: number;
  isBlocked?: boolean;
}

export interface RecentChat {
  address: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  isEncrypted: boolean;
  unreadCount?: number;
}

export interface Group {
  groupId: bigint;
  name: string;
  metadataURI: string;
  owner: string;
  createdAt: bigint;
  isClosed: boolean;
  exists: boolean;
}

export interface GroupMessage {
  id: bigint;
  groupId: bigint;
  from: string;
  timestamp: Date;
  content: string;
  isFromMe: boolean;
  attachmentType: AttachmentType;
  attachmentCid?: string;
  chunkHandles?: string[]; // For decryption
}

export type ActiveTab = "chats" | "contacts" | "groups";
export type ChatMode = "dm" | "group";
