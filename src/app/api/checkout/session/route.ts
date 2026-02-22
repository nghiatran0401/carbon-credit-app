export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { carbonMovementService } from '@/lib/carbon-movement-service';
import { orderAuditMiddleware } from '@/lib/order-audit-middleware';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { stripeSessionId: sessionId },
      include: {
        order: {
          include: {
            items: true,
            orderHistory: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.order.status === 'PENDING' && payment.status === 'PENDING') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED' },
      });

      await prisma.order.update({
        where: { id: payment.order.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      await prisma.orderHistory.create({
        data: {
          orderId: payment.order.id,
          event: 'paid',
          message: `Order completed via success page for session ${sessionId}`,
        },
      });

      await prisma.cartItem.deleteMany({ where: { userId: payment.order.userId } });

      try {
        await orderAuditMiddleware.ensureOrderAudit(payment.order.id);
      } catch (auditError) {
        console.error(`Failed to create audit trail for order ${payment.order.id}:`, auditError);
      }

      try {
        await carbonMovementService.trackOrderMovement(payment.order.id);
      } catch (movementError) {
        console.error(`Failed to track movement for order ${payment.order.id}:`, movementError);
      }

      const updatedPayment = await prisma.payment.findFirst({
        where: { stripeSessionId: sessionId },
        include: {
          order: {
            include: {
              items: true,
              orderHistory: true,
            },
          },
        },
      });

      return NextResponse.json({
        payment: updatedPayment,
        order: updatedPayment?.order,
      });
    }

    return NextResponse.json({
      payment,
      order: payment.order,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch checkout session');
  }
}
