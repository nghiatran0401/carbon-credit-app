import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { notifyOrderCancelled } from '@/lib/notification-emitter';

export const dynamic = 'force-dynamic';

/**
 * PayOS Cancel URL Handler
 * User is redirected here when they cancel payment on PayOS.
 * Cancels the pending order and redirects to the cart.
 */
export async function GET(request: NextRequest) {
  try {
    const orderCodeParam = request.nextUrl.searchParams.get('orderCode');

    if (!orderCodeParam) {
      return NextResponse.redirect(new URL('/cart', env.NEXT_PUBLIC_BASE_URL));
    }

    const orderCode = Number(orderCodeParam);
    if (isNaN(orderCode)) {
      return NextResponse.redirect(new URL('/cart', env.NEXT_PUBLIC_BASE_URL));
    }

    try {
      const order = await prisma.order.findUnique({
        where: { orderCode },
        select: { id: true, userId: true, status: true, orderCode: true },
      });

      if (order && order.status === 'PENDING') {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { orderCode },
            data: { status: 'CANCELLED' },
          });

          await tx.payment.updateMany({
            where: { orderCode },
            data: { status: 'CANCELLED' },
          });
        });

        try {
          await notifyOrderCancelled(order.userId, order.id, order.orderCode);
        } catch (notificationError) {
          console.error('Failed to create order cancelled notification:', notificationError);
        }
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }

    return NextResponse.redirect(new URL('/cart', env.NEXT_PUBLIC_BASE_URL));
  } catch (error) {
    console.error('Error in PayOS cancel URL handler:', error);
    return NextResponse.redirect(new URL('/cart', env.NEXT_PUBLIC_BASE_URL));
  }
}
