# Carbon Credit Token Smart Contract Documentation

## Overview

The `CarbonCreditToken` smart contract is an ERC-1155 token implementation designed for managing carbon credits on the blockchain. Each token ID represents carbon credits from a specific forest, allowing for efficient batch operations and unique identification of carbon credits by their origin.

**Contract Details:**

- **Standard**: ERC-1155 (Multi-Token Standard)
- **Solidity Version**: ^0.8.21
- **License**: MIT
- **Name**: Carbon Credit Token
- **Symbol**: CCT

---

## Key Features

- **Multi-Token Support**: Each forest gets its own unique token ID
- **Minting**: Owner can mint carbon credits for forests
- **Burning (Retirement)**: Users can permanently retire their carbon credits
- **Batch Operations**: Mint multiple forest credits in one transaction
- **Forest Mapping**: Bidirectional mapping between forest IDs and token IDs
- **Metadata Support**: URI-based metadata for each token

---

## Contract Architecture

### State Variables

| Variable            | Type                        | Description                                        |
| ------------------- | --------------------------- | -------------------------------------------------- |
| `name`              | string                      | Token name: "Carbon Credit Token"                  |
| `symbol`            | string                      | Token symbol: "CCT"                                |
| `tokenIdToForestId` | mapping(uint256 => uint256) | Maps token IDs to forest database IDs              |
| `forestIdToTokenId` | mapping(uint256 => uint256) | Maps forest database IDs to token IDs              |
| `_currentTokenId`   | uint256                     | Counter for generating new token IDs (starts at 1) |
| `_baseTokenURI`     | string                      | Base URI for token metadata                        |

### Events

#### `CreditsMinted`

```solidity
event CreditsMinted(uint256 indexed tokenId, uint256 indexed forestId, address indexed recipient, uint256 amount);
```

Emitted when carbon credits are minted.

- `tokenId`: The token ID that was minted
- `forestId`: The database ID of the forest
- `recipient`: Address that received the tokens
- `amount`: Number of credits minted

#### `CreditsRetired`

```solidity
event CreditsRetired(uint256 indexed tokenId, address indexed account, uint256 amount);
```

Emitted when carbon credits are retired (burned).

- `tokenId`: The token ID that was retired
- `account`: Address that retired the tokens
- `amount`: Number of credits retired

---

## Functions Documentation

### 1. Minting Functions

#### `mintCredits`

```solidity
function mintCredits(
    uint256 forestId,
    uint256 amount,
    address recipient
) external onlyOwner returns (uint256)
```

**Purpose**: Mint carbon credits for a specific forest.

**Access**: Owner only (platform administrator)

**Parameters**:

- `forestId` (uint256): The database ID of the forest
- `amount` (uint256): The amount of carbon credits to mint
- `recipient` (address): The address to receive the minted tokens

**Returns**:

- `uint256`: The token ID assigned to these credits

**Process**:

1. Validates that amount > 0 and recipient is valid
2. Checks if the forest already has a token ID:
   - If new forest: Creates a new token ID and establishes mapping
   - If existing forest: Retrieves existing token ID
3. Mints the specified amount to the recipient
4. Emits `CreditsMinted` event

**Example Usage**:

```javascript
// Mint 1000 carbon credits from forest ID 5 to buyer address
const tokenId = await contract.mintCredits(
  5,
  1000,
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
);
// Returns: tokenId (e.g., 1) that represents forest 5
```

**Requirements**:

- Only contract owner can call this function
- Amount must be greater than 0
- Recipient address must be valid (not zero address)

---

#### `mintBatchCredits`

```solidity
function mintBatchCredits(
    uint256[] memory forestIds,
    uint256[] memory amounts,
    address recipient
) external onlyOwner
```

**Purpose**: Mint carbon credits for multiple forests in a single transaction (gas efficient).

**Access**: Owner only (platform administrator)

**Parameters**:

- `forestIds` (uint256[]): Array of forest database IDs
- `amounts` (uint256[]): Array of amounts to mint (must match forestIds length)
- `recipient` (address): The address to receive all minted tokens

**Process**:

1. Validates arrays have equal length
2. Validates recipient address
3. For each forest:
   - Creates or retrieves token ID
   - Builds array of token IDs
