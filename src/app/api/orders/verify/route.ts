import { NextRequest, NextResponse } from 'next/server';
import { orderAuditService } from '@/lib/order-audit-service';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order ID is required',
        },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        totalCredits: true,
        totalPrice: true,
        buyer: true,
        seller: true,
        paidAt: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order not found',
        },
        { status: 404 },
      );
    }

    if (!order.paidAt) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order is not completed/paid yet',
        },
        { status: 400 },
      );
    }

    const verification = await orderAuditService.verifyOrderIntegrity(order.id, {
      orderId: order.id,
      totalCredits: order.totalCredits,
      totalPrice: order.totalPrice,
      paidAt: order.paidAt,
      buyer: order.buyer,
      seller: order.seller,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      verification: {
        isValid: verification.isValid,
        storedHash: verification.storedHash,
        computedHash: verification.computedHash,
        key: verification.key,
      },
      orderData: {
        orderId: order.id,
        totalCredits: order.totalCredits,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt.toISOString(),
        status: order.status,
      },
      hashComputation: {
        formula: 'SHA256(orderId|buyer|seller|totalCredits|totalPrice|paidAtTimestamp)',
        dataString: `${order.id}|${order.buyer ?? ''}|${order.seller ?? ''}|${order.totalCredits}|${order.totalPrice}|${order.paidAt.getTime()}`,
        paidAtTimestamp: order.paidAt.getTime(),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to verify order');
  }
}
