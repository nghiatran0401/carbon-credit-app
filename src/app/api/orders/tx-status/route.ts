import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const BASE_SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io';
const BASE_MAINNET_EXPLORER = 'https://etherscan.io';

function explorerUrl(txHash: string) {
  const chainId = Number(process.env.BASE_CHAIN_ID ?? 84532);
  const base = chainId === 8453 ? BASE_MAINNET_EXPLORER : BASE_SEPOLIA_EXPLORER;
  return `${base}/tx/${txHash}`;
}

/**
 * GET /api/orders/tx-status?orderCode=<n>
 *
 * Lightweight polling endpoint consumed by the success page (SWR).
 * Returns the current order status and transactionHash so the UI can transition
 * from "Processing Transaction" → "Transfer Confirmed" without a full page reload.
 *
 * No authentication is required — the orderCode itself is sufficient
 * (it is a 9-digit random number not enumerable from the UI).
 */
export async function GET(req: NextRequest) {
  const orderCode = Number(req.nextUrl.searchParams.get('orderCode'));

  if (!orderCode || isNaN(orderCode)) {
    return NextResponse.json({ error: 'orderCode is required' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: {
      id: true,
      status: true,
      transactionHash: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    transactionHash: order.transactionHash ?? null,
    explorerUrl: order.transactionHash ? explorerUrl(order.transactionHash) : null,
  });
}
