// Import ABIs
import FHETalkABI from './abis/FHETalk.json'

// Import addresses and types
import { CONTRACT_ADDRESSES } from './addresses'

// Export all contract ABIs and addresses
export { CONTRACT_ADDRESSES } from './addresses'

// Export ABIs
export const CONTRACT_ABIS = {
  FHETalk: FHETalkABI,
} as const

// Helper function to get contract config
export function getContractConfig(contractName: keyof typeof CONTRACT_ADDRESSES) {
  return {
    address: CONTRACT_ADDRESSES[contractName] as string,
    abi: CONTRACT_ABIS[contractName].abi, 
  }
}

const createDeployedContractsStructure = () => {
  const chainIds = [31337, 11155111] // hardhat, sepolia
  const contracts: Record<number, Record<string, { address: string; abi: any[]; inheritedFunctions?: Record<string, string>; deployedOnBlock?: number }>> = {}
  
  for (const chainId of chainIds) {
    contracts[chainId] = {
      FHETalk: {
        address: CONTRACT_ADDRESSES.FHETalk as string,
        abi: CONTRACT_ABIS.FHETalk.abi,
        inheritedFunctions: {},
      },
    }
  }
  
  return contracts
}

// Export as default for compatibility with existing imports
export default createDeployedContractsStructure()
