# FHETalk Frontend

Next.js frontend untuk FHETalk - aplikasi private messaging dengan Fully Homomorphic Encryption.

## Features

- **Private Chat** - Kirim pesan terenkripsi ke user lain
- **Inbox/Outbox** - Lihat pesan masuk dan keluar
- **Message Decryption** - Decrypt pesan dengan wallet signature
- **Modern Stack** - Next.js 14, Wagmi, RainbowKit, Tailwind CSS

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Start development
pnpm dev
```

## 🚀 Quick Start

### **1. Start Local Development**

```bash
# Terminal 1: Start Hardhat node
pnpm chain

# Terminal 2: Deploy contracts
pnpm deploy:localhost

# Terminal 3: Start Next.js
pnpm dev
```

### **2. Open Application**
Navigate to [http://localhost:3000](http://localhost:3000)

## Features

### **Chat Demo**
- **Send Message** - Kirim pesan terenkripsi ke alamat wallet lain
- **View Inbox** - Lihat semua pesan masuk
- **View Outbox** - Lihat semua pesan terkirim
- **Decrypt Messages** - Decrypt pesan dengan EIP-712 signature
- **Real-time Status** - Monitor FHEVM client state

## 🔧 Configuration

### **Environment Variables**
```bash
# Optional: WalletConnect Project ID (has default fallback)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_from_reown

# Optional for local development
MNEMONIC=your_wallet_mnemonic
```

**Note:** No API keys required! The app uses public RPC endpoints by default.

### **Network Configuration**
- **Local Development**: Hardhat (Chain ID: 31337)
- **Testnet**: Sepolia (Chain ID: 11155111) - uses public RPC
- **Mock Chains**: Localhost for development

## 📱 User Interface

### **Navigation**
- **Tab-based Interface**: Easy switching between demos
- **Visual Indicators**: Clear active state indicators
- **Responsive Design**: Works on all screen sizes

### **Status Monitoring**
- **FHEVM Status**: Real-time client state
- **Contract Status**: Deployment and connection status
- **Error States**: Clear error messages and handling

### **Operations**
- **Form-based Input**: Intuitive user inputs
- **Loading States**: Visual feedback during operations
- **Results Display**: Clear output formatting

## Deployment

### **Vercel Deployment**
```bash
pnpm vercel
```

### **Environment Setup**
1. Update contract address di `contracts/addresses.ts`
2. (Optional) Set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`

## Deployed Contract

| Network | Address |
|---------|---------|
| Sepolia | `0x66345371E0D383Fe79fFAF0BFd3BE56eF24Bf4f1` |

## Documentation

- [FHETalk Contract](../hardhat/README.md)
- [FHEVM SDK](../fhevm-sdk/README.md)

## License

BSD-3-Clause-Clear License
