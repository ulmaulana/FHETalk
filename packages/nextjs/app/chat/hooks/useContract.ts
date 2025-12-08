// ============================================================================
// useContract Hook - Contract interaction utilities
// ============================================================================

import { useCallback, useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { getContractConfig } from "~~/contracts";

export function useContract() {
  const { isConnected, address } = useAccount();
  const chatConfig = getContractConfig("FHETalk");
  
  // State for async signer initialization
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const [isContractReady, setIsContractReady] = useState(false);
  const providerRef = useRef<ethers.BrowserProvider | null>(null);

  // Initialize signer asynchronously
  useEffect(() => {
    let mounted = true;
    
    const initSigner = async () => {
      if (!isConnected || !address || typeof window === "undefined" || !(window as any).ethereum) {
        setEthersSigner(undefined);
        setIsContractReady(false);
        return;
      }
      
      try {
        // Create provider once and reuse
        if (!providerRef.current) {
          providerRef.current = new ethers.BrowserProvider((window as any).ethereum);
        }
        
        // Get signer properly with await
        const signer = await providerRef.current.getSigner(address);
        
        if (mounted) {
          setEthersSigner(signer);
          setIsContractReady(!!(chatConfig.address && chatConfig.abi));
        }
      } catch (err) {
        console.error("Failed to initialize signer:", err);
        if (mounted) {
          setEthersSigner(undefined);
          setIsContractReady(false);
        }
      }
    };
    
    initSigner();
    
    return () => {
      mounted = false;
    };
  }, [isConnected, address, chatConfig.address, chatConfig.abi]);

  // Reset provider when disconnected
  useEffect(() => {
    if (!isConnected) {
      providerRef.current = null;
      setEthersSigner(undefined);
      setIsContractReady(false);
    }
  }, [isConnected]);

  // Get ethers contract - memoized provider for read operations
  const getContract = useCallback((mode: "read" | "write"): ethers.Contract | undefined => {
    if (!chatConfig.address || !chatConfig.abi) {
      return undefined;
    }
    
    if (typeof window === "undefined" || !(window as any).ethereum) {
      return undefined;
    }
    
    try {
      if (mode === "write") {
        if (!ethersSigner) return undefined;
        return new ethers.Contract(chatConfig.address, chatConfig.abi, ethersSigner);
      }
      
      if (mode === "read") {
        if (!isConnected) return undefined;
        // Use existing provider or create new one
        const provider = providerRef.current || new ethers.BrowserProvider((window as any).ethereum);
        if (!providerRef.current) providerRef.current = provider;
        return new ethers.Contract(chatConfig.address, chatConfig.abi, provider);
      }
    } catch (err) {
      console.error(`Failed to get contract (${mode}):`, err);
    }
    
    return undefined;
  }, [chatConfig.address, chatConfig.abi, ethersSigner, isConnected]);

  return {
    chatConfig,
    ethersSigner,
    getContract,
    isConnected,
    isContractReady,
    address,
  };
}
