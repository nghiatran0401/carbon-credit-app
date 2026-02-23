import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getImmudbService } from '@/lib/immudb-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderIdParam = searchParams.get('orderId');

  if (!orderIdParam) {
    return NextResponse.json(
      { success: false, message: 'Order ID is required as a query parameter' },
      { status: 400 },
    );
  }

  const orderId = parseInt(orderIdParam);
  if (isNaN(orderId)) {
    return NextResponse.json(
      { success: false, message: 'Order ID must be a valid number' },
      { status: 400 },
    );
  }

  try {
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
      logger.error('ImmuDB lookup failed during public verification', { error });
      immudbStatus = 'unavailable';
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      verification: {
        immudbStatus,
        isValid: immudbVerified,
        computedHash,
        storedHash,
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
    logger.error('Public verification failed', { error });
    return NextResponse.json(
      { success: false, message: 'Verification service temporarily unavailable' },
      { status: 500 },
    );
  }
}
