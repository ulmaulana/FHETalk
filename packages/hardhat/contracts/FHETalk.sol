// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint128, externalEuint64, externalEuint128} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHETalk - FHE-powered private messaging with groups & media
/// @author FHETalk
/// @notice A fully homomorphic encrypted chat contract for private 1-to-1 and group messaging
/// @dev Uses FHEVM v0.9 to store encrypted message chunks. Each message is split into 8-byte chunks
///      encoded as euint64. Supports blocklist, profiles, group chat, and image attachments via IPFS.
contract FHETalk is ZamaEthereumConfig {
    using FHE for *;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Maximum chunks per message (256 chunks * 8 bytes = 2048 bytes ≈ 2000 characters)
    uint16 public constant MAX_CHUNKS = 256;

    /// @notice Maximum members per group (for ACL gas limits)
    uint16 public constant MAX_GROUP_MEMBERS = 64;

    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Attachment type for messages
    enum AttachmentType { None, Image }

    /// @notice Attachment metadata
    struct Attachment {
        AttachmentType attachmentType;
        string ipfsCid; // IPFS CID of encrypted file
    }

    /// @notice Message header containing metadata (not encrypted)
    struct MessageHeader {
        address from;
        address to;
        uint64 timestamp;
        uint16 chunkCount;
        AttachmentType attachmentType;
    }

    /// @notice User profile with display name and avatar
    struct UserProfile {
        string displayName;
        string avatarCid; // IPFS CID for avatar image
        uint64 updatedAt;
        bool exists;
    }

    /// @notice Group metadata
    struct Group {
        uint256 groupId;
        string name;
        string metadataURI; // IPFS JSON (description, icon, etc.)
        address owner;
        uint64 createdAt;
        bool isClosed; // true: only admin can add members
        bool exists;
    }

    /// @notice Group message header
    struct GroupMessageHeader {
        uint256 groupId;
        address from;
        uint64 timestamp;
        uint16 chunkCount;
        AttachmentType attachmentType;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DM STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Auto-incrementing message ID counter
    uint256 public nextMessageId;

    /// @notice Mapping from messageId to message header
    mapping(uint256 => MessageHeader) public messageHeaders;

    /// @notice Mapping from messageId => chunkIndex => encrypted chunk
    mapping(uint256 => mapping(uint16 => euint64)) private messageChunks;

    /// @notice Mapping from messageId => attachment metadata
    mapping(uint256 => Attachment) public messageAttachments;

    /// @notice Mapping from messageId => encrypted AES key for image
    mapping(uint256 => euint128) private messageMediaKeys;

    /// @notice Inbox: messages received by an address
    mapping(address => uint256[]) private inboxIds;

    /// @notice Outbox: messages sent by an address
    mapping(address => uint256[]) private outboxIds;

    // ═══════════════════════════════════════════════════════════════════════════
    // BLOCKLIST STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice isBlocked[A][B] = true if A has blocked B
    mapping(address => mapping(address => bool)) public isBlocked;

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice User profiles
    mapping(address => UserProfile) private profiles;

    // ═══════════════════════════════════════════════════════════════════════════
    // GROUP STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Auto-incrementing group ID counter
    uint256 public nextGroupId;

    /// @notice Group metadata
    mapping(uint256 => Group) public groups;

    /// @notice Group members array
    mapping(uint256 => address[]) private groupMembers;

    /// @notice Check if address is member of group
    mapping(uint256 => mapping(address => bool)) public isGroupMember;

    /// @notice Check if address is admin of group
    mapping(uint256 => mapping(address => bool)) public isGroupAdmin;

    /// @notice Check if address is banned from group
    mapping(uint256 => mapping(address => bool)) public isGroupBanned;

    /// @notice Group join code hash (keccak256 of room code)
    mapping(uint256 => bytes32) public groupJoinCodeHash;

    // ═══════════════════════════════════════════════════════════════════════════
    // GROUP MESSAGE STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Auto-incrementing group message ID counter
    uint256 public nextGroupMessageId;

    /// @notice Group message headers
    mapping(uint256 => GroupMessageHeader) public groupMessageHeaders;

    /// @notice Group message chunks
    mapping(uint256 => mapping(uint16 => euint64)) private groupMessageChunks;

    /// @notice Group message attachments
    mapping(uint256 => Attachment) public groupMessageAttachments;

    /// @notice Group message media keys
    mapping(uint256 => euint128) private groupMessageMediaKeys;

    /// @notice Group to message IDs mapping
    mapping(uint256 => uint256[]) private groupMessageIds;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event MessageSent(
        uint256 indexed messageId,
        address indexed from,
        address indexed to,
        uint64 timestamp,
        uint16 chunkCount,
        AttachmentType attachmentType,
        string attachmentCid
    );

    event UserBlockStatusChanged(
        address indexed user,
        address indexed target,
        bool blocked
    );

    event ProfileUpdated(
        address indexed user,
        string displayName,
        string avatarCid,
        uint64 timestamp
    );

    event GroupCreated(
        uint256 indexed groupId,
        address indexed owner,
        string name,
        bool isClosed
    );

    event GroupJoinCodeUpdated(
        uint256 indexed groupId,
        bytes32 joinCodeHash
    );

    event GroupMemberAdded(
        uint256 indexed groupId,
        address indexed member,
        address indexed addedBy
    );

    event GroupMemberRemoved(
        uint256 indexed groupId,
        address indexed member,
        address indexed removedBy
    );

    event GroupMemberLeft(
        uint256 indexed groupId,
        address indexed member
    );

    event GroupMemberBanned(
        uint256 indexed groupId,
        address indexed member,
        bool banned
    );

    event GroupAdminUpdated(
        uint256 indexed groupId,
        address indexed admin,
        bool isAdmin
    );

    event GroupMessageSent(
        uint256 indexed messageId,
        uint256 indexed groupId,
        address indexed from,
        uint64 timestamp,
        uint16 chunkCount,
        AttachmentType attachmentType,
        string attachmentCid
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // DM FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Send an encrypted text message to a recipient
    function sendMessage(
        address to,
        externalEuint64[] calldata encChunks,
        bytes calldata inputProof
    ) external {
        require(to != address(0), "Invalid recipient");
        require(to != msg.sender, "Cannot send to yourself");
        require(encChunks.length > 0, "Empty message");
        require(encChunks.length <= MAX_CHUNKS, "Message too long");
        require(!isBlocked[to][msg.sender], "You are blocked by recipient");
        require(!isBlocked[msg.sender][to], "You blocked this recipient");

        uint256 messageId = nextMessageId++;
        uint16 chunkCount = uint16(encChunks.length);

        messageHeaders[messageId] = MessageHeader({
            from: msg.sender,
            to: to,
            timestamp: uint64(block.timestamp),
            chunkCount: chunkCount,
            attachmentType: AttachmentType.None
        });

        for (uint16 i = 0; i < chunkCount; i++) {
            euint64 chunk = FHE.fromExternal(encChunks[i], inputProof);
            FHE.allowThis(chunk);
            FHE.allow(chunk, msg.sender);
            FHE.allow(chunk, to);
            messageChunks[messageId][i] = chunk;
        }

        inboxIds[to].push(messageId);
        outboxIds[msg.sender].push(messageId);

        emit MessageSent(messageId, msg.sender, to, uint64(block.timestamp), chunkCount, AttachmentType.None, "");
    }

    /// @notice Send an encrypted message with image attachment
    function sendMessageWithImage(
        address to,
        externalEuint64[] calldata encChunks,
        externalEuint128 encMediaKey,
        string calldata encryptedImageCid,
        bytes calldata inputProof
    ) external {
        require(to != address(0), "Invalid recipient");
        require(to != msg.sender, "Cannot send to yourself");
        require(encChunks.length > 0, "Empty message");
        require(encChunks.length <= MAX_CHUNKS, "Message too long");
        require(bytes(encryptedImageCid).length > 0, "Image CID required");
        require(!isBlocked[to][msg.sender], "You are blocked by recipient");
        require(!isBlocked[msg.sender][to], "You blocked this recipient");

        uint256 messageId = nextMessageId++;
        uint16 chunkCount = uint16(encChunks.length);

        messageHeaders[messageId] = MessageHeader({
            from: msg.sender,
            to: to,
            timestamp: uint64(block.timestamp),
            chunkCount: chunkCount,
            attachmentType: AttachmentType.Image
        });

        for (uint16 i = 0; i < chunkCount; i++) {
            euint64 chunk = FHE.fromExternal(encChunks[i], inputProof);
            FHE.allowThis(chunk);
            FHE.allow(chunk, msg.sender);
            FHE.allow(chunk, to);
            messageChunks[messageId][i] = chunk;
        }

        // Store encrypted AES key for image
        euint128 mediaKey = FHE.fromExternal(encMediaKey, inputProof);
        FHE.allowThis(mediaKey);
        FHE.allow(mediaKey, msg.sender);
        FHE.allow(mediaKey, to);
        messageMediaKeys[messageId] = mediaKey;

        messageAttachments[messageId] = Attachment({
            attachmentType: AttachmentType.Image,
            ipfsCid: encryptedImageCid
        });

        inboxIds[to].push(messageId);
        outboxIds[msg.sender].push(messageId);

        emit MessageSent(messageId, msg.sender, to, uint64(block.timestamp), chunkCount, AttachmentType.Image, encryptedImageCid);
    }

    /// @notice Get encrypted AES key for message image
    function getMessageMediaKey(uint256 messageId) external view returns (euint128) {
        return messageMediaKeys[messageId];
    }

    /// @notice Get attachment metadata for a message
    function getMessageAttachment(uint256 messageId) external view returns (Attachment memory) {
        return messageAttachments[messageId];
    }

    function getInboxIds(address user) external view returns (uint256[] memory) {
        return inboxIds[user];
    }

    function getOutboxIds(address user) external view returns (uint256[] memory) {
        return outboxIds[user];
    }

    function getMessageHeader(uint256 messageId) external view returns (MessageHeader memory) {
        return messageHeaders[messageId];
    }

    function getMessageChunk(uint256 messageId, uint16 index) external view returns (euint64) {
        MessageHeader memory header = messageHeaders[messageId];
        require(header.to != address(0), "Message does not exist");
        require(index < header.chunkCount, "Invalid chunk index");
        return messageChunks[messageId][index];
    }

    function getInboxCount(address user) external view returns (uint256) {
        return inboxIds[user].length;
    }

    function getOutboxCount(address user) external view returns (uint256) {
        return outboxIds[user].length;
    }

    function getInboxIdsPaginated(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        uint256[] storage ids = inboxIds[user];
        uint256 length = ids.length;
        if (offset >= length) return new uint256[](0);
        uint256 end = offset + limit > length ? length : offset + limit;
        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = ids[i];
        }
        return result;
    }

    function getOutboxIdsPaginated(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        uint256[] storage ids = outboxIds[user];
        uint256 length = ids.length;
        if (offset >= length) return new uint256[](0);
        uint256 end = offset + limit > length ? length : offset + limit;
        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = ids[i];
        }
        return result;
    }

    function getConversation(address user1, address user2) external view returns (uint256[] memory) {
        uint256[] storage inbox = inboxIds[user1];
        uint256[] storage outbox = outboxIds[user1];
        uint256 count = 0;
        for (uint256 i = 0; i < inbox.length; i++) {
            if (messageHeaders[inbox[i]].from == user2) count++;
        }
        for (uint256 i = 0; i < outbox.length; i++) {
            if (messageHeaders[outbox[i]].to == user2) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < inbox.length; i++) {
            if (messageHeaders[inbox[i]].from == user2) result[idx++] = inbox[i];
        }
        for (uint256 i = 0; i < outbox.length; i++) {
            if (messageHeaders[outbox[i]].to == user2) result[idx++] = outbox[i];
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BLOCKLIST FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Block or unblock a user
    function setBlockStatus(address target, bool blocked) external {
        require(target != address(0), "Invalid target");
        require(target != msg.sender, "Cannot block yourself");
        isBlocked[msg.sender][target] = blocked;
        emit UserBlockStatusChanged(msg.sender, target, blocked);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Set user profile (display name and avatar)
    function setProfile(string calldata displayName, string calldata avatarCid) external {
        profiles[msg.sender] = UserProfile({
            displayName: displayName,
            avatarCid: avatarCid,
            updatedAt: uint64(block.timestamp),
            exists: true
        });
        emit ProfileUpdated(msg.sender, displayName, avatarCid, uint64(block.timestamp));
    }

    /// @notice Get user profile
    function getProfile(address user) external view returns (UserProfile memory) {
        return profiles[user];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GROUP MANAGEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Create a new group
    function createGroup(
        string calldata name,
        string calldata metadataURI,
        bool isClosed,
        bytes32 joinCodeHash
    ) external returns (uint256 groupId) {
        groupId = nextGroupId++;
        
        groups[groupId] = Group({
            groupId: groupId,
            name: name,
            metadataURI: metadataURI,
            owner: msg.sender,
            createdAt: uint64(block.timestamp),
            isClosed: isClosed,
            exists: true
        });

        groupMembers[groupId].push(msg.sender);
        isGroupMember[groupId][msg.sender] = true;
        isGroupAdmin[groupId][msg.sender] = true;

        if (joinCodeHash != bytes32(0)) {
            groupJoinCodeHash[groupId] = joinCodeHash;
        }

        emit GroupCreated(groupId, msg.sender, name, isClosed);
        emit GroupMemberAdded(groupId, msg.sender, msg.sender);
        emit GroupAdminUpdated(groupId, msg.sender, true);
    }

    /// @notice Update group join code
    function updateGroupJoinCode(uint256 groupId, bytes32 newJoinCodeHash) external {
        require(groups[groupId].exists, "Group not found");
        require(msg.sender == groups[groupId].owner || isGroupAdmin[groupId][msg.sender], "Not admin");
        groupJoinCodeHash[groupId] = newJoinCodeHash;
        emit GroupJoinCodeUpdated(groupId, newJoinCodeHash);
    }

    /// @notice Add members to group (admin only)
    function addMembers(uint256 groupId, address[] calldata members) external {
        require(groups[groupId].exists, "Group not found");
        require(msg.sender == groups[groupId].owner || isGroupAdmin[groupId][msg.sender], "Not admin");

        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            if (!isGroupMember[groupId][member] && !isGroupBanned[groupId][member]) {
                require(groupMembers[groupId].length < MAX_GROUP_MEMBERS, "Group full");
                groupMembers[groupId].push(member);
                isGroupMember[groupId][member] = true;
                emit GroupMemberAdded(groupId, member, msg.sender);
            }
        }
    }

    /// @notice Kick a member from group
    function kickMember(uint256 groupId, address member) external {
        require(groups[groupId].exists, "Group not found");
        require(msg.sender == groups[groupId].owner || isGroupAdmin[groupId][msg.sender], "Not admin");
        require(member != groups[groupId].owner, "Cannot kick owner");
        require(isGroupMember[groupId][member], "Not a member");

        isGroupMember[groupId][member] = false;
        isGroupAdmin[groupId][member] = false;
        _removeFromArray(groupMembers[groupId], member);
        emit GroupMemberRemoved(groupId, member, msg.sender);
    }

    /// @notice Leave a group
    function leaveGroup(uint256 groupId) external {
        require(groups[groupId].exists, "Group not found");
        require(isGroupMember[groupId][msg.sender], "Not a member");
        require(msg.sender != groups[groupId].owner || groupMembers[groupId].length == 1, "Owner cannot leave with members");

        isGroupMember[groupId][msg.sender] = false;
        isGroupAdmin[groupId][msg.sender] = false;
        _removeFromArray(groupMembers[groupId], msg.sender);
        emit GroupMemberLeft(groupId, msg.sender);
    }

    /// @notice Set admin status for a member
    function setGroupAdmin(uint256 groupId, address member, bool isAdmin_) external {
        require(groups[groupId].exists, "Group not found");
        require(msg.sender == groups[groupId].owner, "Only owner");
        require(isGroupMember[groupId][member], "Not a member");
        isGroupAdmin[groupId][member] = isAdmin_;
        emit GroupAdminUpdated(groupId, member, isAdmin_);
    }

    /// @notice Ban or unban a member
    function banMember(uint256 groupId, address member, bool banned) external {
        require(groups[groupId].exists, "Group not found");
        require(msg.sender == groups[groupId].owner || isGroupAdmin[groupId][msg.sender], "Not admin");
        require(member != groups[groupId].owner, "Cannot ban owner");

        isGroupBanned[groupId][member] = banned;
        if (banned && isGroupMember[groupId][member]) {
            isGroupMember[groupId][member] = false;
            isGroupAdmin[groupId][member] = false;
            _removeFromArray(groupMembers[groupId], member);
        }
        emit GroupMemberBanned(groupId, member, banned);
    }

    /// @notice Join group with room code
    function joinGroupWithCode(uint256 groupId, string calldata roomCode) external {
        require(groups[groupId].exists, "Group not found");
        require(!groups[groupId].isClosed, "Group is closed");
        require(!isGroupMember[groupId][msg.sender], "Already a member");
        require(!isGroupBanned[groupId][msg.sender], "You are banned");
        require(groupMembers[groupId].length < MAX_GROUP_MEMBERS, "Group full");
        
        bytes32 h = keccak256(abi.encodePacked(roomCode));
        require(h == groupJoinCodeHash[groupId], "Invalid code");

        groupMembers[groupId].push(msg.sender);
        isGroupMember[groupId][msg.sender] = true;
        emit GroupMemberAdded(groupId, msg.sender, msg.sender);
    }

    /// @notice Get group members
    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        return groupMembers[groupId];
    }

    /// @notice Get group info
    function getGroup(uint256 groupId) external view returns (Group memory) {
        return groups[groupId];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GROUP MESSAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Send encrypted message to group
    function sendGroupMessage(
        uint256 groupId,
        externalEuint64[] calldata encChunks,
        bytes calldata inputProof
    ) external {
        require(groups[groupId].exists, "Group not found");
        require(isGroupMember[groupId][msg.sender], "Not a member");
        require(encChunks.length > 0, "Empty message");
        require(encChunks.length <= MAX_CHUNKS, "Message too long");

        address[] storage members = groupMembers[groupId];
        uint256 memberCount = members.length;
        require(memberCount <= MAX_GROUP_MEMBERS, "Group too large");

        uint256 gmId = nextGroupMessageId++;
        uint16 chunkCount = uint16(encChunks.length);

        groupMessageHeaders[gmId] = GroupMessageHeader({
            groupId: groupId,
            from: msg.sender,
            timestamp: uint64(block.timestamp),
            chunkCount: chunkCount,
            attachmentType: AttachmentType.None
        });

        for (uint16 i = 0; i < chunkCount; i++) {
            euint64 chunk = FHE.fromExternal(encChunks[i], inputProof);
            FHE.allowThis(chunk);
            for (uint256 j = 0; j < memberCount; j++) {
                FHE.allow(chunk, members[j]);
            }
            groupMessageChunks[gmId][i] = chunk;
        }

        groupMessageIds[groupId].push(gmId);
        emit GroupMessageSent(gmId, groupId, msg.sender, uint64(block.timestamp), chunkCount, AttachmentType.None, "");
    }

    /// @notice Send encrypted message with image to group
    function sendGroupMessageWithImage(
        uint256 groupId,
        externalEuint64[] calldata encChunks,
        externalEuint128 encMediaKey,
        string calldata encryptedImageCid,
        bytes calldata inputProof
    ) external {
        require(groups[groupId].exists, "Group not found");
        require(isGroupMember[groupId][msg.sender], "Not a member");
        require(encChunks.length > 0, "Empty message");
        require(encChunks.length <= MAX_CHUNKS, "Message too long");
        require(bytes(encryptedImageCid).length > 0, "Image CID required");

        address[] storage members = groupMembers[groupId];
        uint256 memberCount = members.length;
        require(memberCount <= MAX_GROUP_MEMBERS, "Group too large");

        uint256 gmId = nextGroupMessageId++;
        uint16 chunkCount = uint16(encChunks.length);

        groupMessageHeaders[gmId] = GroupMessageHeader({
            groupId: groupId,
            from: msg.sender,
            timestamp: uint64(block.timestamp),
            chunkCount: chunkCount,
            attachmentType: AttachmentType.Image
        });

        for (uint16 i = 0; i < chunkCount; i++) {
            euint64 chunk = FHE.fromExternal(encChunks[i], inputProof);
            FHE.allowThis(chunk);
            for (uint256 j = 0; j < memberCount; j++) {
                FHE.allow(chunk, members[j]);
            }
            groupMessageChunks[gmId][i] = chunk;
        }

        // Store encrypted AES key
        euint128 mediaKey = FHE.fromExternal(encMediaKey, inputProof);
        FHE.allowThis(mediaKey);
        for (uint256 j = 0; j < memberCount; j++) {
            FHE.allow(mediaKey, members[j]);
        }
        groupMessageMediaKeys[gmId] = mediaKey;

        groupMessageAttachments[gmId] = Attachment({
            attachmentType: AttachmentType.Image,
            ipfsCid: encryptedImageCid
        });

        groupMessageIds[groupId].push(gmId);
        emit GroupMessageSent(gmId, groupId, msg.sender, uint64(block.timestamp), chunkCount, AttachmentType.Image, encryptedImageCid);
    }

    function getGroupMessageIds(uint256 groupId) external view returns (uint256[] memory) {
        return groupMessageIds[groupId];
    }

    function getGroupMessageHeader(uint256 messageId) external view returns (GroupMessageHeader memory) {
        return groupMessageHeaders[messageId];
    }

    function getGroupMessageChunk(uint256 messageId, uint16 index) external view returns (euint64) {
        GroupMessageHeader memory header = groupMessageHeaders[messageId];
        require(header.groupId != 0 || header.from != address(0), "Message does not exist");
        require(index < header.chunkCount, "Invalid chunk index");
        return groupMessageChunks[messageId][index];
    }

    function getGroupMessageAttachment(uint256 messageId) external view returns (Attachment memory) {
        return groupMessageAttachments[messageId];
    }

    function getGroupMessageMediaKey(uint256 messageId) external view returns (euint128) {
        return groupMessageMediaKeys[messageId];
    }

    function getGroupMessageCount(uint256 groupId) external view returns (uint256) {
        return groupMessageIds[groupId].length;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    function _removeFromArray(address[] storage arr, address addr) internal {
        uint256 length = arr.length;
        for (uint256 i = 0; i < length; i++) {
            if (arr[i] == addr) {
                arr[i] = arr[length - 1];
                arr.pop();
                break;
            }
        }
    }
}
