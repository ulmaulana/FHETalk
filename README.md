# FHETalk

**Private messaging powered by Fully Homomorphic Encryption**

FHETalk is an encrypted chat application that stores messages on the blockchain using Zama's FHEVM. Messages can only be read by the sender and recipient - even validator nodes cannot read the message contents.

## Features

- **End-to-End Encryption** - Messages are encrypted using FHE before being sent
- **On-Chain Storage** - Messages are permanently stored on the blockchain
- **ACL-Based Access** - Only sender and recipient can decrypt messages
- **Chunk-Based Messages** - Messages are split into 8-byte chunks for efficiency
- **EIP-712 Signing** - Secure user decryption with wallet signatures
- **TypeScript First** - Full type safety and IntelliSense support
- **Next.js Frontend** - Modern React app with wagmi integration

## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | [`0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1`](https://sepolia.etherscan.io/address/0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FHETalk Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   NEXT.JS   │    │  FHEVM SDK  │    │   HARDHAT   │     │
│  │             │    │             │    │             │     │
│  │ • Frontend  │───▶│ • Encryption│───▶│ • Contracts │     │
│  │ • wagmi     │    │ • Decryption│    │ • Deploy    │     │
│  │ • UI        │    │ • React Hooks│    │ • Tests     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                            │                                │
│                     ┌──────▼──────┐                        │
│                     │    ZAMA     │                        │
│                     │             │                        │
│                     │ Relayer SDK │                        │
│                     │ FHEVM Types │                        │
│                     └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
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
pnpm dev              # Start Next.js development server
pnpm build:all        # Build everything

# Contracts
pnpm compile          # Compile contracts
pnpm deploy:sepolia   # Deploy to Sepolia
pnpm generate         # Generate TypeScript ABIs

# Testing
pnpm test             # Run contract tests
```

## Project Structure

```
packages/
├── fhevm-sdk/           # Universal FHEVM SDK
│   ├── src/             # Core functionality
│   ├── react/           # React hooks
│   └── node/            # Node.js utilities
├── nextjs/      # Next.js frontend
│   ├── app/             # App router pages
│   ├── components/      # UI components
│   ├── hooks/fhetalk/   # FHETalk hooks
│   └── contracts/       # Contract ABIs
└── hardhat/             # Smart contracts
    ├── contracts/       # FHETalk.sol
    └── deploy/          # Deployment scripts
```


## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | [`0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1`](https://sepolia.etherscan.io/address/0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1) |

## License

BSD-3-Clause-Clear License