import 'dotenv/config';

import { Contract, JsonRpcProvider, Wallet, ethers } from 'ethers';
import forestCreditArtifact from '../contracts/ForestCredit1155.json';

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

async function main() {
  const rpcUrl = process.env.BASE_RPC_URL;
  const contractAddress = process.env.FOREST_1155_CONTRACT_ADDRESS;
  const grantorPrivateKey = process.env.ANCHOR_PRIVATE_KEY;
  const minterAddress = process.env.ADMIN_WALLET_ADDRESS;

  if (!rpcUrl || !contractAddress || !grantorPrivateKey || !minterAddress) {
    throw new Error(
      'Missing required env vars. Set BASE_RPC_URL, FOREST_1155_CONTRACT_ADDRESS, ANCHOR_PRIVATE_KEY, and ADMIN_WALLET_ADDRESS.',
    );
  }

  if (!ethers.isAddress(contractAddress)) {
    throw new Error('FOREST_1155_CONTRACT_ADDRESS is not a valid address.');
  }

  if (!ethers.isAddress(minterAddress)) {
    throw new Error('ADMIN_WALLET_ADDRESS is not a valid address.');
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const grantorWallet = new Wallet(grantorPrivateKey, provider);
  const contract = new Contract(contractAddress, forestCreditArtifact.abi, grantorWallet);

  const alreadyMinter = await contract.hasRole(MINTER_ROLE, minterAddress);
  if (alreadyMinter) {
    console.log(`Account ${minterAddress} already has MINTER_ROLE on ${contractAddress}.`);
    return;
  }

  const tx = await contract.grantRole(MINTER_ROLE, minterAddress);
  const receipt = await tx.wait(1);

  console.log('MINTER_ROLE granted successfully.');
  console.log(`Contract: ${contractAddress}`);
  console.log(`Minter:   ${minterAddress}`);
  console.log(`Tx hash:  ${receipt.hash}`);
  console.log(`Block:    ${receipt.blockNumber}`);
}

main().catch((error) => {
  console.error('Failed to grant MINTER_ROLE:', error instanceof Error ? error.message : error);
  process.exit(1);
});
