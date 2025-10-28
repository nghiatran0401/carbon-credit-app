import ImmudbClient from 'immudb-node';

export interface TransactionHash {
  hash: string;
  timestamp: number;
  blockNumber?: number;
  transactionType: string;
  metadata?: Record<string, any>;
}

export interface ImmudbConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

class ImmudbService {
  private client: ImmudbClient | null = null;
  private config: ImmudbConfig;
  private isConnecting: boolean = false;

  constructor(config: ImmudbConfig) {
    this.config = config;
  }

  async ensureConnected(): Promise<void> {
    if (this.client && await this.isConnected()) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    await this.connect();
  }

  async connect(): Promise<void> {
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    
    try {
      this.client = new ImmudbClient({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        autoLogin: true,
        autoDatabase: true,
      });

      await this.client.initClient(
        this.config.username,
        this.config.password,
        this.config.database,
        true,
        true
      );
      
      console.log('Successfully connected to immudb');
    } catch (error) {
      console.error('Failed to connect to immudb:', error);
      this.client = null;
      throw new Error(`ImmuDB connection failed: ${error}`);
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.shutdown();
      } catch (error) {
        console.warn('Error during disconnect:', error);
      }
      this.client = null;
      console.log('Disconnected from immudb');
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      // Try a simple operation to check connection
      await this.client.currentState();
      return true;
    } catch (error) {
      console.error('ImmuDB connection check failed:', error);
      return false;
    }
  }

  async storeTransactionHash(transactionHash: TransactionHash): Promise<string> {
    await this.ensureConnected();
    
    if (!this.client) {
      throw new Error('ImmuDB client not available.');
    }

    try {
      const key = `tx_${transactionHash.hash}`;
      const value = JSON.stringify({
        hash: transactionHash.hash,
        timestamp: transactionHash.timestamp,
        blockNumber: transactionHash.blockNumber,
        transactionType: transactionHash.transactionType,
        metadata: transactionHash.metadata,
      });

      const result = await this.client.set({ key, value });
      console.log(`Transaction hash stored with ID: ${result?.id || 'unknown'}`);
      return result?.id?.toString() || 'stored';
    } catch (error) {
      console.error('Failed to store transaction hash:', error);
      throw new Error(`Failed to store transaction hash: ${error}`);
    }
  }

  async getTransactionHash(hash: string): Promise<TransactionHash | null> {
    await this.ensureConnected();
    
    if (!this.client) {
      throw new Error('ImmuDB client not available.');
    }

    try {
      const key = `tx_${hash}`;
      const result = await this.client.get({ key });
      
      if (result && result.value) {
        // The value might be a Uint8Array, so we need to convert it to string
        const valueStr = typeof result.value === 'string' 
          ? result.value 
          : new TextDecoder().decode(result.value as Uint8Array);
        
        const data = JSON.parse(valueStr);
        return {
          hash: data.hash,
          timestamp: data.timestamp,
          blockNumber: data.blockNumber,
          transactionType: data.transactionType,
          metadata: data.metadata,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get transaction hash:', error);
      if (error instanceof Error && error.toString().includes('key not found')) {
        return null;
      }
      throw new Error(`Failed to get transaction hash: ${error}`);
    }
  }

  async getAllTransactionHashes(limit: number = 100): Promise<TransactionHash[]> {
    await this.ensureConnected();
    
    if (!this.client) {
      throw new Error('ImmuDB client not available.');
    }

    try {
      // Use scan to get all keys with prefix 'tx_'
      const result = await this.client.scan({
        prefix: 'tx_',
        limit,
      });

      const transactions: TransactionHash[] = [];
      
      if (result && result.entriesList) {
        for (const entry of result.entriesList) {
          try {
            // The value might be a Uint8Array, so we need to convert it to string
            const valueStr = typeof entry.value === 'string' 
              ? entry.value 
              : new TextDecoder().decode(entry.value as Uint8Array);
            
            const data = JSON.parse(valueStr);
            transactions.push({
              hash: data.hash,
              timestamp: data.timestamp,
              blockNumber: data.blockNumber,
              transactionType: data.transactionType,
              metadata: data.metadata,
            });
          } catch (parseError) {
            console.warn('Failed to parse transaction entry:', parseError);
          }
        }
      }

      return transactions;
    } catch (error) {
      console.error('Failed to get all transaction hashes:', error);
      throw new Error(`Failed to get all transaction hashes: ${error}`);
    }
  }

  async verifyTransactionHash(hash: string): Promise<boolean> {
    await this.ensureConnected();
    
    if (!this.client) {
      throw new Error('ImmuDB client not available.');
    }

    try {
      const key = `tx_${hash}`;
      const result = await this.client.verifiedGet({ key });
      return result !== null && result !== undefined;
    } catch (error) {
      console.error('Failed to verify transaction hash:', error);
      return false;
    }
  }

  async getHistory(hash: string): Promise<any[]> {
    await this.ensureConnected();
    
    if (!this.client) {
      throw new Error('ImmuDB client not available.');
    }

    try {
      const key = `tx_${hash}`;
      const result = await this.client.history({ key });
      return result?.entriesList || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw new Error(`Failed to get transaction history: ${error}`);
    }
  }
}

// Singleton instance
let immudbServiceInstance: ImmudbService | null = null;

export function getImmudbService(): ImmudbService {
  if (!immudbServiceInstance) {
    const config: ImmudbConfig = {
      host: process.env.IMMUDB_HOST || 'localhost',
      port: parseInt(process.env.IMMUDB_PORT || '3322'),
      username: process.env.IMMUDB_USERNAME || 'immudb',
      password: process.env.IMMUDB_PASSWORD || 'immudb',
      database: process.env.IMMUDB_DATABASE || 'defaultdb',
    };
    
    immudbServiceInstance = new ImmudbService(config);
  }
  
  return immudbServiceInstance;
}

export default ImmudbService;