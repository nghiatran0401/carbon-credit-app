/**
 * Deploy a smart contract artifact from /contracts to Base Sepolia (or mainnet).
 *
 * Usage:
 *   CONTRACT_NAME=AuditAnchor npx tsx scripts/deploy-contract.ts
 *   CONTRACT_NAME=ForestCredit1155 npx tsx scripts/deploy-contract.ts
 *
 * Prerequisites:
 *   - BASE_RPC_URL and ANCHOR_PRIVATE_KEY set in .env
 *   - Wallet funded with testnet ETH
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ethers, ContractFactory, InterfaceAbi } from 'ethers';

type Artifact = {
  abi: InterfaceAbi;
  bytecode: string;
};

function loadArtifact(contractName: string): Artifact {
  const artifactPath = path.resolve(process.cwd(), 'contracts', `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run npm run contract:compile first.`);
  }

  return JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as Artifact;
}

function getConstructorArgs(contractName: string): unknown[] {
  if (contractName === 'ForestCredit1155') {
    return [
      process.env.FOREST_TOKEN_NAME ?? 'Forest Carbon Credits',
      process.env.FOREST_TOKEN_SYMBOL ?? 'FCC',
      process.env.FOREST_TOKEN_BASE_URI ?? 'ipfs://forest-credits/{id}.json',
    ];
  }

  return [];
}

function validateRpcUrl(rpcUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rpcUrl);
  } catch {
    throw new Error(`BASE_RPC_URL is not a valid URL: ${rpcUrl}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`BASE_RPC_URL must use http or https. Received: ${parsed.protocol}`);
  }

  if (parsed.hostname.includes('basescan.org')) {
    throw new Error(
      'BASE_RPC_URL points to BaseScan (explorer), not a JSON-RPC node. ' +
        'Use an RPC endpoint like https://sepolia.base.org or your provider URL.',
    );
  }
}

async function assertRpcJson(provider: ethers.JsonRpcProvider) {
  try {
    await provider.send('eth_chainId', []);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `RPC endpoint is not returning valid JSON-RPC responses: ${message}. ` +
        'Check BASE_RPC_URL and ensure it is a direct JSON-RPC URL.',
    );
  }
}

async function main() {
  const contractName = process.env.CONTRACT_NAME ?? 'AuditAnchor';
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.ANCHOR_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error('Set BASE_RPC_URL and ANCHOR_PRIVATE_KEY in .env');
    process.exit(1);
  }

  validateRpcUrl(rpcUrl);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  await assertRpcJson(provider);
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

  const artifact = loadArtifact(contractName);
  const constructorArgs = getConstructorArgs(contractName);

  console.log(`\nDeploying ${contractName}...`);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...constructorArgs);
  const receipt = await contract.deploymentTransaction()!.wait(2);

  const address = await contract.getAddress();
  console.log(`\n✅ ${contractName} deployed!`);
  console.log(`   Address:  ${address}`);
  console.log(`   Tx hash:  ${receipt!.hash}`);
  console.log(`   Block:    ${receipt!.blockNumber}`);
  console.log(`\nAdd to .env:`);

  if (contractName === 'AuditAnchor') {
    console.log(`   ANCHOR_CONTRACT_ADDRESS=${address}`);
  } else if (contractName === 'ForestCredit1155') {
    console.log(`   FOREST_1155_CONTRACT_ADDRESS=${address}`);
  } else {
    console.log(`   ${contractName.toUpperCase()}_CONTRACT_ADDRESS=${address}`);
  }
}

main().catch((err) => {
  console.error('Deployment failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