4. Executes batch mint operation
5. Emits `CreditsMinted` events for each forest

**Example Usage**:

```javascript
// Mint credits from 3 different forests in one transaction
await contract.mintBatchCredits(
  [1, 2, 3], // Forest IDs
  [500, 750, 1000], // Amounts for each forest
  "0x742d35Cc...", // Recipient address
);
```

**Requirements**:

- Only contract owner can call this function
- Arrays must have equal length
- All amounts must be greater than 0
- Recipient address must be valid

---

### 2. Burning (Retirement) Functions

#### `retireCredits`

```solidity
function retireCredits(uint256 tokenId, uint256 amount) external
```

**Purpose**: Permanently burn (retire) carbon credits to offset carbon emissions.

**Access**: Any token holder

**Parameters**:

- `tokenId` (uint256): The token ID to retire
- `amount` (uint256): The amount of credits to retire

**Process**:

1. Checks that caller has sufficient balance
2. Burns the specified amount from caller's balance
3. Emits `CreditsRetired` event
4. **This action is irreversible** - tokens are permanently removed

**Example Usage**:

```javascript
// Retire 100 carbon credits from token ID 1
await contract.retireCredits(1, 100);
// User's balance decreases by 100, total supply decreases by 100
```

**Requirements**:

- Caller must own at least the specified amount of tokens
- Amount must be greater than 0

**Important Notes**:

- This is the blockchain equivalent of "using" carbon credits
- Retired credits cannot be recovered or transferred
- Used when generating final carbon offset certificates
- Creates immutable proof of carbon offset on blockchain

---

### 3. Query Functions

#### `getForestId`

```solidity
function getForestId(uint256 tokenId) external view returns (uint256)
```

**Purpose**: Get the forest database ID for a given token ID.

**Parameters**:

- `tokenId` (uint256): The token ID to query

**Returns**:

- `uint256`: The corresponding forest database ID

**Example Usage**:

```javascript
const forestId = await contract.getForestId(1);
// Returns: 5 (if token ID 1 represents forest 5)
```

---

#### `getTokenId`

```solidity
function getTokenId(uint256 forestId) external view returns (uint256)
```

**Purpose**: Get the token ID for a given forest database ID.

**Parameters**:

- `forestId` (uint256): The forest database ID to query

**Returns**:

- `uint256`: The corresponding token ID (returns 0 if forest has no token yet)

**Example Usage**:

```javascript
const tokenId = await contract.getTokenId(5);
// Returns: 1 (if forest 5 has token ID 1)
// Returns: 0 (if forest 5 has never been minted)
```

---

#### `getCurrentTokenId`

```solidity
function getCurrentTokenId() external view returns (uint256)
```

**Purpose**: Get the next token ID that will be assigned.

**Returns**:

- `uint256`: The next available token ID

**Example Usage**:

```javascript
const nextId = await contract.getCurrentTokenId();
// Returns: 5 (meaning token IDs 1-4 have been used, next mint will be ID 5)
```

---

#### `uri`

```solidity
function uri(uint256 tokenId) public view override returns (string memory)
```

**Purpose**: Get the metadata URI for a specific token ID.

**Parameters**:

- `tokenId` (uint256): The token ID

**Returns**:

- `string`: The full URI to the token's metadata JSON file

**Example Usage**:

```javascript
const metadataUri = await contract.uri(1);
// Returns: "https://api.example.com/metadata/1.json"
```

---

### 4. Administrative Functions

#### `setBaseURI`

```solidity
function setBaseURI(string memory baseURI) external onlyOwner
```

**Purpose**: Update the base URI for token metadata.

**Access**: Owner only

**Parameters**:

- `baseURI` (string): The new base URI

**Example Usage**:

```javascript
await contract.setBaseURI("https://new-api.example.com/metadata/");
```

---

## Token Buying Process (Application Level)

**Note**: The smart contract itself does NOT have a direct "buy" function. Token purchasing is handled at the application level with the following flow:

### Purchase Workflow

1. **User Initiates Purchase** (Frontend)
   - User selects carbon credits from marketplace
   - Specifies quantity to purchase
   - Proceeds to checkout

