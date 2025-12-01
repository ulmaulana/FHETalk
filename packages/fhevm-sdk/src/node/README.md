# @fhevm/sdk/node

Node.js utilities untuk FHEVM SDK

## Overview

Package `@fhevm/sdk/node` menyediakan Node.js-specific utilities untuk bekerja dengan FHEVM (Fully Homomorphic Encryption Virtual Machine). Termasuk programmatic APIs dan CLI tools untuk encryption dan decryption operations.

## Features

- **FHEVM Client for Node.js** - Easy-to-use client dengan Node.js defaults
- **Batch Operations** - Efficient batch encryption dan decryption
- **CLI Tool** - Command-line interface untuk FHEVM operations

## Installation

```bash
pnpm add @fhevm/sdk
```

## Quick Start

### Programmatic Usage

```typescript
import { 
  createFHEVMClientForNode, 
  encryptValue,
  decryptValue,
  type FHEVMConfig 
} from "@fhevm/sdk/node";

// Configure FHEVM client
const config: FHEVMConfig = {
  rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
  chainId: 11155111, // Sepolia
  mockChains: {
    31337: "http://localhost:8545" // Local development
  }
};

// Create client
const client = createFHEVMClientForNode(config);
await client.initialize();

// Encrypt a value
const encrypted = await encryptValue(42, publicKey, config);

// Decrypt a value
const decrypted = await decryptValue(
  encrypted,
  contractAddress,
  config,
  { usePublicDecrypt: true }
);
```

### CLI Usage

```bash
# Encrypt a vote
pnpm fhevm-cli:encrypt --value 1 --public-key 0x... --contract 0x...

# Decrypt voting results
pnpm fhevm-cli:decrypt --handle 0x... --contract 0x... --public

# Check FHEVM status
pnpm fhevm-cli:status

# Interactive wizard
pnpm fhevm:wizard
```

## API Reference

### Core Functions

#### `createFHEVMClientForNode(config, events?)`

Creates a FHEVM client optimized for Node.js environments.

**Parameters:**
- `config: FHEVMConfig` - FHEVM configuration
- `events?: FHEVMEvents` - Optional event handlers

**Returns:** `FHEVMClient` - Configured FHEVM client

#### `encryptValue(value, publicKey, config)`

Encrypt a numeric value using FHEVM.

**Parameters:**
- `value: number` - Value to encrypt
- `publicKey: string` - Public key for encryption
- `config: FHEVMConfig` - FHEVM configuration

**Returns:** `Promise<string>` - Encrypted handle

#### `decryptValue(handle, contractAddress, config, options?)`

Decrypt a handle using FHEVM.

**Parameters:**
- `handle: string` - Encrypted handle to decrypt
- `contractAddress: string` - Contract address
- `config: FHEVMConfig` - FHEVM configuration
- `options?: DecryptionOptions` - Optional decryption options

**Returns:** `Promise<number>` - Decrypted value

### Batch Functions

#### `batchEncrypt(values, publicKey, config)`

Encrypt multiple values efficiently.

#### `batchDecrypt(handles, contractAddress, config, options?)`

Decrypt multiple handles efficiently.

## CLI Commands

### **Universal CLI Commands**

```bash
# Initialize FHEVM client
pnpm fhevm-cli:init

# Encrypt a value
pnpm fhevm-cli:encrypt --value <number> --public-key <string> [--contract <address>]

# Decrypt a handle
pnpm fhevm-cli:decrypt --handle <string> --contract <address> [--signature <string>] [--public]

# Batch operations
pnpm fhevm-cli:batch-encrypt --values "1,2,3" --public-key <string>
pnpm fhevm-cli:batch-decrypt --handles "0x...,0x...,0x..." --contract <address>

# User decryption (requires signature)
pnpm fhevm-cli:user-decrypt --handle <string> --contract <address> --signature <string>

# Public decryption (no signature required)
pnpm fhevm-cli:public-decrypt --handle <string> --contract <address>

# Check status
pnpm fhevm-cli:status

# Test operations
pnpm fhevm-cli:test

# Show info
pnpm fhevm-cli:info
```

## Configuration

### Environment Variables

- `FHEVM_RPC_URL` - RPC URL for the blockchain network
- `FHEVM_CHAIN_ID` - Chain ID for the network

### FHEVMConfig

```typescript
interface FHEVMConfig {
  rpcUrl: string;
  chainId: number;
  mockChains?: Record<number, string>;
}
```

## Examples

See the examples directory for complete working examples:

- **Next.js Example**: `packages/nextjs-example/` - FHETalk frontend app

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode for development
pnpm watch
```

## License

BSD-3-Clause-Clear
