import Web3 from "web3";
import { Contract } from "web3-eth-contract";

// Contract ABI - will be generated after compilation
const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "string", name: "baseURI", type: "string" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "forestId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "CreditsMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "CreditsRetired",
    type: "event",
  },
  {
    inputs: [
      { internalType: "uint256", name: "forestId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
    ],
    name: "mintCredits",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "retireCredits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "forestId", type: "uint256" }],
    name: "getTokenId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getForestId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

class BlockchainService {
  private web3: Web3 | null = null;
  private contract: Contract<any> | null = null;
  private contractAddress: string;
  private ownerAddress: string;
  private ownerPrivateKey: string;

  constructor() {
    this.contractAddress = process.env.CONTRACT_ADDRESS || "";
    this.ownerAddress = process.env.OWNER_ADDRESS || "";
    this.ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || "";
  }

  /**
   * Initialize Web3 connection to Ganache
   */
  async initialize() {
    try {
      const ganacheUrl = process.env.GANACHE_URL || "http://127.0.0.1:7545";
      this.web3 = new Web3(new Web3.providers.HttpProvider(ganacheUrl));

      // Check connection
      const isConnected = await this.web3.eth.net.isListening();
      if (!isConnected) {
        throw new Error("Cannot connect to Ganache");
      }

      // Initialize contract
      if (this.contractAddress) {
        this.contract = new this.web3.eth.Contract(
          CONTRACT_ABI,
          this.contractAddress,
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize blockchain service:", error);
      return false;
    }
  }

  /**
   * Mint carbon credit tokens for a forest
   */
  async mintCarbonCredits(
    forestId: number,
    amount: number,
    recipientAddress?: string,
  ): Promise<{
    success: boolean;
    tokenId?: number;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      if (!this.web3 || !this.contract) {
        await this.initialize();
      }

      if (!this.contract) {
        return { success: false, error: "Contract not initialized" };
      }

      const recipient = recipientAddress || this.ownerAddress;

      // Add private key to wallet if not already added
      if (
        this.ownerPrivateKey &&
        !this.web3!.eth.accounts.wallet.get(this.ownerAddress)
      ) {
        this.web3!.eth.accounts.wallet.add(this.ownerPrivateKey);
      }

      // Call mintCredits function
      const tx = await this.contract.methods
        .mintCredits(forestId, amount, recipient)
        .send({
          from: this.ownerAddress,
          gas: "500000",
        });

      // Get token ID from event
      const event = tx.events?.CreditsMinted;
      const tokenId = event?.returnValues?.tokenId;

      return {
        success: true,
        tokenId: tokenId ? Number(tokenId) : undefined,
        transactionHash: tx.transactionHash,
      };
    } catch (error: any) {
      console.error("Failed to mint carbon credits:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  /**
   * Retire (burn) carbon credit tokens
   */
  async retireCredits(
    tokenId: number,
    amount: number,
    fromAddress: string,
    privateKey: string,
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.web3 || !this.contract) {
        await this.initialize();
      }

      if (!this.contract) {
        return { success: false, error: "Contract not initialized" };
      }

      // Add private key to wallet
      if (!this.web3!.eth.accounts.wallet.get(fromAddress)) {
        this.web3!.eth.accounts.wallet.add(privateKey);
      }

      // Call retireCredits function
      const tx = await this.contract.methods
        .retireCredits(tokenId, amount)
        .send({
          from: fromAddress,
          gas: "300000",
        });

      return {
        success: true,
        transactionHash: tx.transactionHash,
      };
    } catch (error: any) {
      console.error("Failed to retire credits:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  /**
   * Get token ID for a forest ID
   */
  async getTokenIdForForest(forestId: number): Promise<number | null> {
    try {
      if (!this.web3 || !this.contract) {
        await this.initialize();
      }

      if (!this.contract) {
        return null;
      }

      const tokenId = await this.contract.methods.getTokenId(forestId).call();
      return Number(tokenId);
    } catch (error) {
      console.error("Failed to get token ID:", error);
      return null;
    }
  }

  /**
   * Get token balance for an address
   */
  async getBalance(address: string, tokenId: number): Promise<number> {
    try {
      if (!this.web3 || !this.contract) {
        await this.initialize();
      }

      if (!this.contract) {
        return 0;
      }

      const balance = await this.contract.methods
        .balanceOf(address, tokenId)
        .call();
      return Number(balance);
    } catch (error) {
      console.error("Failed to get balance:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
