# Blockchain Integration Guide

This guide explains how to deploy and use the Carbon Credit ERC1155 smart contract with your application.

## Prerequisites

1. **Ganache** - Local Ethereum blockchain
   - Download from: https://trufflesuite.com/ganache/
   - Or use Ganache CLI: `npm install -g ganache`

2. **Node.js packages**
   ```bash
   npm install web3 @openzeppelin/contracts
   ```

## Setup Steps

### 1. Start Ganache

Open Ganache and create a new workspace, or run:

```bash
ganache -p 7545
```

This should start a local blockchain at `http://127.0.0.1:7545`

### 2. Install OpenZeppelin Contracts

Navigate to the CreditToken directory and install dependencies:

```bash
cd CreditToken
npm init -y
npm install @openzeppelin/contracts
```

### 3. Compile the Smart Contract

```bash
cd CreditToken
truffle compile
```

This will generate the ABI and bytecode in `build/contracts/CarbonCreditToken.json`

### 4. Deploy to Ganache

```bash
truffle migrate --network development
```

After deployment, you'll see output like:

```
CarbonCreditToken: 0x1234567890abcdef...
```

Copy this contract address.

### 5. Configure Environment Variables

Copy the example file:

```bash
cp .env.blockchain.example .env.local
```

Edit `.env.local` and add:

```env
GANACHE_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=0x1234567890abcdef... # From deployment
OWNER_ADDRESS=0xYourGanacheAccount1  # First account from Ganache
OWNER_PRIVATE_KEY=0xYourPrivateKey1   # Private key from Ganache
```

**To get the account details from Ganache:**

- Open Ganache
- Click on the key icon next to the first account
- Copy the address and private key

### 6. Update the ABI (if needed)

After compilation, copy the ABI from `CreditToken/build/contracts/CarbonCreditToken.json` and update the `CONTRACT_ABI` in `src/lib/blockchain-service.ts` if you made any changes to the contract.

## How It Works

### Smart Contract Features

1. **ERC1155 Token Standard** - Multi-token standard allowing multiple token types in one contract
2. **Forest-to-Token Mapping** - Each forest gets a unique token ID
3. **Minting** - Only contract owner can mint tokens
4. **Retiring** - Token holders can burn (retire) their credits
5. **Tracking** - Bidirectional mapping between forest IDs and token IDs

### Upload Assets Flow

1. User fills the upload form with:
   - Carbon credit amount
   - Forest name (selected from dropdown)

2. Backend API (`/api/upload-assets`):
   - Creates forest record in database
   - Creates carbon credit record
   - Calls `blockchainService.mintCarbonCredits()`

3. Blockchain service:
   - Connects to Ganache
   - Calls `mintCredits()` on the smart contract
   - Returns token ID and transaction hash

4. Response includes:
   - Database records (forest + credits)
   - Blockchain data (tokenId, transactionHash)

## Testing

### Test Contract Directly

Create a test file in `CreditToken/test/`:

```javascript
const CarbonCreditToken = artifacts.require("CarbonCreditToken");

contract("CarbonCreditToken", (accounts) => {
  it("should mint credits for a forest", async () => {
    const instance = await CarbonCreditToken.deployed();
    const result = await instance.mintCredits(1, 1000, accounts[0]);

    // Check event
    assert.equal(result.logs[0].event, "CreditsMinted");
    assert.equal(result.logs[0].args.amount, 1000);
  });
});
```

Run tests:

```bash
cd CreditToken
truffle test
```

### Test Upload API

```bash
curl -X POST http://localhost:3000/api/upload-assets \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "carbonCreditAmount": 1000,
    "forestName": "Cần Giờ Forest"
  }'
```

## Troubleshooting

### "Cannot connect to Ganache"

- Ensure Ganache is running on port 7545
- Check GANACHE_URL in .env.local

### "Contract not initialized"

- Verify CONTRACT_ADDRESS is set correctly
- Ensure contract is deployed: `truffle migrate --network development`

### "Insufficient funds"

- Check that OWNER_ADDRESS has ETH in Ganache
- Ganache accounts start with 100 ETH by default

### "Invalid address"

- Ensure addresses start with "0x"
- Verify OWNER_ADDRESS matches an account in Ganache

## Smart Contract Methods

### Owner Methods (Only contract owner can call)

- `mintCredits(forestId, amount, recipient)` - Mint tokens for a forest
- `setBaseURI(baseURI)` - Update metadata URI

### Public Methods

- `retireCredits(tokenId, amount)` - Burn/retire credits
- `balanceOf(address, tokenId)` - Check token balance
- `getTokenId(forestId)` - Get token ID for a forest
- `getForestId(tokenId)` - Get forest ID for a token

## Next Steps

1. **Add metadata** - Create JSON files for token metadata (images, descriptions)
2. **User wallets** - Allow users to connect their MetaMask wallets
3. **Transfer credits** - Implement credit transfers between users
4. **Marketplace** - Build on-chain marketplace for trading credits
5. **Testnet deployment** - Deploy to Sepolia or other test networks
6. **Mainnet** - Eventually deploy to Ethereum mainnet or L2 solution
