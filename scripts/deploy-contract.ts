/**
 * Deploy the AuditAnchor contract to Base Sepolia (or mainnet).
 *
 * Usage:
 *   npx tsx scripts/deploy-contract.ts
 *
 * Prerequisites:
 *   - BASE_RPC_URL and ANCHOR_PRIVATE_KEY set in .env
 *   - Wallet funded with testnet ETH (use https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
 */
import 'dotenv/config';
import { ethers, ContractFactory } from 'ethers';
import artifact from '../contracts/AuditAnchor.json';

async function main() {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.ANCHOR_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error('Set BASE_RPC_URL and ANCHOR_PRIVATE_KEY in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);

  const network = await provider.getNetwork();
  const balance = await provider.getBalance(signer.address);

  console.log(`Network:  ${network.name} (chain ${network.chainId})`);
  console.log(`Deployer: ${signer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH`);

  if (balance === BigInt(0)) {
    console.error('Wallet has no ETH. Fund it first.');
    process.exit(1);
  }

  console.log('\nDeploying AuditAnchor...');
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  const receipt = await contract.deploymentTransaction()!.wait(2);

  const address = await contract.getAddress();
  console.log(`\n✅ AuditAnchor deployed!`);
  console.log(`   Address:  ${address}`);
  console.log(`   Tx hash:  ${receipt!.hash}`);
  console.log(`   Block:    ${receipt!.blockNumber}`);
  console.log(`\nAdd to .env:`);
  console.log(`   ANCHOR_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error('Deployment failed:', err.message);
  process.exit(1);
});
