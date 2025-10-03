import { Web3 } from 'web3';

// WARNING: HARDCODED VALUES FOR DEVELOPMENT ONLY
// TODO: Move these to environment variables and make configurable after testing
const GANACHE_URL = 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS = '0x6590fdfca231945136dF4370F61cB1aB57fB00c7'; // Deployed contract address  
const OWNER_PRIVATE_KEY = '0x45738cbea7368dd74c36b8720d297161fca1cdff734ab167ec5b440bec9d5288'; // Account (0) private key
const BUYER_WALLET_ADDRESS = '0xB70e41919524b5b58aEC11975B40eC6a198541d2'; // HARDCODED USER WALLET

// Carbon Token ABI - only the functions we need
const CARBON_TOKEN_ABI = [
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transferToBuyer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

class BlockchainService {
  private web3: Web3;
  private contract: any;
  private ownerAccount: any;

  constructor() {
    this.web3 = new Web3(GANACHE_URL);
  }

  /**
   * Initialize the blockchain service
   * Call this before using other methods
   */
  async initialize() {
    try {
      // TODO: Remove hardcoded values and use environment variables
      if (!CONTRACT_ADDRESS || !OWNER_PRIVATE_KEY) {
        throw new Error('CONTRACT_ADDRESS and OWNER_PRIVATE_KEY must be set');
      }

      this.contract = new this.web3.eth.Contract(CARBON_TOKEN_ABI, CONTRACT_ADDRESS);
      this.ownerAccount = this.web3.eth.accounts.privateKeyToAccount(OWNER_PRIVATE_KEY);
      this.web3.eth.accounts.wallet.add(this.ownerAccount);

      console.log('Blockchain service initialized');
      console.log('Contract address:', CONTRACT_ADDRESS);
      console.log('Owner address:', this.ownerAccount.address);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Transfer carbon tokens to buyer after successful payment
   * @param creditAmount Number of credits purchased (will be converted to token amount)
   * @param buyerAddress Optional buyer address (defaults to hardcoded address)
   */
  async transferTokensToBuyer(creditAmount: number, buyerAddress?: string): Promise<string> {
    try {
      if (!this.contract || !this.ownerAccount) {
        await this.initialize();
      }

      // TODO: Implement proper credit-to-token conversion logic
      // For now, 1 credit = 1 token (with 18 decimals)
      const tokenAmount = this.web3.utils.toWei(creditAmount.toString(), 'ether');
      const recipient = buyerAddress || BUYER_WALLET_ADDRESS;

      console.log(`Transferring ${creditAmount} tokens (${tokenAmount} wei) to ${recipient}`);

      // Check owner balance first
      const ownerBalance = await this.contract.methods.balanceOf(this.ownerAccount.address).call();
      console.log('Owner balance:', this.web3.utils.fromWei(ownerBalance, 'ether'), 'tokens');

      if (BigInt(ownerBalance) < BigInt(tokenAmount)) {
        throw new Error('Insufficient token balance in owner account');
      }

      // Prepare transaction
      const txData = this.contract.methods.transferToBuyer(recipient, tokenAmount);
      const gas = await txData.estimateGas({ from: this.ownerAccount.address });
      const gasPrice = await this.web3.eth.getGasPrice();

      // Send transaction
      const tx = await txData.send({
        from: this.ownerAccount.address,
        gas: gas,
        gasPrice: gasPrice
      });

      console.log('Token transfer successful:', tx.transactionHash);
      return tx.transactionHash;

    } catch (error) {
      console.error('Token transfer failed:', error);
      throw error;
    }
  }

  /**
   * Get token balance for an address
   * @param address Wallet address to check
   */
  async getTokenBalance(address: string): Promise<string> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const balance = await this.contract.methods.balanceOf(address).call();
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('Failed to get token balance:', error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();