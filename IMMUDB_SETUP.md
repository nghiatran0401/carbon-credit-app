# ImmuDB Setup and Testing

This guide explains how to set up and test ImmuDB integration for storing transaction hashes in your carbon credit application.

## Prerequisites

1. **Install ImmuDB Server**
   
   Download and install ImmuDB from [https://immudb.io/](https://immudb.io/)
   
   For Windows, you can download the binary or use Docker:
   ```bash
   # Using Docker (recommended)
   docker run -d --name immudb -p 3322:3322 codenotary/immudb:latest
   
   # Or download the Windows binary from the releases page
   ```

2. **Start ImmuDB Server**
   ```bash
   # If using Docker
   docker start immudb
   
   # If using binary
   ./immudb
   ```

## Configuration

1. **Environment Variables**
   
   The application uses these environment variables (already configured in `.env.local`):
   ```
   IMMUDB_HOST=localhost
   IMMUDB_PORT=3322
   IMMUDB_USERNAME=immudb
   IMMUDB_PASSWORD=immudb
   IMMUDB_DATABASE=defaultdb
   ```

2. **Default Credentials**
   - Username: `immudb`
   - Password: `immudb`
   - Database: `defaultdb`

## Features

### ImmuDB Service (`src/lib/immudb-service.ts`)

The service provides the following functionality:
- **Connection Management**: Connect/disconnect to ImmuDB
- **Store Transaction Hashes**: Store blockchain transaction hashes with metadata
- **Retrieve Transactions**: Get specific or all transaction hashes
- **Verification**: Cryptographically verify stored data
- **History**: Get the history of changes for a transaction hash

### API Endpoints

1. **Test Connection**: `GET /api/immudb/test-connection`
   - Tests the connection to ImmuDB server

2. **Store/Retrieve Transactions**: `/api/immudb/transactions`
   - `POST`: Store a new transaction hash
   - `GET`: Retrieve all transactions or a specific one (with `?hash=` parameter)

3. **Verify Transaction**: `GET /api/immudb/verify?hash=`
   - Cryptographically verify a transaction hash

4. **Get History**: `GET /api/immudb/history?hash=`
   - Get the history of changes for a transaction hash

### Web Interface

Visit `/immudb-test` to access the web interface where you can:
- Test the database connection
- Store new transaction hashes
- Search for specific transactions
- Verify transaction integrity
- View all stored transactions

## Transaction Hash Structure

```typescript
interface TransactionHash {
  hash: string;              // The actual transaction hash
  timestamp: number;         // Unix timestamp when stored
  blockNumber?: number;      // Optional blockchain block number
  transactionType: string;   // Type of transaction (carbon_credit, transfer, etc.)
  metadata?: Record<string, any>; // Optional additional data
}
```

## Usage Examples

### Storing a Transaction Hash
```javascript
const transactionData = {
  hash: "0x1234567890abcdef...",
  transactionType: "carbon_credit",
  blockNumber: 123456,
  metadata: {
    amount: 100,
    seller: "0xabc...",
    buyer: "0xdef..."
  }
};

const response = await fetch('/api/immudb/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(transactionData)
});
```

### Retrieving a Transaction Hash
```javascript
const response = await fetch('/api/immudb/transactions?hash=0x1234567890abcdef...');
const data = await response.json();
```

### Verifying a Transaction Hash
```javascript
const response = await fetch('/api/immudb/verify?hash=0x1234567890abcdef...');
const data = await response.json();
console.log(data.verified); // true/false
```

## Security Features

ImmuDB provides several security features:
1. **Immutability**: Data cannot be modified once stored
2. **Cryptographic Verification**: All data is cryptographically verifiable
3. **Audit Trail**: Complete history of all operations
4. **Tamper Detection**: Any tampering attempts are detected

## Testing

1. Start the Next.js development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000/immudb-test` to access the test interface

3. Test the connection by clicking "Test Connection"

4. Try storing, retrieving, and verifying transaction hashes

## Troubleshooting

1. **Connection Failed**: Ensure ImmuDB server is running on the configured host and port
2. **Authentication Error**: Check username and password in environment variables
3. **Database Not Found**: The default database should exist automatically

## Next Steps

To integrate ImmuDB with your blockchain transactions:
1. Import the `getImmudbService()` function in your blockchain code
2. Store transaction hashes after successful blockchain transactions
3. Use the verification features to ensure data integrity
4. Implement automatic storage of transaction hashes in your existing transaction flows