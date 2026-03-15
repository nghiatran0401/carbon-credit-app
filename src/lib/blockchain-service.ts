import { ethers, ContractFactory, Contract, JsonRpcProvider, Wallet } from 'ethers';
import { prisma } from './prisma';
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from './merkle-service';
import contractArtifact from '../../contracts/AuditAnchor.json';

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_MAINNET_CHAIN_ID = 8453;

const EXPLORER_URLS: Record<number, string> = {
  [BASE_SEPOLIA_CHAIN_ID]: 'https://sepolia.basescan.org',
  [BASE_MAINNET_CHAIN_ID]: 'https://basescan.org',
};

function getConfig() {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.ANCHOR_PRIVATE_KEY;
  const contractAddress = process.env.ANCHOR_CONTRACT_ADDRESS;
  const chainId = parseInt(process.env.BASE_CHAIN_ID || String(BASE_SEPOLIA_CHAIN_ID));

  if (!rpcUrl || !privateKey) {
    throw new Error('BASE_RPC_URL and ANCHOR_PRIVATE_KEY must be set');
  }

  return { rpcUrl, privateKey, contractAddress, chainId };
}

function getProvider(): JsonRpcProvider {
  const { rpcUrl } = getConfig();
  return new JsonRpcProvider(rpcUrl);
}

function getSigner(): Wallet {
  const { privateKey } = getConfig();
  return new Wallet(privateKey, getProvider());
}

function getContract(): Contract {
  const { contractAddress } = getConfig();
  if (!contractAddress) {
    throw new Error('ANCHOR_CONTRACT_ADDRESS must be set. Deploy the contract first.');
  }
  return new Contract(contractAddress, contractArtifact.abi, getSigner());
}

/**
 * Deploy the AuditAnchor contract to the configured chain.
 * Returns the deployed contract address.
 */
export async function deployContract(): Promise<{
  address: string;
  txHash: string;
  chainId: number;
}> {
  const signer = getSigner();
  const { chainId } = getConfig();

  const factory = new ContractFactory(contractArtifact.abi, contractArtifact.bytecode, signer);

  console.log(`Deploying AuditAnchor to chain ${chainId}...`);
  const contract = await factory.deploy();
  const receipt = await contract.deploymentTransaction()!.wait(2);

  const address = await contract.getAddress();
  console.log(`AuditAnchor deployed at ${address} (tx: ${receipt!.hash})`);

  return { address, txHash: receipt!.hash, chainId };
}

/**
 * Anchor the current ImmuDB audit state on-chain.
 * Builds a Merkle tree from all audits, publishes the root to Base,
 * and stores the record in Postgres.
 */
