#!/bin/bash

# FHETalk Test Script
# Runs Hardhat contract tests and verifies package structure

set -e

echo "Testing FHETalk..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the root of the FHETalk directory"
    exit 1
fi

# Verify package structure
echo "Verifying package structure..."
MISSING_PACKAGES=0

if [ ! -d "packages/fhevm-sdk" ]; then
    echo "  Error: packages/fhevm-sdk is missing"
    MISSING_PACKAGES=1
else
    echo "  packages/fhevm-sdk exists"
fi

if [ ! -d "packages/hardhat" ]; then
    echo "  Error: packages/hardhat is missing"
    MISSING_PACKAGES=1
else
    echo "  packages/hardhat exists"
fi

if [ ! -d "packages/nextjs" ]; then
    echo "  Error: packages/nextjs is missing"
    MISSING_PACKAGES=1
else
    echo "  packages/nextjs exists"
fi

if [ $MISSING_PACKAGES -eq 1 ]; then
    echo "Error: Critical packages are missing!"
    exit 1
fi

# Test the Hardhat contracts
echo ""
echo "Testing Hardhat contracts..."
pnpm hardhat:test

echo ""
echo "All tests completed successfully!"
echo ""
echo "Test Results Summary:"
echo "  - Package structure verified"
echo "  - Hardhat contract tests passed"
