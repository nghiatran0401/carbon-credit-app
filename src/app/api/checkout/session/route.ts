export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { carbonMovementService } from '@/lib/carbon-movement-service';
import { orderAuditMiddleware } from '@/lib/order-audit-middleware';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { emailService } from '@/lib/email-service';
import { notifyOrderPaid } from '@/lib/notification-emitter';

async function runBestEffortSideEffects(orderId: number) {
  try {
    await orderAuditMiddleware.ensureOrderAudit(orderId);
  } catch (err) {
    console.error(`Failed to create audit trail for order ${orderId}:`, err);
  }
  try {
    await carbonMovementService.trackOrderMovement(orderId);
  } catch (err) {
    console.error(`Failed to track movement for order ${orderId}:`, err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const orderCodeParam = req.nextUrl.searchParams.get('orderCode');
    if (!orderCodeParam) {
      return NextResponse.json({ error: 'Missing orderCode' }, { status: 400 });
    }

    const orderCode = Number(orderCodeParam);
    if (isNaN(orderCode)) {
      return NextResponse.json({ error: 'Invalid orderCode' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { orderCode },
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

    if (payment.order.userId !== auth.id && auth.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payment.order.status === 'PENDING' && payment.status === 'PENDING') {
      const paidAt = new Date();

      await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: { id: payment.order.id },
          select: { status: true },
        });

        if (currentOrder?.status !== 'PENDING') {
          return;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidAt },
        });

        await tx.order.update({
          where: { id: payment.order.id },
          data: { status: 'COMPLETED', paidAt },
        });

        await tx.orderHistory.create({
          data: {
            orderId: payment.order.id,
            event: 'paid',
            message: `Order completed via success page for orderCode ${orderCode}`,
          },
        });

        await tx.cartItem.deleteMany({ where: { userId: payment.order.userId } });
      });

      await runBestEffortSideEffects(payment.order.id);

      try {
        await notifyOrderPaid(payment.order.userId, payment.order.id, orderCode);
      } catch (notificationError) {
        console.error('Failed to create checkout-session notification:', notificationError);
      }

      if (emailService.isEnabled()) {
        try {
          const fullOrder = await prisma.order.findUnique({
            where: { id: payment.order.id },
            include: {
              user: true,
              items: {
                include: {
                  carbonCredit: { include: { forest: { select: { name: true } } } },
                },
              },
            },
          });

          if (fullOrder?.user) {
            const userName = `${fullOrder.user.firstName} ${fullOrder.user.lastName}`.trim();
            await emailService.sendOrderConfirmation({
              userName,
              userEmail: fullOrder.user.email,
              orderId: fullOrder.id,
              orderCode: fullOrder.orderCode,
              totalPrice: fullOrder.totalPrice,
              items: fullOrder.items.map((item) => ({
                certification: item.carbonCredit?.certification ?? '',
                vintage: item.carbonCredit?.vintage ?? 0,
                quantity: item.quantity,
                pricePerCredit: item.pricePerCredit,
                subtotal: item.subtotal,
                forestName: item.carbonCredit?.forest?.name,
              })),
            });
          }
        } catch (emailErr) {
          console.error(`Failed to send order email for order ${payment.order.id}:`, emailErr);
        }
      }

      const updatedPayment = await prisma.payment.findFirst({
        where: { orderCode },
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

    if (payment.order.status === 'COMPLETED') {
      await runBestEffortSideEffects(payment.order.id);
    }

    return NextResponse.json({
      payment,
      order: payment.order,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch checkout session');
  }
}
