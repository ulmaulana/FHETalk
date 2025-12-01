# FHETalk Smart Contracts

Smart contracts untuk **FHETalk** - aplikasi chat terenkripsi menggunakan Fully Homomorphic Encryption (FHE) dengan FHEVM protocol dari Zama.

## Tentang FHETalk

FHETalk adalah aplikasi private messaging yang menyimpan pesan terenkripsi di blockchain. Menggunakan FHE, pesan hanya bisa dibaca oleh pengirim dan penerima - bahkan node validator tidak bisa membaca isi pesan.

### Fitur Utama

- **End-to-end encryption** - Pesan dienkripsi menggunakan FHE sebelum dikirim ke blockchain
- **On-chain storage** - Pesan tersimpan permanen di blockchain
- **ACL-based access** - Hanya pengirim dan penerima yang bisa decrypt
- **Chunk-based messages** - Pesan dipecah menjadi chunks 8-byte (euint64) untuk efisiensi

## Contract: FHETalk.sol

### Struktur Data

```solidity
struct MessageHeader {
    address from;      // Pengirim
    address to;        // Penerima  
    uint64 timestamp;  // Waktu kirim
    uint16 chunkCount; // Jumlah chunk
}
```

### Fungsi Utama

| Fungsi | Deskripsi |
|--------|-----------|
| `sendMessage(to, encChunks, inputProof)` | Kirim pesan terenkripsi |
| `getInboxIds(user)` | Ambil ID pesan masuk |
| `getOutboxIds(user)` | Ambil ID pesan keluar |
| `getMessageHeader(messageId)` | Ambil metadata pesan |
| `getMessageChunk(messageId, index)` | Ambil chunk terenkripsi |
| `getConversation(user1, user2)` | Ambil percakapan antara 2 user |

### Batasan

- **MAX_CHUNKS**: 32 chunks per pesan (256 karakter)

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Set environment variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY  # Optional
```

### Compile

```bash
pnpm compile
```

### Deploy

```bash
# Deploy ke Sepolia
pnpm deploy:chat

# Atau manual
npx hardhat deploy --network sepolia --tags FHETalk
```

### Verify

```bash
pnpm verify:chat <CONTRACT_ADDRESS>
```

## Project Structure

```
packages/hardhat/
├── contracts/
│   └── FHETalk.sol      # Main contract
├── deploy/
│   └── deploy-chat.ts   # Deployment script
├── tasks/               # Hardhat tasks
├── hardhat.config.ts    # Hardhat config
└── package.json
```

## Scripts

| Script | Deskripsi |
|--------|-----------|
| `pnpm compile` | Compile contracts |
| `pnpm test` | Run tests |
| `pnpm deploy:chat` | Deploy FHETalk ke Sepolia |
| `pnpm verify:chat` | Verify di Etherscan |
| `pnpm clean` | Hapus build artifacts |

## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | `0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1` |

## Dokumentasi

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## License

BSD-3-Clause-Clear
