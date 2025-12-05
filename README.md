# FHETalk

**Private messaging powered by Zama Fully Homomorphic Encryption**

> **Live Demo:** [https://fhetalk.vercel.app](https://fhetalk.vercel.app)

FHETalk is an encrypted chat application that stores messages on the blockchain using Zama FHEVM. Supports both direct messaging (DM) and group chat with end-to-end encryption.

## Features

### Direct Messaging (DM)
- **End-to-End Encryption** - Messages encrypted using FHE before being sent
- **On-Chain Storage** - Messages permanently stored on blockchain
- **ACL-Based Access** - Only sender and recipient can decrypt messages
- **Chunk-Based Messages** - Messages split into 8-byte euint64 chunks (max 2000 characters)

### Group Chat
- **Create Groups** - Create private encrypted group chats
- **Room Code Invite** - Join groups via shareable room code
- **Member Management** - Add/remove members, ban/unban users
- **Admin Controls** - Closed groups where only admin can add members
- **Max 64 Members** - Per group limit for ACL gas optimization

### User Profiles
- **Display Name** - Set custom display name stored on-chain
- **Avatar** - Set profile avatar via IPFS CID
- **Profile Lookup** - View other users' profiles

### Contact Management
- **Local Contacts** - Save contacts with custom names
- **Block/Unblock** - Block users to prevent receiving messages
- **Recent Chats** - View recent conversations with last message preview
- **Search** - Filter chats and contacts by name or address

### Other Features
- **EIP-712 Signing** - Secure user decryption with wallet signatures
- **Real-time Status** - FHEVM connection status indicator
- **Mobile Responsive** - Works on desktop and mobile devices
- **Image Attachments** - Support for encrypted image attachments via IPFS (coming soon)

## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | [`0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1`](https://sepolia.etherscan.io/address/0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1) |

## Tech Stack

| Package | Description |
|---------|-------------|
| `packages/nextjs` | Next.js 15 frontend with App Router, wagmi, RainbowKit |
| `packages/fhevm-sdk` | Custom FHEVM SDK with React hooks for encryption/decryption |
| `packages/hardhat` | Solidity contracts with Zama FHEVM v0.9 integration |

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              FHETalk Architecture                          │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────────────┐
│    Frontend     │      │   FHEVM SDK     │      │    Smart Contract       │
│   (Next.js)     │      │                 │      │    (FHETalk.sol)        │
├─────────────────┤      ├─────────────────┤      ├─────────────────────────┤
│                 │      │                 │      │                         │
│  Chat.tsx       │─────▶│  useFHEVM()     │      │  DM Functions:          │
│  - useProfile   │      │  useFHEDecrypt()│      │  - sendMessage()        │
│  - useContacts  │      │                 │      │  - getInbox/Outbox()    │
│  - useMessages  │      │  FhevmClient    │      │                         │
│  - useGroups    │      │  - encrypt()    │─────▶│  Group Functions:       │
│                 │      │  - userDecrypt()│      │  - createGroup()        │
│  wagmi/viem     │      │                 │      │  - joinGroup()          │
│  RainbowKit     │      │                 │      │  - sendGroupMessage()   │
│                 │      │                 │      │                         │
│  Components:    │      │                 │      │  Profile Functions:     │
│  - Header       │      │                 │      │  - setProfile()         │
│  - Sidebar      │      │                 │      │  - getProfile()         │
│  - MessageList  │      │                 │      │                         │
│  - MessageInput │      │                 │      │  Block Functions:       │
│  - Modals       │      │                 │      │  - blockUser()          │
└────────┬────────┘      └────────┬────────┘      └────────────┬────────────┘
         │                        │                            │
         ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Zama FHEVM Network                                │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────────────────┐  │
│   │  KMS Gateway  │    │ Decryption    │    │   Sepolia Testnet         │  │
│   │  Public Key   │    │ Relayer       │    │   FHETalk Contract        │  │
│   │  Generation   │    │ EIP-712 Sign  │    │   0x663453...4Bf4f1       │  │
│   └───────────────┘    └───────────────┘    └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ulmaulana/FHETalk.git
cd FHETalk

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

```bash
# Development
pnpm dev                # Start Next.js dev server
pnpm sdk:build          # Build FHEVM SDK
pnpm sdk:watch          # Watch mode for SDK development

# Contracts
pnpm compile            # Compile Solidity contracts
pnpm deploy:sepolia     # Deploy to Sepolia testnet
pnpm generate           # Generate TypeScript ABIs
pnpm verify:sepolia     # Verify contract on Etherscan
```

## Project Structure

```
packages/
├── fhevm-sdk/                    # Custom FHEVM SDK
│   └── src/
│       ├── client.ts             # FhevmClient core
│       ├── react/src/            # React hooks (useFHEVM, useFHEDecrypt)
│       ├── vue/                  # Vue composables
│       └── storage/              # Storage adapters
│
├── nextjs/                       # Next.js frontend
│   ├── app/
│   │   ├── chat/                 # Main chat module
│   │   │   ├── Chat.tsx          # Main chat component
│   │   │   ├── components/       # UI components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   ├── ChatHeader.tsx
│   │   │   │   └── modals/       # Modal dialogs
│   │   │   ├── hooks/            # Custom hooks
│   │   │   │   ├── useContract.ts
│   │   │   │   ├── useProfile.ts
│   │   │   │   ├── useContacts.ts
│   │   │   │   ├── useMessages.ts
│   │   │   │   └── useGroups.ts
│   │   │   ├── types.ts          # TypeScript types
│   │   │   └── utils.ts          # Utility functions
│   │   └── page.tsx              # Home page
│   ├── components/               # Shared components
│   └── contracts/                # Generated ABIs
│
└── hardhat/                      # Smart contracts
    ├── contracts/FHETalk.sol     # Main contract
    └── deploy/                   # Deployment scripts
```

## How It Works

### Direct Messaging
1. **Connect Wallet** - User connects with MetaMask/RainbowKit
2. **Add Contact** - Save recipient address with a custom name
3. **Send Message** - Message encrypted client-side into euint64 chunks
4. **On-Chain Storage** - Encrypted chunks stored on Sepolia with ACL permissions
5. **Decrypt** - Recipient signs EIP-712 request to decrypt via Zama relayer

### Group Chat
1. **Create Group** - Owner creates group with name and optional room code
2. **Share Room Code** - Share room code for others to join
3. **Join Group** - Users join via room code verification
4. **Send Message** - Message encrypted and stored with group ACL
5. **Decrypt** - All group members can decrypt messages

## Smart Contract Features

| Feature | Description |
|---------|-------------|
| `sendMessage()` | Send encrypted DM to a recipient |
| `sendGroupMessage()` | Send encrypted message to a group |
| `createGroup()` | Create a new group chat |
| `joinGroup()` | Join a group via room code |
| `addGroupMember()` | Add member to a group (admin only for closed groups) |
| `removeGroupMember()` | Remove member from a group |
| `setProfile()` | Set display name and avatar |
| `blockUser()` / `unblockUser()` | Block/unblock a user |
| `setGroupJoinCode()` | Set/update group room code |

## License

BSD-3-Clause-Clear License