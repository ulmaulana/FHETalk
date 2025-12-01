#!/bin/bash

# FHETalk Build Test
# Tests that the SDK and Next.js frontend build correctly

set -e

echo "Testing FHETalk builds..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the root of the FHETalk directory"
    exit 1
fi

# Build all packages first
echo "Building all packages..."
bash scripts/build.sh

# Test Next.js build
echo "Testing Next.js build..."
if [ -d "packages/nextjs" ]; then
    cd packages/nextjs
    pnpm build
    cd ../..
    echo "  Next.js builds successfully"
else
    echo "  Error: packages/nextjs not found"
    exit 1
fi

# Verify SDK exports
echo "Verifying SDK structure..."
if [ -d "packages/fhevm-sdk/dist" ]; then
    echo "  SDK built successfully"
    
    if [ -f "packages/fhevm-sdk/dist/react/src/index.js" ]; then
        echo "  React exports available"
    fi
else
    echo "Error: SDK not built. Run 'pnpm build:all' first"
    exit 1
fi

echo ""
echo "Build test completed successfully!"
echo ""
echo "Results:"
echo "  - SDK structure verified"
echo "  - Next.js builds successfully"