2. **Order Creation** (Backend API)
   - Order record created in database with status "Pending"
   - Order contains: user ID, forest/credit details, quantity, price

3. **Payment Processing** (Payment API)
   - User submits payment (mock payment or Stripe)
   - Payment validated and processed
   - Order status updated to "Completed"

4. **Token Transfer** (Blockchain Service)

   ```javascript
   // Application calls safeTransferFrom on the contract
   await contract.safeTransferFrom(
     ownerAddress, // Platform owner (has minted tokens)
     buyerAddress, // Customer receiving tokens
     tokenId, // Token ID for the forest
     quantity, // Amount purchased
     "0x", // Empty data
   );
   ```

5. **Database Update** (Backend)
   - Available credits decreased in database
   - Transaction hash recorded
   - Certificate generated

### Key Points About Buying

- **No "buy" function in contract**: Uses standard ERC-1155 `safeTransferFrom`
- **Minted to owner first**: All tokens minted to platform owner's wallet
- **Transfer on purchase**: Tokens transferred from owner to buyer after payment
- **Payment in fiat**: Users pay with credit card (off-chain)
- **Escrow model**: Platform holds payment until blockchain transfer confirms

---

## Complete Use Case Examples

### Use Case 1: Initial Forest Setup and Minting

```javascript
// 1. Platform owner mints 10,000 credits for new forest (ID: 42)
const tx = await contract.mintCredits(
  42, // Forest ID from database
  10000, // 10,000 credits
  "0x5A57feFf398a8ea3F2E10144cF71fD9A88801cE7", // Owner's wallet
);

// 2. Check what token ID was assigned
const tokenId = await contract.getTokenId(42);
console.log(`Forest 42 assigned Token ID: ${tokenId}`);

// 3. Verify balance
const balance = await contract.balanceOf(
  "0x5A57feFf398a8ea3F2E10144cF71fD9A88801cE7",
  tokenId,
);
console.log(`Owner has ${balance} credits for forest 42`);
```

---

### Use Case 2: Customer Purchase Flow

```javascript
// Customer wants to buy 100 credits from forest 42 (Token ID: 1)

// 1. Customer pays via application
// 2. Backend processes payment
// 3. Backend triggers blockchain transfer
await contract.safeTransferFrom(
  "0x5A57feFf398a8ea3F2E10144cF71fD9A88801cE7", // Owner address
  "0xC0D96df80AA7eFe04e4ed8D4170C87d75dAe047e", // Buyer address
  1, // Token ID
  100, // Amount
  "0x", // Data
);

// 4. Verify buyer received tokens
const buyerBalance = await contract.balanceOf(
  "0xC0D96df80AA7eFe04e4ed8D4170C87d75dAe047e",
  1,
);
console.log(`Buyer now has ${buyerBalance} credits`);
```

---

### Use Case 3: Retiring Credits for Carbon Offset

```javascript
// Customer wants to retire all their credits to offset carbon emissions

// 1. Check current balance
const tokenId = 1; // Forest token
const balance = await contract.balanceOf(buyerAddress, tokenId);

// 2. Retire all credits
await contract.retireCredits(tokenId, balance);

// 3. Verify retirement (balance should be 0)
const newBalance = await contract.balanceOf(buyerAddress, tokenId);
console.log(`Remaining balance: ${newBalance}`); // Should be 0

// 4. Application generates retirement certificate with TX hash
// Transaction hash serves as permanent proof of retirement
```

---

### Use Case 4: Batch Minting Multiple Forests

```javascript
// Platform wants to mint credits for 3 forests at once

await contract.mintBatchCredits(
  [10, 20, 30], // Forest IDs
  [5000, 3000, 7000], // Amounts for each forest
  ownerAddress, // All go to owner's wallet
);

// Check assigned token IDs
for (let forestId of [10, 20, 30]) {
  const tokenId = await contract.getTokenId(forestId);
  console.log(`Forest ${forestId} -> Token ID ${tokenId}`);
}
```

---

## Security Considerations

### Access Control

- **Owner-only functions**: `mintCredits`, `mintBatchCredits`, `setBaseURI`
- **Public functions**: `retireCredits` (anyone can burn their own tokens)
- Uses OpenZeppelin's `Ownable` for secure ownership management

