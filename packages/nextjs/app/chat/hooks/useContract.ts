// ============================================================================
// useContract Hook - Contract interaction utilities
// ============================================================================

import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { getContractConfig } from "~~/contracts";

export function useContract() {
  const { isConnected, address } = useAccount();
  const chatConfig = getContractConfig("FHETalk");

  // Ethers signer
  const ethersSigner = useMemo(() => {
    if (!isConnected || !address) return undefined;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      return new ethers.JsonRpcSigner(provider, address);
    } catch {
      return undefined;
    }
  }, [isConnected, address]);

  // Get ethers contract
  const getContract = useCallback((mode: "read" | "write") => {
    if (!chatConfig.address || !chatConfig.abi) return undefined;
    
    if (mode === "write" && ethersSigner) {
      return new ethers.Contract(chatConfig.address, chatConfig.abi, ethersSigner);
    }
    
    if (mode === "read" && isConnected) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      return new ethers.Contract(chatConfig.address, chatConfig.abi, provider);
    }
    
    return undefined;
  }, [chatConfig, ethersSigner, isConnected]);

  return {
    chatConfig,
    ethersSigner,
    getContract,
    isConnected,
    address,
  };
}
