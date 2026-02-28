import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getImmudbService } from '@/lib/immudb-service';
import { getOrderVerification, verifyOrderProof } from '@/lib/blockchain-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderIdParam = searchParams.get('orderId');
  const hashParamRaw = searchParams.get('hash')?.trim().toLowerCase();
  const isValidSha256 = (value: string) => /^[a-f0-9]{64}$/.test(value);

  if (!orderIdParam && !hashParamRaw) {
    return NextResponse.json(
      { success: false, message: 'Provide either orderId or hash as a query parameter' },
      { status: 400 },
    );
  }

  let orderId: number | null = null;
  let requestedHash: string | null = null;

  if (orderIdParam) {
    const parsedOrderId = parseInt(orderIdParam);
    if (isNaN(parsedOrderId)) {
      return NextResponse.json(
        { success: false, message: 'Order ID must be a valid number' },
        { status: 400 },
      );
    }
    orderId = parsedOrderId;
  } else if (hashParamRaw) {
    if (!isValidSha256(hashParamRaw)) {
      return NextResponse.json(
        { success: false, message: 'Hash must be a valid 64-character SHA-256 hex string' },
        { status: 400 },
      );
    }
    requestedHash = hashParamRaw;
  }

  try {
    if (!orderId && requestedHash) {
      try {
        const immudbService = getImmudbService();
        const allTransactions = await immudbService.getAllTransactionHashes(2500);
        const matched = allTransactions.find(
          (tx) =>
            tx.transactionType === 'order_audit' &&
            String(tx.metadata?.computedHash ?? '').toLowerCase() === requestedHash,
        );

        if (!matched?.metadata?.orderId) {
          return NextResponse.json(
            { success: false, message: 'No order found for this SHA-256 hash' },
            { status: 404 },
          );
        }

        orderId = Number(matched.metadata.orderId);
      } catch (error) {
        console.error('Hash lookup failed in ImmuDB', error);
        return NextResponse.json(
          { success: false, message: 'Unable to lookup hash in immutable ledger right now' },
          { status: 503 },
        );
      }
    }

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Could not resolve order ID' },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalCredits: true,
        totalPrice: true,
        paidAt: true,
        buyer: true,
        seller: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (!order.paidAt) {
      return NextResponse.json(
        { success: false, message: 'Order is not completed yet' },
        { status: 400 },
      );
    }

    const buyerStr = order.buyer ?? '';
    const sellerStr = order.seller ?? '';
    const paidAtTimestamp = order.paidAt.getTime();
    const dataString = `${order.id}|${buyerStr}|${sellerStr}|${order.totalCredits}|${order.totalPrice}|${paidAtTimestamp}`;
    const computedHash = crypto.createHash('sha256').update(dataString).digest('hex');

    // Layer 1: ImmuDB verification
    let storedHash: string | null = null;
    let immudbVerified = false;
    let immudbStatus: 'verified' | 'mismatch' | 'not_found' | 'unavailable' = 'unavailable';

    try {
      const immudbService = getImmudbService();
      const key = `order_${orderId}`;
      const storedRecord = await immudbService.getTransactionHash(key);

      if (storedRecord?.metadata?.computedHash) {
        storedHash = storedRecord.metadata.computedHash;
        immudbVerified = storedHash === computedHash;
        immudbStatus = immudbVerified ? 'verified' : 'mismatch';
      } else {
        immudbStatus = 'not_found';
      }
    } catch (error) {
      console.error('ImmuDB lookup failed during public verification', error);
      immudbStatus = 'unavailable';
    }

    // Layer 2: Base blockchain verification (Merkle proof against on-chain root)
    let blockchain: {
      status: 'anchored' | 'not_anchored' | 'unavailable';
      txHash?: string | null;
      blockNumber?: number | null;
      chainId?: number;
      explorerUrl?: string;
      merkleRoot?: string;
      merkleProof?: string[];
      proofValid?: boolean;
    } = { status: 'unavailable' };

    try {
      const hashForProof = storedHash || computedHash;
      if (hashForProof) {
        const onChainResult = await getOrderVerification(orderId, hashForProof);
        if (onChainResult) {
          const proofValid = verifyOrderProof(
            onChainResult.anchor.merkleRoot,
            orderId,
            hashForProof,
            onChainResult.proof.merkleProof,
          );
          blockchain = {
            status: 'anchored',
            txHash: onChainResult.anchor.txHash,
            blockNumber: onChainResult.anchor.blockNumber,
            chainId: onChainResult.anchor.chainId,
            explorerUrl: onChainResult.anchor.explorerUrl,
            merkleRoot: onChainResult.anchor.merkleRoot,
            merkleProof: onChainResult.proof.merkleProof,
            proofValid,
          };
        } else {
          blockchain = { status: 'not_anchored' };
        }
      }
    } catch (error) {
      console.error('Blockchain verification failed', error);
      blockchain = { status: 'unavailable' };
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      requestedHash,
      verification: {
        immudb: {
          status: immudbStatus,
          isValid: immudbVerified,
          computedHash,
          storedHash,
        },
        blockchain,
      },
      orderSummary: {
        totalCredits: order.totalCredits,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt.toISOString(),
      },
      hashComputation: {
        algorithm: 'SHA-256',
        formula: 'SHA256(orderId | buyer | seller | totalCredits | totalPrice | paidAtTimestamp)',
        dataString,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Public verification failed', error);
    return NextResponse.json(
      { success: false, message: 'Verification service temporarily unavailable' },
      { status: 500 },
    );
  }
}
