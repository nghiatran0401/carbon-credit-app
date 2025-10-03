/**
 * Blockchain utilities for transaction tracking and explorer links
 */

export interface BlockchainNetwork {
  name: string;
  explorerUrl: string;
  isLocal: boolean;
}

export const BLOCKCHAIN_NETWORKS: Record<string, BlockchainNetwork> = {
  mainnet: {
    name: "Ethereum Mainnet",
    explorerUrl: "https://etherscan.io",
    isLocal: false,
  },
  sepolia: {
    name: "Sepolia Testnet",
    explorerUrl: "https://sepolia.etherscan.io",
    isLocal: false,
  },
  ganache: {
    name: "Local Ganache",
    explorerUrl: "http://localhost:7545",
    isLocal: true,
  },
  hardhat: {
    name: "Local Hardhat",
    explorerUrl: "http://localhost:8545",
    isLocal: true,
  },
};

/**
 * Get the appropriate blockchain explorer URL for a transaction
 * @param txHash Transaction hash
 * @param network Network identifier (defaults to 'ganache' for development)
 * @returns Object with explorer URLs and network info
 */
export function getBlockchainExplorerInfo(txHash: string, network: string = 'ganache') {
  const networkConfig = BLOCKCHAIN_NETWORKS[network] || BLOCKCHAIN_NETWORKS.ganache;
  
  return {
    network: networkConfig,
    explorerUrls: {
      transaction: `${networkConfig.explorerUrl}/tx/${txHash}`,
      dashboard: networkConfig.explorerUrl,
    },
    isLocal: networkConfig.isLocal,
  };
}

/**
 * Validate if a string looks like a valid transaction hash
 * @param hash String to validate
 * @returns boolean
 */
export function isValidTransactionHash(hash: string): boolean {
  // Ethereum transaction hash is 66 characters long and starts with 0x
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Truncate transaction hash for display purposes
 * @param hash Full transaction hash
 * @param startChars Number of characters to show at start (default: 6)
 * @param endChars Number of characters to show at end (default: 4)
 * @returns Truncated hash like "0x1234...abcd"
 */
export function truncateTransactionHash(hash: string, startChars: number = 6, endChars: number = 4): string {
  if (!hash || hash.length < startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Get blockchain network from environment or default to ganache for development
 */
export function getCurrentNetwork(): string {
  // Check if we're in development mode
  if (process.env.NODE_ENV === 'development') {
    return process.env.BLOCKCHAIN_NETWORK || 'ganache';
  }
  
  // For production, default to mainnet unless specified
  return process.env.BLOCKCHAIN_NETWORK || 'mainnet';
}

/**
 * Format blockchain transaction status for display
 * @param transferred Whether tokens have been transferred
 * @param txHash Transaction hash (optional)
 * @returns Formatted status object
 */
export function formatTransactionStatus(transferred: boolean, txHash?: string) {
  if (transferred && txHash) {
    return {
      status: 'completed',
      message: 'Tokens Transferred',
      icon: '✅',
      color: 'green',
    };
  } else if (txHash && !transferred) {
    return {
      status: 'pending',
      message: 'Transfer in Progress',
      icon: '⏳',
      color: 'yellow',
    };
  } else if (!txHash) {
    return {
      status: 'waiting',
      message: 'Transfer Pending',
      icon: '⏳',
      color: 'yellow',
    };
  } else {
    return {
      status: 'failed',
      message: 'Transfer Failed',
      icon: '❌',
      color: 'red',
    };
  }
}