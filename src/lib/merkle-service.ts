import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { getImmudbService } from './immudb-service';

export interface MerkleLeaf {
  orderId: number;
  auditHash: string;
}

export interface MerkleTreeResult {
  root: string;
  tree: StandardMerkleTree<[number, string]>;
  leaves: MerkleLeaf[];
  leafCount: number;
}

export interface MerkleProofResult {
  orderId: number;
  auditHash: string;
  proof: string[];
  root: string;
  leafIndex: number;
  verified: boolean;
}

/**
 * Build a Merkle tree from all order audit hashes stored in ImmuDB.
 * Each leaf is [orderId, sha256Hash] encoded as ABI values.
 */
export async function buildMerkleTree(): Promise<MerkleTreeResult | null> {
  const immudbService = getImmudbService();
  const allTransactions = await immudbService.getAllTransactionHashes(2500);

  const audits = allTransactions.filter((tx) => tx.transactionType === 'order_audit');

  if (audits.length === 0) {
    return null;
  }

  const leaves: MerkleLeaf[] = audits.map((tx) => ({
    orderId: tx.metadata?.orderId ?? 0,
    auditHash: tx.metadata?.computedHash ?? '',
  }));

  // Sort by orderId for deterministic tree construction
  leaves.sort((a, b) => a.orderId - b.orderId);

  const values: [number, string][] = leaves.map((leaf) => [leaf.orderId, leaf.auditHash]);

  const tree = StandardMerkleTree.of(values, ['uint256', 'string']);

  return {
    root: tree.root,
    tree,
    leaves,
    leafCount: leaves.length,
  };
}

/**
 * Generate a Merkle proof for a specific order.
 * Returns the proof that can be verified against the on-chain root.
 */
export function getMerkleProof(
  tree: StandardMerkleTree<[number, string]>,
  orderId: number,
  auditHash: string,
): MerkleProofResult | null {
  for (const [i, v] of tree.entries()) {
    if (v[0] === orderId && v[1] === auditHash) {
      const proof = tree.getProof(i);
      return {
        orderId,
        auditHash,
        proof,
        root: tree.root,
        leafIndex: i,
        verified: true,
      };
    }
  }
  return null;
}

/**
 * Verify a Merkle proof against a known root.
 */
export function verifyMerkleProof(
  root: string,
  orderId: number,
  auditHash: string,
  proof: string[],
): boolean {
  try {
    return StandardMerkleTree.verify(root, ['uint256', 'string'], [orderId, auditHash], proof);
  } catch {
    return false;
  }
}

/**
 * Dump tree to JSON for storage/reconstruction.
 */
export function exportTree(tree: StandardMerkleTree<[number, string]>): string {
  return JSON.stringify(tree.dump());
}

/**
 * Restore tree from a JSON dump.
 */
export function importTree(dump: string): StandardMerkleTree<[number, string]> {
  return StandardMerkleTree.load(JSON.parse(dump));
}
