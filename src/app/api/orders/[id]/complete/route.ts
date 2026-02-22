import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, handleRouteError } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Order is already completed' }, { status: 400 });
    }

    if (order.payments && order.payments.length > 0) {
      await prisma.payment.update({
        where: { id: order.payments[0].id },
        data: { status: 'SUCCEEDED' },
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: orderId,
        event: 'paid',
        message: `Order manually completed via admin interface`,
      },
    });

    await prisma.cartItem.deleteMany({ where: { userId: order.userId } });

    return NextResponse.json({ success: true, message: 'Order completed successfully' });
  } catch (error) {
    return handleRouteError(error, 'Failed to complete order');
  }
}
