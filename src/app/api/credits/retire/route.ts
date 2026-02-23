import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { emailService } from '@/lib/email-service';
import { z } from 'zod';
import { validateBody, isValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const retireSchema = z.object({
  orderItemId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(retireSchema, body);
    if (isValidationError(validated)) return validated;

    const { orderItemId, quantity } = validated;

    const result = await prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: {
          order: { select: { userId: true, status: true } },
          carbonCredit: { select: { id: true, retiredCredits: true } },
        },
      });

      if (!orderItem) {
        return { error: 'Order item not found', status: 404 };
      }

      if (orderItem.order.userId !== auth.id) {
        return { error: 'Forbidden', status: 403 };
      }

      if (orderItem.order.status !== 'COMPLETED') {
        return { error: 'Only completed orders can be retired', status: 400 };
      }

      const alreadyRetired = orderItem.retired ? orderItem.quantity : 0;
      const available = orderItem.quantity - alreadyRetired;

      if (quantity > available) {
        return {
          error: `Cannot retire ${quantity} credits. Only ${available} available for retirement.`,
          status: 400,
        };
      }

      if (quantity === orderItem.quantity) {
        await tx.orderItem.update({
          where: { id: orderItemId },
          data: { retired: true },
        });
      }

      await tx.carbonCredit.update({
        where: { id: orderItem.carbonCredit.id },
        data: {
          retiredCredits: { increment: quantity },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: orderItem.orderId,
          event: 'CREDITS_RETIRED',
          message: `${quantity} credits retired from order item #${orderItemId}`,
        },
      });

      return {
        data: {
          orderItemId,
          retiredQuantity: quantity,
          totalRetired: alreadyRetired + quantity,
          remaining: available - quantity,
        },
        status: 200,
      };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (emailService.isEnabled()) {
      try {
        const user = await prisma.user.findUnique({ where: { id: auth.id } });
        const orderItem = await prisma.orderItem.findUnique({
          where: { id: orderItemId },
          include: {
            carbonCredit: {
              select: {
                certification: true,
                vintage: true,
                forest: { select: { name: true } },
              },
            },
          },
        });

        if (user && orderItem?.carbonCredit) {
          await emailService.sendCreditsRetired({
            userName: `${user.firstName} ${user.lastName}`.trim(),
            userEmail: user.email,
            quantity,
            certification: orderItem.carbonCredit.certification,
            vintage: orderItem.carbonCredit.vintage,
            forestName: orderItem.carbonCredit.forest?.name ?? 'Forest',
          });
        }
      } catch (emailErr) {
        console.error('Failed to send retirement email:', emailErr);
      }
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleRouteError(error, 'Failed to retire credits');
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const retiredItems = await prisma.orderItem.findMany({
      where: {
        retired: true,
        order: { userId: auth.id, status: 'COMPLETED' },
      },
      include: {
        carbonCredit: {
          select: {
            certification: true,
            vintage: true,
            symbol: true,
            forest: { select: { name: true, location: true } },
          },
        },
        order: { select: { id: true, orderCode: true, paidAt: true } },
      },
      orderBy: { order: { paidAt: 'desc' } },
    });

    const totalRetired = retiredItems.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({
      items: retiredItems,
      totalRetired,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch retired credits');
  }
}