### Validation Checks

- Amount validation (must be > 0)
- Address validation (cannot be zero address)
- Balance checks (must own tokens to burn)
- Array length validation (batch operations)

### Immutability

- Token retirement is permanent and irreversible
- Forest-to-token mappings cannot be changed once created
- Maintains integrity of carbon credit lifecycle

---

## Gas Optimization Tips

1. **Use Batch Minting**: When minting multiple forests, use `mintBatchCredits` instead of multiple `mintCredits` calls
2. **Retirement Planning**: Retire tokens in single transaction rather than multiple small retirements
3. **Token ID Reuse**: Contract automatically reuses token IDs for same forest (saves gas)

---

## Integration with Application

### Backend Service (blockchain-service.ts)

```typescript
// Mint new credits
async mintCredits(forestId: number, amount: number, recipient: string) {
    const tx = await this.contract.methods
        .mintCredits(forestId, amount, recipient)
        .send({ from: this.ownerAddress, gas: "300000" });
    return tx.transactionHash;
}

// Transfer tokens (buying)
async transferTokens(toAddress: string, tokenId: number, amount: number) {
    const tx = await this.contract.methods
        .safeTransferFrom(this.ownerAddress, toAddress, tokenId, amount, "0x")
        .send({ from: this.ownerAddress, gas: "500000" });
    return { success: true, transactionHash: tx.transactionHash };
}

// Retire tokens
async retireCredits(tokenId: number, amount: number,
                    fromAddress: string, privateKey: string) {
    this.web3.eth.accounts.wallet.add(privateKey);
    const tx = await this.contract.methods
        .retireCredits(tokenId, amount)
        .send({ from: fromAddress, gas: "300000" });
    return { success: true, transactionHash: tx.transactionHash };
}
```

---

## Testing the Contract

### Truffle Console Examples

```javascript
// Deploy contract
let contract = await CarbonCreditToken.deployed();

// Mint tokens
await contract.mintCredits(1, 1000, accounts[0]);

// Check balance
let balance = await contract.balanceOf(accounts[0], 1);
console.log(balance.toString()); // "1000"

// Transfer tokens
await contract.safeTransferFrom(accounts[0], accounts[1], 1, 100, "0x");

// Retire tokens
await contract.retireCredits(1, 50, { from: accounts[1] });

// Query mappings
let tokenId = await contract.getTokenId(1);
let forestId = await contract.getForestId(tokenId);
```

---

## Common Errors and Solutions

| Error                              | Cause                                 | Solution                                        |
| ---------------------------------- | ------------------------------------- | ----------------------------------------------- |
| "Amount must be greater than 0"    | Trying to mint/retire 0 credits       | Ensure amount > 0                               |
| "Invalid recipient address"        | Zero address provided                 | Use valid Ethereum address                      |
| "Insufficient balance"             | Trying to retire more than owned      | Check balance first                             |
| "Ownable: caller is not the owner" | Non-owner calling restricted function | Use owner account                               |
| "Arrays length mismatch"           | Batch mint arrays don't match         | Ensure forestIds and amounts arrays same length |

---

## Deployment Information

### Constructor Parameters

```solidity
constructor(string memory baseURI)
```

- `baseURI`: Base URI for token metadata (e.g., "https://api.example.com/metadata/")

### Deployment Example

```javascript
const CarbonCreditToken = artifacts.require("CarbonCreditToken");

module.exports = function (deployer) {
  deployer.deploy(
    CarbonCreditToken,
    "https://carbon-credits.example.com/metadata/",
  );
};
```

---

## Summary

The Carbon Credit Token smart contract provides a robust, secure, and gas-efficient way to manage carbon credits on the blockchain. Key operations include:

- **Minting**: Platform creates tokens for verified forests
- **Transferring**: Users purchase and trade carbon credits
- **Retiring**: Users permanently burn tokens to offset emissions
- **Querying**: Track forest-token relationships and balances

The contract follows best practices with OpenZeppelin standards, includes comprehensive validation, and maintains immutable proof of all carbon credit operations on the blockchain.
