/**
 * blockchain-queue.ts
 *
 * Lightweight fire-and-forget queue for on-chain credit transfers.
 * Uses Node.js EventEmitter so no additional npm dependency is required.
 *
 * The webhook handler enqueues a job and immediately returns 200 to PayOS.
 * The handler() listener executes the blockchain transfer in the background,
 * updating Order.status and OrderHistory once the tx is mined.
 */

import 'server-only';

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { prisma } from '@/lib/prisma';
import { transferCreditsToBuyer, isBlockchainReady } from '@/services/blockchainService';

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io';
const BASE_MAINNET_EXPLORER = 'https://etherscan.io';

function getExplorerUrl(txHash: string, chainId?: number) {
  const base = chainId === 8453 ? BASE_MAINNET_EXPLORER : BASE_SEPOLIA_EXPLORER;
  return `${base}/tx/${txHash}`;
}

// ─── Job type ────────────────────────────────────────────────────────────────

export interface BlockchainTransferJob {
  orderId: number;
  buyerAddress: string;
  /** Each item must carry forestId (via carbonCredit relation) and quantity. */
  items: Array<{
    quantity: number;
    carbonCredit: { forestId: number };
  }>;
}

// ─── Internal emitter ────────────────────────────────────────────────────────

const TRANSFER_EVENT = 'bc:transfer';

// Increase limit to avoid Node "possible memory leak" warning when many
// parallel requests each register a listener.  We use a single persistent
// listener below, so this is safe.
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

// ─── Worker ──────────────────────────────────────────────────────────────────

async function processTransferJob(job: BlockchainTransferJob): Promise<void> {
  const { orderId, buyerAddress, items } = job;
  const tag = `[blockchain-queue] order=${orderId}`;

  console.log(`${tag} Starting on-chain transfer to ${buyerAddress} …`);

  if (!ethers.isAddress(buyerAddress)) {
    console.error(`${tag} Invalid buyer address "${buyerAddress}". Aborting.`);
    await prisma.orderHistory.create({
      data: {
        orderId,
        event: 'on_chain_transfer_failed',
        message: `Invalid buyer address: ${buyerAddress}`,
      },
    });
    return;
  }

  // Aggregate quantities by forestId (one tx per token type)
  const amountByForestId = new Map<number, number>();
  for (const item of items) {
    const fid = item.carbonCredit.forestId;
    amountByForestId.set(fid, (amountByForestId.get(fid) ?? 0) + item.quantity);
  }

  let lastChainId: number | undefined;
  let anyFailed = false;

  for (const [forestId, amount] of amountByForestId.entries()) {
    try {
      const tx = await transferCreditsToBuyer({ buyerAddress, forestId, amount });
      lastChainId = tx.chainId;

      const explorerUrl = getExplorerUrl(tx.txHash, tx.chainId);
      console.log(
        `${tag} Transfer confirmed: forest=${forestId} amount=${amount} tx=${tx.txHash} block=${tx.blockNumber} (${explorerUrl})`,
      );

      await prisma.orderHistory.create({
        data: {
          orderId,
          event: 'on_chain_transfer',
          message: `Transferred ${amount} forest-${forestId} credits to ${buyerAddress}. Tx: ${tx.txHash}`,
        },
      });

      // Store the latest txHash on the order (last forest wins if multiple)
      await prisma.order.update({
        where: { id: orderId },
        data: { transactionHash: tx.txHash },
      });
    } catch (err) {
      anyFailed = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${tag} Transfer failed for forest=${forestId}:`, msg);

      await prisma.orderHistory.create({
        data: {
          orderId,
          event: 'on_chain_transfer_failed',
          message: `Failed to transfer ${amount} forest-${forestId} credits to ${buyerAddress}: ${msg}`,
        },
      });
    }
  }

  // Mark order COMPLETED once all transfers have been attempted.
  // Even partial failures reach COMPLETED so the order is not stuck in
  // PROCESSING; failed items are visible via OrderHistory.
  if (!anyFailed) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });
    console.log(`${tag} All transfers done — order marked COMPLETED.`);
  } else {
    // At least one transfer failed; keep the order as COMPLETED with a note.
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });
    console.warn(
      `${tag} Some transfers failed — order marked COMPLETED with errors (see history).`,
    );
  }
}

// Register a single persistent listener on module load.
emitter.on(TRANSFER_EVENT, (job: BlockchainTransferJob) => {
  processTransferJob(job).catch((err) => {
    console.error(`[blockchain-queue] Unhandled error for order=${job.orderId}:`, err);
  });
});

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enqueue an on-chain credit transfer.
 * Returns immediately — the transfer executes in the background.
 * Safe to call from a Next.js API route handler before sending the response.
 */
export function enqueueBlockchainTransfer(job: BlockchainTransferJob): void {
  if (!isBlockchainReady()) {
    console.warn(
      `[blockchain-queue] Blockchain not configured — skipping transfer for order=${job.orderId}`,
    );
    return;
  }
  emitter.emit(TRANSFER_EVENT, job);
}
