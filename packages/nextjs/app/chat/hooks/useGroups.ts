// ============================================================================
// useGroups Hook - Group management logic
// ============================================================================

import { useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { Group, GroupMessage, AttachmentType } from "../types";
import { 
  encodeMessageToUint64Chunks, 
  normalizeHandle,
  toHex,
  toBytes32,
} from "../utils";

interface UseGroupsProps {
  address?: string;
  chatConfig: { address: string; abi: any };
  instance: any;
  getContract: (mode: "read" | "write") => ethers.Contract | undefined;
  setStatusMessage: (msg: string) => void;
  setIsProcessing: (val: boolean) => void;
  setAllHandles: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useGroups({
  address,
  chatConfig,
  instance,
  getContract,
  setStatusMessage,
  setIsProcessing,
  setAllHandles,
}: UseGroupsProps) {
  // Group State
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  
  // Modal State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRoomCode, setShowRoomCode] = useState(false);
  
  // Form State
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [newMemberAddress, setNewMemberAddress] = useState("");

  // Load user's groups - optimized with parallel fetching
  const loadGroups = useCallback(async () => {
    if (!address) return;
    try {
      const contract = getContract("read");
      if (!contract) return;
      
      const nextGroupId = await contract.nextGroupId();
      const groupCount = Number(nextGroupId);
      
      if (groupCount === 0) {
        setGroups([]);
        return;
      }
      
      // Parallel check all memberships at once
      const membershipChecks = await Promise.all(
        Array.from({ length: groupCount }, (_, i) => 
          contract.isGroupMember(BigInt(i), address).catch(() => false)
        )
      );
      
      // Get indices where user is a member
      const memberGroupIds = membershipChecks
        .map((isMember, idx) => isMember ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (memberGroupIds.length === 0) {
        setGroups([]);
        return;
      }
      
      // Parallel fetch all group data for member groups
      const groupDataResults = await Promise.all(
        memberGroupIds.map(idx => 
          contract.getGroup(BigInt(idx)).catch(() => null)
        )
      );
      
      // Build groups array
      const loadedGroups: Group[] = [];
      groupDataResults.forEach((group, i) => {
        if (group && group.exists) {
          loadedGroups.push({
            groupId: BigInt(memberGroupIds[i]),
            name: group.name,
            metadataURI: group.metadataURI,
            owner: group.owner,
            createdAt: group.createdAt,
            isClosed: group.isClosed,
            exists: true,
          });
        }
      });
      
      setGroups(loadedGroups);
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  }, [address, getContract]);

  // Save room code to localStorage
  const saveRoomCode = (groupId: string, roomCode: string) => {
    try {
      const stored = localStorage.getItem("fhetalk_room_codes");
      const codes = stored ? JSON.parse(stored) : {};
      codes[groupId] = roomCode;
      localStorage.setItem("fhetalk_room_codes", JSON.stringify(codes));
    } catch (e) {
      console.error("Failed to save room code:", e);
    }
  };

  // Get room code from localStorage
  const getRoomCode = (groupId: string): string | null => {
    try {
      const stored = localStorage.getItem("fhetalk_room_codes");
      if (!stored) return null;
      const codes = JSON.parse(stored);
      return codes[groupId] || null;
    } catch {
      return null;
    }
  };

  // Create new group
  const createGroup = async () => {
    if (!newGroupName.trim()) {
      setStatusMessage("Please enter a group name");
      return;
    }
    setIsProcessing(true);
    setStatusMessage("Creating group...");
    try {
      const contract = getContract("write");
      if (!contract) {
        setStatusMessage("Contract not ready. Please wait and try again.");
        setIsProcessing(false);
        return;
      }
      
      const roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const roomCodeHash = ethers.keccak256(ethers.toUtf8Bytes(roomCode));
      
      const tx = await contract.createGroup(newGroupName.trim(), "", false, roomCodeHash);
      const receipt = await tx.wait();
      
      // Try to extract groupId from logs
      let groupId: string | null = null;
      
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "GroupCreated") {
            groupId = parsed.args?.groupId?.toString() || parsed.args?.[0]?.toString();
            break;
          }
        } catch {
          // Try decoding topics directly for indexed event args
          if (log.topics && log.topics.length > 1) {
            // GroupCreated event: groupId is first indexed param
            const possibleGroupId = BigInt(log.topics[1]).toString();
            if (possibleGroupId) {
              groupId = possibleGroupId;
              break;
            }
          }
        }
      }
      
      // Save invite code (format: groupId-roomCode) to localStorage
      if (groupId) {
        const inviteCode = `${groupId}-${roomCode}`;
        saveRoomCode(groupId, inviteCode);
        console.log("Invite code saved for group:", groupId, inviteCode);
        setStatusMessage(`Group created! Invite code: ${inviteCode}`);
      } else {
        console.warn("Could not extract groupId from receipt");
        setStatusMessage(`Group created! (note: invite code may not be retrievable)`);
      }
      
      setShowCreateGroup(false);
      setNewGroupName("");
      await loadGroups();
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Join group with invite code (format: groupId-roomCode)
  const joinGroup = async () => {
    if (!inviteCode || !inviteCode.includes("-")) {
      setStatusMessage("Please enter a valid invite code (format: groupId-code)");
      return;
    }
    
    const parts = inviteCode.split("-");
    if (parts.length !== 2) {
      setStatusMessage("Invalid invite code format");
      return;
    }
    
    const [groupId, roomCode] = parts;
    
    setIsProcessing(true);
    setStatusMessage("Joining group...");
    try {
      const contract = getContract("write");
      if (!contract) {
        setStatusMessage("Contract not ready. Please wait and try again.");
        setIsProcessing(false);
        return;
      }
      
      const tx = await contract.joinGroupWithCode(BigInt(groupId), roomCode);
      await tx.wait();
      
      setStatusMessage("Joined group!");
      setShowJoinGroup(false);
      setInviteCode("");
      await loadGroups();
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load group members
  const loadGroupMembers = async (groupId: bigint) => {
    try {
      const contract = getContract("read");
      if (!contract) return;
      const members = await contract.getGroupMembers(groupId);
      setGroupMembers(members);
    } catch (error) {
      console.error("Failed to load members:", error);
    }
  };

  // Track current loading group to prevent race conditions
  const currentLoadingGroupRef = useRef<string | null>(null);

  // Load group messages - optimized with parallel fetching
  const loadGroupMessages = useCallback(async (groupId: bigint) => {
    if (!address) return;
    
    const groupIdStr = groupId.toString();
    currentLoadingGroupRef.current = groupIdStr;
    
    try {
      const contract = getContract("read");
      if (!contract) return;
      
      const messageIds = await contract.getGroupMessageIds(groupId);
      
      if (currentLoadingGroupRef.current !== groupIdStr) return;
      if (messageIds.length === 0) {
        setGroupMessages([]);
        return;
      }
      
      // Parallel fetch all headers at once
      const headers = await Promise.all(
        messageIds.map((id: bigint) => contract.getGroupMessageHeader(id))
      );
      
      if (currentLoadingGroupRef.current !== groupIdStr) return;
      
      // Parallel fetch all chunks for all messages
      const allChunkPromises: Promise<{ msgIdx: number; chunkIdx: number; chunk: any }>[] = [];
      
      headers.forEach((header, msgIdx) => {
        for (let i = 0; i < Number(header.chunkCount); i++) {
          allChunkPromises.push(
            contract.getGroupMessageChunk(messageIds[msgIdx], i)
              .then((chunk: any) => ({ msgIdx, chunkIdx: i, chunk }))
          );
        }
      });
      
      const chunkResults = await Promise.all(allChunkPromises);
      
      if (currentLoadingGroupRef.current !== groupIdStr) return;
      
      // Organize chunks by message
      const chunksByMessage: Map<number, string[]> = new Map();
      const allHandles: string[] = [];
      
      for (const { msgIdx, chunkIdx, chunk } of chunkResults) {
        if (!chunksByMessage.has(msgIdx)) {
          chunksByMessage.set(msgIdx, []);
        }
        const handleHex = normalizeHandle(chunk);
        const msgChunks = chunksByMessage.get(msgIdx)!;
        msgChunks[chunkIdx] = handleHex;
        allHandles.push(handleHex);
      }
      
      // Build messages array
      const messages: GroupMessage[] = headers.map((header, idx) => ({
        id: messageIds[idx],
        groupId,
        from: header.from,
        timestamp: new Date(Number(header.timestamp) * 1000),
        content: "[Encrypted]",
        isFromMe: header.from.toLowerCase() === address.toLowerCase(),
        attachmentType: AttachmentType.None,
        chunkHandles: chunksByMessage.get(idx) || [],
      }));
      
      // Sort by timestamp
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      if (currentLoadingGroupRef.current !== groupIdStr) return;
      
      setGroupMessages(messages);
      
      if (allHandles.length > 0) {
        setAllHandles(prev => [...new Set([...prev, ...allHandles])]);
      }
      setStatusMessage(`Loaded ${messages.length} group messages`);
    } catch (error) {
      console.error("Failed to load group messages:", error);
    }
  }, [address, getContract, setAllHandles, setStatusMessage]);

  // Select a group
  const selectGroup = async (group: Group) => {
    // Clear previous messages first to prevent stale data
    setGroupMessages([]);
    setGroupMembers([]);
    setSelectedGroup(group);
    
    // Load new data
    await Promise.all([
      loadGroupMembers(group.groupId),
      loadGroupMessages(group.groupId),
    ]);
  };

  // Add member to group
  const addMemberToGroup = async () => {
    if (!selectedGroup || !newMemberAddress) {
      setStatusMessage("Please enter a wallet address");
      return;
    }
    if (!ethers.isAddress(newMemberAddress)) {
      setStatusMessage("Invalid wallet address");
      return;
    }
    setIsProcessing(true);
    setStatusMessage("Adding member...");
    try {
      const contract = getContract("write");
      if (!contract) {
        setStatusMessage("Contract not ready. Please wait and try again.");
        setIsProcessing(false);
        return;
      }
      
      const tx = await contract.addMembers(selectedGroup.groupId, [newMemberAddress]);
      await tx.wait();
      
      setStatusMessage("Member added!");
      setShowAddMember(false);
      setNewMemberAddress("");
      await loadGroupMembers(selectedGroup.groupId);
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Leave group
  const leaveGroup = async () => {
    if (!selectedGroup) return;
    
    setIsProcessing(true);
    setStatusMessage("Leaving group...");
    try {
      const contract = getContract("write");
      if (!contract) {
        setStatusMessage("Contract not ready. Please wait and try again.");
        setIsProcessing(false);
        return;
      }
      
      const tx = await contract.leaveGroup(selectedGroup.groupId);
      await tx.wait();
      
      setStatusMessage("Left group successfully");
      setSelectedGroup(null);
      setGroupMessages([]);
      setGroupMembers([]);
      await loadGroups();
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Send group message
  const sendGroupMessage = async (messageInput: string, clearInput: () => void) => {
    if (!selectedGroup || !messageInput.trim()) return;
    if (!instance || !address) {
      setStatusMessage("FHEVM not ready");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Encrypting group message...");

    try {
      const chunks = encodeMessageToUint64Chunks(messageInput);
      const contractAddr = ethers.getAddress(chatConfig.address);
      const userAddr = ethers.getAddress(address);
      
      const buffer = instance.createEncryptedInput(contractAddr, userAddr);
      for (const chunk of chunks) {
        buffer.add64(chunk);
      }

      const ciphertexts = await buffer.encrypt();
      const handles = ciphertexts.handles.map((h: Uint8Array) => toBytes32(h));
      const inputProof = toHex(ciphertexts.inputProof);

      const contract = getContract("write");
      if (!contract) {
        setStatusMessage("Contract not ready. Please wait and try again.");
        setIsProcessing(false);
        return;
      }

      const tx = await contract.sendGroupMessage(selectedGroup.groupId, handles, inputProof);
      await tx.wait();

      setStatusMessage("Group message sent!");
      clearInput();
      await loadGroupMessages(selectedGroup.groupId);
    } catch (error) {
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    groups,
    selectedGroup,
    setSelectedGroup,
    groupMessages,
    groupMembers,
    showCreateGroup,
    setShowCreateGroup,
    showJoinGroup,
    setShowJoinGroup,
    showAddMember,
    setShowAddMember,
    showRoomCode,
    setShowRoomCode,
    newGroupName,
    setNewGroupName,
    inviteCode,
    setInviteCode,
    newMemberAddress,
    setNewMemberAddress,
    loadGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    loadGroupMembers,
    loadGroupMessages,
    selectGroup,
    addMemberToGroup,
    sendGroupMessage,
    getRoomCode,
    saveRoomCode,
  };
}
