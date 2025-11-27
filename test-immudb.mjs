// Test script to debug ImmuDB storage
import { getImmudbService } from './src/lib/immudb-service.ts';

async function testImmuDB() {
  console.log('Starting ImmuDB test...');
  
  const immudbService = getImmudbService();
  
  try {
    console.log('1. Testing connection...');
    await immudbService.ensureConnected();
    console.log('✓ Connected successfully');
    
    console.log('2. Testing isConnected...');
    const isConnected = await immudbService.isConnected();
    console.log(`✓ Connection status: ${isConnected}`);
    
    console.log('3. Storing test transaction...');
    const testTransaction = {
      hash: 'test_hash_' + Date.now(),
      timestamp: Date.now(),
      blockNumber: 12345,
      transactionType: 'test_transaction',
      metadata: { test: true, amount: 100 }
    };
    
    const result = await immudbService.storeTransactionHash(testTransaction);
    console.log(`✓ Stored transaction with result: ${result}`);
    
    console.log('4. Retrieving all transactions...');
    const allTransactions = await immudbService.getAllTransactionHashes(10);
    console.log(`✓ Found ${allTransactions.length} transactions:`);
    allTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.hash} (${tx.transactionType})`);
    });
    
    console.log('5. Retrieving specific transaction...');
    const specificTx = await immudbService.getTransactionHash(testTransaction.hash);
    if (specificTx) {
      console.log('✓ Found specific transaction:', specificTx);
    } else {
      console.log('✗ Could not find the transaction we just stored!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testImmuDB().catch(console.error);