// WARNING: TEST SCRIPT FOR BLOCKCHAIN INTEGRATION - DEVELOPMENT ONLY
// TODO: Remove this file after testing is complete

import { blockchainService } from './src/lib/blockchain-service';

async function testBlockchainIntegration() {
  console.log('🚀 Testing blockchain integration...');
  
  try {
    // Initialize the blockchain service
    await blockchainService.initialize();
    console.log('✅ Blockchain service initialized');
    
    // Check owner balance before transfer
    const ownerAddress = '0xa7056Ec448312deC710f8f206fC2377f3021aFf2'; // First Ganache account
    const buyerAddress = '0xB70e41919524b5b58aEC11975B40eC6a198541d2'; // Hardcoded buyer
    
    console.log('\n📊 Checking balances before transfer...');
    const ownerBalanceBefore = await blockchainService.getTokenBalance(ownerAddress);
    const buyerBalanceBefore = await blockchainService.getTokenBalance(buyerAddress);
    
    console.log(`Owner balance: ${ownerBalanceBefore} CCT`);
    console.log(`Buyer balance: ${buyerBalanceBefore} CCT`);
    
    // Test token transfer (5 credits = 5 tokens)
    console.log('\n💸 Transferring 5 tokens to buyer...');
    const txHash = await blockchainService.transferTokensToBuyer(5);
    console.log(`✅ Transfer successful! TX Hash: ${txHash}`);
    
    // Check balances after transfer
    console.log('\n📊 Checking balances after transfer...');
    const ownerBalanceAfter = await blockchainService.getTokenBalance(ownerAddress);
    const buyerBalanceAfter = await blockchainService.getTokenBalance(buyerAddress);
    
    console.log(`Owner balance: ${ownerBalanceAfter} CCT`);
    console.log(`Buyer balance: ${buyerBalanceAfter} CCT`);
    
    console.log('\n🎉 Blockchain integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Blockchain integration test failed:', error);
  }
}

// Run the test
testBlockchainIntegration();