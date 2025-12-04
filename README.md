# FHETalk

**Private messaging powered by Fully Homomorphic Encryption**

> **Live Demo:** [https://fhetalk.vercel.app](https://fhetalk.vercel.app)

FHETalk is an encrypted chat application that stores messages on the blockchain using Zama's FHEVM. Messages can only be read by the sender and recipient - even validator nodes cannot read the message contents.

## Features

- **End-to-End Encryption** - Messages are encrypted using FHE before being sent
- **On-Chain Storage** - Messages are permanently stored on the blockchain
- **ACL-Based Access** - Only sender and recipient can decrypt messages
- **Chunk-Based Messages** - Messages are split into 8-byte euint64 chunks (max 256 chars)
- **EIP-712 Signing** - Secure user decryption with wallet signatures
- **Contact Management** - Save contacts locally with custom names
- **Real-time Status** - FHEVM connection status indicator

## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | [`0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1`](https://sepolia.etherscan.io/address/0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1) |

## Tech Stack

| Package | Description |
|---------|-------------|
| `packages/nextjs` | Next.js 15 frontend with App Router, wagmi, RainbowKit |
| `packages/fhevm-sdk` | Custom FHEVM SDK with React hooks for encryption/decryption |
| `packages/hardhat` | Solidity contracts with Zama FHEVM integration |

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
│  ChatDemo.tsx   │─────▶│  useFHEVM()     │      │  sendMessage()          │
│                 │      │  useFHEDecrypt()│      │  - encrypt chunks       │
│  wagmi/viem     │      │                 │      │  - store euint64[]      │
│  RainbowKit     │      │  FhevmClient    │      │  - set ACL permissions  │
│                 │      │  - encrypt()    │─────▶│                         │
│  useFHETalk()   │      │  - userDecrypt()│      │  getInbox/Outbox()      │
│                 │      │                 │      │  getMessageChunks()     │
└────────┬────────┘      └────────┬────────┘      └────────────┬────────────┘
         │                        │                            │
         │                        │                            │
         ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Zama FHEVM Network                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────────────────┐  │
│   │  KMS Gateway  │    │ Decryption    │    │   Sepolia Testnet         │  │
│   │               │    │ Relayer       │    │                           │  │
│   │  Public Key   │    │               │    │   FHETalk Contract        │  │
│   │  Generation   │    │  EIP-712 Sign │    │   0x663453...4Bf4f1       │  │
│   └───────────────┘    └───────────────┘    └───────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Message Flow:
─────────────
[User A] ──encrypt──▶ [FHETalk Contract] ◀──decrypt── [User B]
              │              │                   │
              ▼              ▼                   ▼
         FhevmClient    euint64 chunks     EIP-712 + Relayer
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
├── fhevm-sdk/                # Custom FHEVM SDK
│   └── src/
│       ├── client.ts         # FhevmClient core
│       ├── react/src/        # React hooks (useFHEVM, useFHEDecrypt)
│       ├── vue/              # Vue composables
│       └── storage/          # Storage adapters
├── nextjs/                   # Next.js frontend
│   ├── app/_components/      # ChatDemo.tsx main UI
│   ├── components/helper/    # RainbowKit, Balance, etc.
│   ├── contracts/            # Generated ABIs
│   ├── hooks/fhetalk/        # useFHETalk hook
│   └── services/             # Contract service layer
└── hardhat/                  # Smart contracts
    ├── contracts/FHETalk.sol # Main contract
    └── deploy/               # Deployment scripts
```

## How It Works

1. **Connect Wallet** - User connects with MetaMask/RainbowKit
2. **Add Contact** - Save recipient address with a name
3. **Send Message** - Message is encrypted client-side into euint64 chunks
4. **On-Chain Storage** - Encrypted chunks stored on Sepolia with ACL permissions
5. **Decrypt** - Recipient signs EIP-712 request to decrypt via Zama relayer

## License

BSD-3-Clause-Clear License