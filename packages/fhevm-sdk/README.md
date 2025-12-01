# @fhevm/sdk

FHEVM SDK - The complete toolkit for building confidential dApps with fully homomorphic encryption on Ethereum.

## Features

- **End-to-End Encryption** - FHE-based encryption for on-chain privacy
- **React Hooks** - useFHEVM, useEncrypt, useDecrypt
- **EIP-712 Signing** - Secure user decryption with wallet signatures
- **TypeScript First** - Full type safety and IntelliSense support

## Installation

```bash
pnpm install @fhevm/sdk
```

## 🎯 Quick Start

```typescript
import { createFHEVMClient } from '@fhevm/sdk'

// Create client
const client = createFHEVMClient({
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY',
  chainId: 11155111
})

// Initialize
await client.initialize()

// Encrypt
const encrypted = await client.encrypt(42, { publicKey: '0x...' })

// Decrypt
const decrypted = await client.decrypt({
  handle: encrypted,
  contractAddress: '0x...',
  usePublicDecrypt: true
})
```

## 📚 API Reference

### `createFHEVMClient(config, events?)`

Creates a new FHEVM client instance.

**Parameters:**
- `config`: FHEVMConfig - Client configuration
- `events?`: FHEVMEvents - Optional event handlers

**Returns:** FHEVMClient

### `FHEVMClient`

The main client class for FHEVM operations.

#### Methods

- `initialize()`: Promise<void> - Initialize the client
- `encrypt(value, options)`: Promise<string> - Encrypt a value
- `decrypt(options)`: Promise<number> - Decrypt a value
- `getState()`: FHEVMState - Get current client state
- `getInstance()`: FhevmInstance | null - Get the FHEVM instance
- `isReady()`: boolean - Check if client is ready
- `getStatus()`: FHEVMStatus - Get current status
- `getError()`: Error | null - Get current error
- `refresh()`: Promise<void> - Refresh/reinitialize
- `destroy()`: void - Cleanup resources

## 🔧 Configuration

### FHEVMConfig

```typescript
interface FHEVMConfig {
  rpcUrl: string;                    // RPC URL for the network
  chainId: number;                   // Chain ID
  mockChains?: Record<number, string>; // Mock chains for local dev
  storage?: FHEVMStorage;            // Custom storage implementation
  signal?: AbortSignal;              // Abort signal for cancellation
}
```

### Storage Options

```typescript
// Default (IndexedDB)
const client = createFHEVMClient(config)

// In-memory storage
import { createInMemoryStorage } from '@fhevm/sdk'
const client = createFHEVMClient({
  ...config,
  storage: createInMemoryStorage()
})

// localStorage
import { createLocalStorage } from '@fhevm/sdk'
const client = createFHEVMClient({
  ...config,
  storage: createLocalStorage()
})
```

## 🎨 Event Handling

```typescript
const client = createFHEVMClient(config, {
  onStatusChange: (status) => {
    console.log('Status:', status)
  },
  onError: (error) => {
    console.error('Error:', error)
  },
  onReady: (instance) => {
    console.log('Ready!')
  }
})
```

## 🔐 Encryption & Decryption

### Encryption

```typescript
const encrypted = await client.encrypt(42, {
  publicKey: '0x...',
  contractAddress: '0x...', // Optional
  params: { /* additional params */ }
})
```

### Decryption

```typescript
// Public decryption (no signature required)
const decrypted = await client.decrypt({
  handle: encrypted,
  contractAddress: '0x...',
  usePublicDecrypt: true
})

// User decryption (requires signature)
const decrypted = await client.decrypt({
  handle: encrypted,
  contractAddress: '0x...',
  signature: '0x...'
})
```

## 🛠️ Error Handling

```typescript
import { 
  FHEVMError, 
  FHEVMNotInitializedError,
  FHEVMEncryptionError,
  FHEVMDecryptionError 
} from '@fhevm/sdk'

try {
  await client.encrypt(42, { publicKey: '0x...' })
} catch (error) {
  if (error instanceof FHEVMEncryptionError) {
    console.error('Encryption failed:', error.message)
  }
}
```

## Example

See `packages/nextjs/` for a complete FHETalk chat application using this SDK.

## License

BSD-3-Clause-Clear License
