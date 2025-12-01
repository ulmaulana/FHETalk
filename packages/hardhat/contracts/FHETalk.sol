// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHETalk - FHE-powered private messaging
/// @author FHETalk
/// @notice A fully homomorphic encrypted chat contract for private 1-to-1 messaging
/// @dev Uses FHEVM to store encrypted message chunks. Each message is split into 8-byte chunks
///      encoded as euint64. Sender and receiver are granted decrypt permissions via ACL.
contract FHETalk is ZamaEthereumConfig {
    using FHE for *;

    /// @notice Message header containing metadata (not encrypted)
    struct MessageHeader {
        address from;
        address to;
        uint64 timestamp;
        uint16 chunkCount; // Number of euint64 chunks for this message
    }

    /// @notice Auto-incrementing message ID counter
    uint256 public nextMessageId;

    /// @notice Mapping from messageId to message header
    mapping(uint256 => MessageHeader) public messageHeaders;

    /// @notice Mapping from messageId => chunkIndex => encrypted chunk
    mapping(uint256 => mapping(uint16 => euint64)) private messageChunks;

    /// @notice Inbox: messages received by an address
    mapping(address => uint256[]) private inboxIds;

    /// @notice Outbox: messages sent by an address
    mapping(address => uint256[]) private outboxIds;

    /// @notice Emitted when a message is sent
    /// @param messageId Unique ID of the message
    /// @param from Sender address
    /// @param to Recipient address
    /// @param timestamp Block timestamp when message was sent
    /// @param chunkCount Number of encrypted chunks in the message
    event MessageSent(
        uint256 indexed messageId,
        address indexed from,
        address indexed to,
        uint64 timestamp,
        uint16 chunkCount
    );

    /// @notice Maximum chunks per message (32 chunks * 8 bytes = 256 characters)
    uint16 public constant MAX_CHUNKS = 32;

    /// @notice Send an encrypted message to a recipient
    /// @param to Recipient address
    /// @param encChunks Array of encrypted 64-bit chunks (externalEuint64)
    /// @param inputProof Proof from the Relayer SDK for all encrypted chunks
    /// @dev The message is stored on-chain with ACL permissions for both sender and recipient.
    ///      Recipients can decrypt messages even if they've never interacted with the contract before.
    function sendMessage(
        address to,
        externalEuint64[] calldata encChunks,
        bytes calldata inputProof
    ) external {
        require(to != address(0), "Invalid recipient");
        require(to != msg.sender, "Cannot send to yourself");
        require(encChunks.length > 0, "Empty message");
        require(encChunks.length <= MAX_CHUNKS, "Message too long");

        uint256 messageId = nextMessageId;
        nextMessageId = messageId + 1;

        uint16 chunkCount = uint16(encChunks.length);

        messageHeaders[messageId] = MessageHeader({
            from: msg.sender,
            to: to,
            timestamp: uint64(block.timestamp),
            chunkCount: chunkCount
        });

        for (uint16 i = 0; i < chunkCount; i++) {
            // Import encrypted input from frontend
            euint64 chunk = FHE.fromExternal(encChunks[i], inputProof);

            // === ACL: Grant decrypt permissions ===
            // 1) Contract can access (required for userDecrypt mechanism)
            FHE.allowThis(chunk);
            // 2) Sender can decrypt (to view sent messages)
            FHE.allow(chunk, msg.sender);
            // 3) Recipient can decrypt (even if they've never interacted before)
            FHE.allow(chunk, to);

            messageChunks[messageId][i] = chunk;
        }

        inboxIds[to].push(messageId);
        outboxIds[msg.sender].push(messageId);

        emit MessageSent(
            messageId,
            msg.sender,
            to,
            uint64(block.timestamp),
            chunkCount
        );
    }

    /// @notice Get all message IDs in a user's inbox
    /// @param user Address to query
    /// @return Array of message IDs received by the user
    function getInboxIds(address user) external view returns (uint256[] memory) {
        return inboxIds[user];
    }

    /// @notice Get all message IDs in a user's outbox
    /// @param user Address to query
    /// @return Array of message IDs sent by the user
    function getOutboxIds(address user) external view returns (uint256[] memory) {
        return outboxIds[user];
    }

    /// @notice Get the header of a specific message
    /// @param messageId ID of the message
    /// @return MessageHeader struct with from, to, timestamp, and chunkCount
    function getMessageHeader(uint256 messageId)
        external
        view
        returns (MessageHeader memory)
    {
        return messageHeaders[messageId];
    }

    /// @notice Get a single encrypted chunk from a message
    /// @param messageId ID of the message
    /// @param index Index of the chunk (0 to chunkCount-1)
    /// @return The encrypted chunk (euint64 handle)
    /// @dev UI should loop through 0..chunkCount-1 to get all chunks
    function getMessageChunk(uint256 messageId, uint16 index)
        external
        view
        returns (euint64)
    {
        MessageHeader memory header = messageHeaders[messageId];
        require(header.to != address(0), "Message does not exist");
        require(index < header.chunkCount, "Invalid chunk index");

        return messageChunks[messageId][index];
    }

    /// @notice Get the count of messages in a user's inbox
    /// @param user Address to query
    /// @return Number of messages in inbox
    function getInboxCount(address user) external view returns (uint256) {
        return inboxIds[user].length;
    }

    /// @notice Get the count of messages in a user's outbox
    /// @param user Address to query
    /// @return Number of messages in outbox
    function getOutboxCount(address user) external view returns (uint256) {
        return outboxIds[user].length;
    }

    /// @notice Get paginated inbox IDs
    /// @param user Address to query
    /// @param offset Starting index
    /// @param limit Maximum number of IDs to return
    /// @return Array of message IDs
    function getInboxIdsPaginated(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] storage ids = inboxIds[user];
        uint256 length = ids.length;
        
        if (offset >= length) {
            return new uint256[](0);
        }
        
        uint256 end = offset + limit;
        if (end > length) {
            end = length;
        }
        
        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = ids[i];
        }
        
        return result;
    }

    /// @notice Get paginated outbox IDs
    /// @param user Address to query
    /// @param offset Starting index
    /// @param limit Maximum number of IDs to return
    /// @return Array of message IDs
    function getOutboxIdsPaginated(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] storage ids = outboxIds[user];
        uint256 length = ids.length;
        
        if (offset >= length) {
            return new uint256[](0);
        }
        
        uint256 end = offset + limit;
        if (end > length) {
            end = length;
        }
        
        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = ids[i];
        }
        
        return result;
    }

    /// @notice Get conversation IDs between two users
    /// @param user1 First user address
    /// @param user2 Second user address
    /// @return Array of message IDs exchanged between the two users
    function getConversation(
        address user1,
        address user2
    ) external view returns (uint256[] memory) {
        // Get all messages from inbox and outbox
        uint256[] storage inbox = inboxIds[user1];
        uint256[] storage outbox = outboxIds[user1];
        
        // First pass: count matching messages
        uint256 count = 0;
        for (uint256 i = 0; i < inbox.length; i++) {
            if (messageHeaders[inbox[i]].from == user2) {
                count++;
            }
        }
        for (uint256 i = 0; i < outbox.length; i++) {
            if (messageHeaders[outbox[i]].to == user2) {
                count++;
            }
        }
        
        // Second pass: collect matching message IDs
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < inbox.length; i++) {
            if (messageHeaders[inbox[i]].from == user2) {
                result[idx++] = inbox[i];
            }
        }
        for (uint256 i = 0; i < outbox.length; i++) {
            if (messageHeaders[outbox[i]].to == user2) {
                result[idx++] = outbox[i];
            }
        }
        
        return result;
    }
}
