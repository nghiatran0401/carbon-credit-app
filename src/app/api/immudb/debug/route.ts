import { NextRequest, NextResponse } from 'next/server';
import { getImmudbService } from '@/lib/immudb-service';

export async function GET() {
  const immudbService = getImmudbService();
  const logs: string[] = [];
  
  try {
    logs.push('Starting ImmuDB debug test...');
    
    // Test connection
    logs.push('1. Testing connection...');
    await immudbService.ensureConnected();
    logs.push('✓ Connected successfully');
    
    // Test connection status
    logs.push('2. Testing connection status...');
    const isConnected = await immudbService.isConnected();
    logs.push(`✓ Connection status: ${isConnected}`);
    
    // Store a test transaction
    logs.push('3. Storing test transaction...');
    const testTransaction = {
      hash: 'debug_test_' + Date.now(),
      timestamp: Date.now(),
      blockNumber: 99999,
      transactionType: 'debug_test',
      metadata: { test: true, debug: true }
    };
    
    const storeResult = await immudbService.storeTransactionHash(testTransaction);
    logs.push(`✓ Stored transaction with result: ${storeResult}`);
    
    // Try to retrieve it immediately
    logs.push('4. Retrieving the stored transaction...');
    const retrievedTx = await immudbService.getTransactionHash(testTransaction.hash);
    if (retrievedTx) {
      logs.push(`✓ Successfully retrieved transaction: ${JSON.stringify(retrievedTx)}`);
    } else {
      logs.push('✗ Could not retrieve the transaction we just stored!');
    }
    
    // Get all transactions
    logs.push('5. Getting all transactions...');
    const allTx = await immudbService.getAllTransactionHashes(50);
    logs.push(`✓ Found ${allTx.length} total transactions`);
    
    return NextResponse.json({
      success: true,
      logs,
      testTransaction,
      retrievedTransaction: retrievedTx,
      totalTransactions: allTx.length,
      allTransactions: allTx
    });
    
  } catch (error) {
    logs.push(`❌ Error: ${error}`);
    console.error('Debug test failed:', error);
    
    return NextResponse.json({
      success: false,
      logs,
      error: error.toString()
    }, { status: 500 });
  }
}