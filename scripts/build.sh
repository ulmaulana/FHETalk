#!/bin/bash

# FHETalk Build Script
# Builds SDK and Next.js frontend

set -e

echo "Building FHETalk..."

# Build the FHEVM SDK
echo "Building FHEVM SDK..."
pnpm sdk:build

# Build Next.js frontend
echo "Building Next.js frontend..."
pnpm next:build

# Build the Hardhat contracts
echo "Building Hardhat contracts..."
pnpm hardhat:compile

echo "All builds completed successfully!"
echo ""
echo "Built packages:"
echo "  - @fhevm/sdk (FHEVM SDK)"
echo "  - Next.js frontend"
echo "  - Hardhat contracts"
echo ""
echo "Available commands:"
echo "  pnpm dev           - Start Next.js development server"
echo "  pnpm next:build    - Build for production"
echo ""
echo "Ready for deployment and testing!"