export async function anchorAudits(): Promise<{
  merkleRoot: string;
  txHash: string;
  blockNumber: number;
  auditCount: number;
  orderIds: number[];
  explorerUrl: string;
  anchorId: number;
}> {
  const treeResult = await buildMerkleTree();
  if (!treeResult) {
    throw new Error('No audit records found in ImmuDB to anchor');
  }

  const { root, leaves, leafCount } = treeResult;
  const orderIds = leaves.map((l) => l.orderId);
  const { chainId } = getConfig();

  // Check if this root was already anchored
  const existing = await prisma.blockchainAnchor.findFirst({
    where: { merkleRoot: root, status: 'CONFIRMED' },
  });
  if (existing) {
    const explorerUrl = `${EXPLORER_URLS[chainId] || EXPLORER_URLS[BASE_SEPOLIA_CHAIN_ID]}/tx/${existing.txHash}`;
    return {
      merkleRoot: root,
      txHash: existing.txHash!,
      blockNumber: existing.blockNumber!,
      auditCount: existing.auditCount,
      orderIds: existing.orderIds,
      explorerUrl,
      anchorId: existing.id,
    };
  }

  // Create a pending record first
  const anchorRecord = await prisma.blockchainAnchor.create({
    data: {
      merkleRoot: root,
      chainId,
      auditCount: leafCount,
      orderIds,
      status: 'PENDING',
    },
  });

  try {
    const contract = getContract();

    // The OZ Merkle root is already a 0x-prefixed 32-byte hex string (bytes32)
    const tx = await contract.anchor(root, leafCount);
    console.log(`Anchor tx submitted: ${tx.hash}`);

    const receipt = await tx.wait(2);

    await prisma.blockchainAnchor.update({
      where: { id: anchorRecord.id },
      data: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    const explorerUrl = `${EXPLORER_URLS[chainId] || EXPLORER_URLS[BASE_SEPOLIA_CHAIN_ID]}/tx/${receipt.hash}`;

    console.log(`Anchor confirmed at block ${receipt.blockNumber}. Explorer: ${explorerUrl}`);

    return {
      merkleRoot: root,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      auditCount: leafCount,
      orderIds,
      explorerUrl,
      anchorId: anchorRecord.id,
    };
  } catch (error) {
    await prisma.blockchainAnchor.update({
      where: { id: anchorRecord.id },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}

/**
 * Generate a verification bundle for a specific order.
 * Includes the Merkle proof and on-chain anchor details.
 */
export async function getOrderVerification(orderId: number, auditHash: string) {
  if (!prisma.blockchainAnchor) return null;

  const anchor = await prisma.blockchainAnchor.findFirst({
    where: {
      status: 'CONFIRMED',
      orderIds: { has: orderId },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!anchor) {
    return null;
  }

  // Rebuild the tree to generate the proof
  const treeResult = await buildMerkleTree();
  if (!treeResult) return null;

  const proof = getMerkleProof(treeResult.tree, orderId, auditHash);
  if (!proof) return null;

  const { chainId } = getConfig();
  const explorerUrl = `${EXPLORER_URLS[chainId] || EXPLORER_URLS[BASE_SEPOLIA_CHAIN_ID]}/tx/${anchor.txHash}`;

  return {
    anchored: true,
    anchor: {
      id: anchor.id,
      merkleRoot: anchor.merkleRoot,
      txHash: anchor.txHash,
      blockNumber: anchor.blockNumber,
      chainId: anchor.chainId,
      auditCount: anchor.auditCount,
      confirmedAt: anchor.confirmedAt,
      explorerUrl,
    },
    proof: {
      orderId,
      auditHash,
      merkleProof: proof.proof,
      leafIndex: proof.leafIndex,
      verified: proof.verified,
    },
  };
}

/**
 * Verify a Merkle proof against an on-chain root.
 * This is a pure function — can be called by anyone without chain access.
 */
export function verifyOrderProof(
  merkleRoot: string,
  orderId: number,
  auditHash: string,
  proof: string[],
): boolean {
  return verifyMerkleProof(merkleRoot, orderId, auditHash, proof);
}

/**
 * Read the latest anchor from the on-chain contract.
 */
export async function getLatestOnChainAnchor(): Promise<{
  merkleRoot: string;
  timestamp: number;
  auditCount: number;
} | null> {
  try {
    const contract = getContract();
    const [root, timestamp, count] = await contract.getLatestAnchor();
    return {
      merkleRoot: root,
      timestamp: Number(timestamp),
      auditCount: Number(count),
    };
  } catch {
    return null;
  }
}

/**
 * Get all anchors stored in the database.
 */
export async function getAllAnchors() {
  if (!prisma.blockchainAnchor) return [];
  return prisma.blockchainAnchor.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get wallet balance for the anchoring wallet.
 */
export async function getWalletInfo() {
  try {
    const signer = getSigner();
    const address = await signer.getAddress();
    const balance = await getProvider().getBalance(address);
    const { chainId } = getConfig();

    return {
      address,
      balance: ethers.formatEther(balance),
      chainId,
      network: chainId === BASE_MAINNET_CHAIN_ID ? 'Base Mainnet' : 'Base Sepolia',
    };
  } catch {
    return null;
  }
}
