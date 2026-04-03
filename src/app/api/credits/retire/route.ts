import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { emailService } from '@/lib/email-service';
import { z } from 'zod';
import { validateBody, isValidationError } from '@/lib/validation';
import { notifyCreditsRetired } from '@/lib/notification-emitter';
import { isBlockchainReady, retireForestTokens } from '@/services/blockchainService';

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

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { userId: true, status: true } },
        carbonCredit: { select: { id: true, forestId: true, onChainId: true } },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    if (orderItem.order.userId !== auth.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (orderItem.order.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Only completed orders can be retired' }, { status: 400 });
    }

    const alreadyRetired = orderItem.retired ? orderItem.quantity : 0;
    const available = orderItem.quantity - alreadyRetired;

    if (quantity > available) {
      return NextResponse.json(
        {
          error: `Cannot retire ${quantity} credits. Only ${available} available for retirement.`,
        },
        { status: 400 },
      );
    }

    const blockchainEnabled = isBlockchainReady();

    // When blockchain is enabled, validate wallet address and compute on-chain token ID.
    let user: { walletAddress: string | null } | null = null;
    let onChainTokenId: number | null = null;

    if (blockchainEnabled) {
      user = await prisma.user.findUnique({
        where: { id: auth.id },
        select: { walletAddress: true },
      });

      if (!user?.walletAddress) {
        return NextResponse.json(
          {
            error: 'Your account does not have a walletAddress for on-chain retirement.',
          },
          { status: 400 },
        );
      }

      onChainTokenId = Number(orderItem.carbonCredit.onChainId ?? orderItem.carbonCredit.forestId);
      if (!Number.isInteger(onChainTokenId) || onChainTokenId <= 0) {
        return NextResponse.json(
          {
            error: `Invalid on-chain token id for carbon credit ${orderItem.carbonCredit.id}.`,
          },
          { status: 400 },
        );
      }
    } else {
      console.warn(
        `[credits/retire] Blockchain not configured — retiring ${quantity} credits for order item ${orderItemId} in DB only (no on-chain burn).`,
      );
    }

    const retireTx =
      blockchainEnabled && user?.walletAddress && onChainTokenId
        ? await retireForestTokens({
            fromAddress: user.walletAddress,
            forestId: onChainTokenId,
            amount: quantity,
          })
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const currentOrderItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: {
          order: { select: { userId: true, status: true } },
          carbonCredit: { select: { id: true, retiredCredits: true } },
        },
      });

      if (!currentOrderItem) {
        return { error: 'Order item not found', status: 404 };
      }

      if (currentOrderItem.order.userId !== auth.id) {
        return { error: 'Forbidden', status: 403 };
      }

      if (currentOrderItem.order.status !== 'COMPLETED') {
        return { error: 'Only completed orders can be retired', status: 400 };
      }

      const currentAlreadyRetired = currentOrderItem.retired ? currentOrderItem.quantity : 0;
      const currentAvailable = currentOrderItem.quantity - currentAlreadyRetired;

      if (quantity > currentAvailable) {
        return {
          error: `Cannot retire ${quantity} credits. Only ${currentAvailable} available for retirement.`,
          status: 400,
        };
      }

      if (quantity === currentOrderItem.quantity) {
        await tx.orderItem.update({
          where: { id: orderItemId },
          data: { retired: true },
        });
      }

      await tx.carbonCredit.update({
        where: { id: currentOrderItem.carbonCredit.id },
        data: {
          retiredCredits: { increment: quantity },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: currentOrderItem.orderId,
          event: 'CREDITS_RETIRED',
          message: retireTx
            ? `${quantity} credits retired from order item #${orderItemId}. Tx: ${retireTx.txHash}`
            : `${quantity} credits retired from order item #${orderItemId} (DB only — no on-chain burn).`,
        },
      });

      return {
        data: {
          orderItemId,
          orderId: currentOrderItem.orderId,
          retiredQuantity: quantity,
          totalRetired: currentAlreadyRetired + quantity,
          remaining: currentAvailable - quantity,
          transactionHash: retireTx?.txHash ?? null,
          blockchainEnabled,
        },
        status: 200,
      };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    try {
      await notifyCreditsRetired(auth.id, orderItemId, quantity, result.data.orderId);
    } catch (notificationError) {
      console.error('Failed to create retired credits notification:', notificationError);
    }

    if (emailService.isEnabled()) {
      try {
        const emailUser = await prisma.user.findUnique({ where: { id: auth.id } });
        const emailOrderItem = await prisma.orderItem.findUnique({
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

        if (emailUser && emailOrderItem?.carbonCredit) {
          await emailService.sendCreditsRetired({
            userName: `${emailUser.firstName} ${emailUser.lastName}`.trim(),
            userEmail: emailUser.email,
            quantity,
            certification: emailOrderItem.carbonCredit.certification,
            vintage: emailOrderItem.carbonCredit.vintage,
            forestName: emailOrderItem.carbonCredit.forest?.name ?? 'Forest',
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
