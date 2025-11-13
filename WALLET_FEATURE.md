# Blockchain Wallet Feature

## Overview
The wallet page displays token assets from the Ganache local blockchain network for a specific wallet address. Access is restricted to the `user1@gmail.com` user only.

## Configuration

### Wallet Address
- **Address**: `0x5A57feFf398a8ea3F2E10144cF71fD9A88801cE7`
- **Network**: Ganache Local (http://127.0.0.1:7545)
- **Authorized User**: user1@gmail.com

### Environment Variables
The following environment variables are configured in `.env.local`:
```env
GANACHE_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=0x4137AD0F554629a554e413E0921Ec7e1E752376c
NEXT_PUBLIC_CONTRACT_ADDRESS=0x4137AD0F554629a554e413E0921Ec7e1E752376c
OWNER_ADDRESS=0x5A57feFf398a8ea3F2E10144cF71fD9A88801cE7
OWNER_PRIVATE_KEY=0xb88500eec0ccf40329dbbbb3996d86577c2107998b077609846991f4f2051a12
```

## Features

### 1. **Wallet Display**
- Shows the connected wallet address
- Displays active status badge
- Connected to Ganache local network

### 2. **Token Holdings**
- Lists all carbon credit tokens owned by the wallet
- Shows token balance for each forest
- Displays forest information (name, location)
- Shows token metadata (certification, vintage, symbol)
- Calculates estimated value in USD

### 3. **Summary Statistics**
- **Total Token Types**: Number of different forest tokens
- **Total Credits**: Sum of all carbon credits owned
- **Estimated Value**: Total USD value based on current prices

### 4. **Network Information**
- Network name: Ganache Local
- RPC URL: http://127.0.0.1:7545
- Smart contract address

## Access Control

The wallet page implements strict access control:
1. User must be authenticated
2. User email must match `user1@gmail.com`
3. Unauthorized users see an "Access Denied" message
4. Non-authenticated users are redirected to `/auth`

## API Endpoint

### GET `/api/wallet?address={walletAddress}`

**Query Parameters:**
- `address` (required): The blockchain wallet address

**Response:**
```json
{
  "walletAddress": "0x5A57feFf398a8ea3F2E10144cF71fD9A88801cE7",
  "tokens": [
    {
      "tokenId": 1,
      "forestId": 1,
      "forestName": "Amazon Rainforest",
      "forestLocation": "Brazil",
      "balance": 1000,
      "credit": {
        "pricePerCredit": 15.50,
        "certification": "VCS",
        "vintage": 2024,
        "symbol": "AMZN-2024"
      }
    }
  ],
  "totalTokenTypes": 1
}
```

## How It Works

1. **Authentication Check**: Verifies user is logged in and authorized
2. **Blockchain Connection**: Connects to Ganache local network
3. **Forest Retrieval**: Fetches all forests from the database
4. **Token Balance Query**: For each forest:
   - Gets the token ID from the smart contract
   - Queries the balance for the wallet address
   - Filters out forests with zero balance
5. **Display**: Shows token holdings with metadata and value calculations

## Technical Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Components**: shadcn/ui (Card, Badge, Alert, Skeleton)
- **Blockchain**: Web3.js, Ganache
- **Smart Contract**: ERC-1155 CarbonCreditToken
- **Database**: Prisma (for forest metadata)

## File Structure

```
src/
├── app/
│   ├── wallet/
│   │   └── page.tsx          # Wallet page component
│   └── api/
│       └── wallet/
│           └── route.ts       # API endpoint for wallet data
├── lib/
│   └── blockchain-service.ts  # Blockchain interaction service
└── components/
    └── ui/
        ├── card.tsx
        ├── badge.tsx
        ├── alert.tsx
        └── skeleton.tsx
```

## Usage

1. **Start Ganache**:
   ```bash
   ganache-cli -p 7545
   ```

2. **Deploy Smart Contract** (if not already deployed):
   ```bash
   cd CreditToken
   truffle migrate --network development
   ```

3. **Login as authorized user**:
   - Email: user1@gmail.com
   - Password: (your configured password)

4. **Navigate to wallet page**:
   ```
   http://localhost:3000/wallet
   ```

## Security Notes

- Private keys are stored in `.env.local` (never commit to version control)
- Access is restricted to a single authorized email
- Wallet address is hardcoded for this specific use case
- All blockchain calls are read-only from the client side
- Write operations (minting, retiring) are handled server-side only

## Future Enhancements

Potential improvements:
- Support for multiple wallet addresses
- Wallet connection via MetaMask or WalletConnect
- Transaction history display
- Real-time balance updates via WebSocket
- Export transaction data to CSV
- QR code for wallet address
- Token transfer functionality
- Multi-user wallet support with role-based access
