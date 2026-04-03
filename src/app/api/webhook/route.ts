import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { certificateService } from '@/lib/certificate-service';
import { orderAuditMiddleware } from '@/lib/order-audit-middleware';
import { carbonMovementService } from '@/lib/carbon-movement-service';
import { paymentService } from '@/lib/payment-service';
import { getPayOSService, type PayOSWebhookData } from '@/lib/payos-service';
import { emailService } from '@/lib/email-service';
import { CreditInventoryError, decrementAvailableCreditsForOrder } from '@/lib/credit-inventory';
import {
  notifyCertificateIssued,
  notifyOrderFailed,
  notifyOrderPaid,
  notifyWebhookFailed,
} from '@/lib/notification-emitter';
import { enqueueBlockchainTransfer } from '@/lib/blockchain-queue';
import { isBlockchainReady } from '@/services/blockchainService';
import { ethers } from 'ethers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getPayosService() {
  try {
    return getPayOSService();
  } catch (error) {
    console.error('Failed to load PayOS service', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  let orderCodeForError = 0;

  try {
    const rawBody = await req.text();

    if (!rawBody || rawBody.trim().length === 0) {
      return NextResponse.json({ message: 'Webhook endpoint is active', received: true });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ── 1. Validate PayOS signature ──────────────────────────────────────────
    const payosServiceInstance = getPayosService();
    if (!payosServiceInstance) {
      return NextResponse.json(
        { error: 'PayOS service not configured. Please check environment variables.' },
        { status: 500 },
      );
    }

    let webhookData: PayOSWebhookData;
    try {
      const verifiedData = await payosServiceInstance.verifyWebhookSignature(body);
      webhookData = {
        code: body.code,
        desc: body.desc,
        data: verifiedData,
        signature: body.signature,
      } as PayOSWebhookData;
    } catch (error: any) {
      console.error('PayOS webhook signature verification failed', error?.message);
      return NextResponse.json(
        {
          error: 'Invalid signature',
          message: error?.message || 'Webhook signature verification failed',
        },
        { status: 401 },
      );
    }

    if (!webhookData.data || !webhookData.data.orderCode) {
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    const orderCode = Number(webhookData.data.orderCode);
    orderCodeForError = orderCode;

    // ── 2. Load the order ────────────────────────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        user: {
          select: {
            walletAddress: true,
          },
        },
        items: { include: { carbonCredit: true } },
      },
    });

    if (!order) {
      return NextResponse.json({
        success: true,
        message: 'Webhook received but order not found',
        orderCode,
      });
    }

    // ── 3. Idempotency check ─────────────────────────────────────────────────
    const { processed } = await paymentService.processPayOSWebhook(webhookData, orderCode);

    if (!processed) {
      return NextResponse.json({ success: true, message: 'Webhook already processed' });
    }

    if (webhookData.code === '00' && webhookData.data.code === '00') {
      // ── 4a. Payment succeeded ────────────────────────────────────────────
      // Set PROCESSING so the success page knows blockchain transfer is pending.
      // The blockchain-queue worker will flip it to COMPLETED once the tx mines.
      const paymentFinalized = await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });

        if (!currentOrder) {
          throw new Error(`Order not found for webhook finalization: ${order.id}`);
        }

        if (currentOrder.status === 'COMPLETED' || currentOrder.status === 'PROCESSING') {
          return false;
        }

        if (
          currentOrder.status !== 'PENDING' &&
          currentOrder.status !== 'PAID' &&
          currentOrder.status !== 'EXPIRED'
        ) {
          throw new CreditInventoryError(
            `Order ${order.id} cannot be finalized from status ${currentOrder.status}.`,
          );
        }

        await decrementAvailableCreditsForOrder(tx, order.id);

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'PROCESSING', paidAt: new Date() },
        });

        await tx.orderHistory.create({
          data: {
            orderId: order.id,
            event: 'paid',
            message: `Order paid via PayOS webhook (orderCode: ${orderCode})`,
          },
        });

        return true;
      });

      if (!paymentFinalized) {
        return NextResponse.json({
          success: true,
          message: 'Order already finalized',
          orderCode,
        });
      }

      try {
        await notifyOrderPaid(order.userId, order.id, orderCode);
      } catch (notificationError) {
        console.error('Failed to create order paid notification:', notificationError);
      }

      try {
        const auditResult = await orderAuditMiddleware.ensureOrderAudit(order.id);
        if (auditResult.created) {
          console.log(`Audit trail created for order ${order.id}`);
        }
      } catch (auditError) {
        console.error(`Failed to create audit trail for order ${order.id}:`, auditError);
      }

      try {
        await carbonMovementService.trackOrderMovement(order.id);
      } catch (movementError) {
        console.error(`Failed to track movement for order ${order.id}:`, movementError);
      }

      // ── 5. Async blockchain transfer ─────────────────────────────────────
      // Resolve buyer wallet address (env override takes priority over user DB value).
      const configuredBuyerAddress = process.env.BUYER_WALLET_ADDRESS?.trim();
      const buyerAddress = configuredBuyerAddress || order.user?.walletAddress;

      if (!isBlockchainReady()) {
        console.warn(
          `[webhook] Blockchain not configured — skipping on-chain transfer for order ${order.id}`,
        );
      } else if (!buyerAddress) {
        console.warn(
          `[webhook] Order ${order.id} has no buyer walletAddress and BUYER_WALLET_ADDRESS is not set. Skipping on-chain credit transfer.`,
        );
      } else if (!ethers.isAddress(buyerAddress)) {
        console.error(
          `[webhook] Invalid buyer wallet address for order ${order.id}: "${buyerAddress}". Skipping.`,
        );
      } else {
        // Fire-and-forget — returns immediately so PayOS gets its 200 right away.
        enqueueBlockchainTransfer({
          orderId: order.id,
          buyerAddress,
          items: order.items,
        });
      }

      // ── 6. Clear cart ────────────────────────────────────────────────────
      if (order.userId) {
        await prisma.cartItem.deleteMany({ where: { userId: order.userId } });
      }

      // ── 7. Generate certificate + send emails ────────────────────────────
      try {
        const cert = await certificateService.generateCertificate(order.id);

        if (cert && typeof cert === 'object' && 'id' in cert) {
          try {
            await notifyCertificateIssued(order.userId, order.id, String(cert.id), orderCode);
          } catch (notificationError) {
            console.error('Failed to create certificate notification:', notificationError);
          }
        }

        if (cert && emailService.isEnabled()) {
          try {
            const fullOrder = await prisma.order.findUnique({
              where: { id: order.id },
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

              const certData = cert as unknown as {
                id?: string;
                metadata?: { totalCredits?: number; forestName?: string };
              };
              if (certData.id) {
                await emailService.sendCertificateIssued({
                  userName,
                  userEmail: fullOrder.user.email,
                  certificateId: certData.id,
                  orderId: fullOrder.id,
                  totalCredits: certData.metadata?.totalCredits ?? 0,
                  forestName: certData.metadata?.forestName ?? 'Forest',
                });
              }
            }
          } catch (emailErr) {
            console.error(`Failed to send emails for order ${order.id}:`, emailErr);
          }
        }
      } catch (certError) {
        console.error('Error generating certificate for order:', order.id, certError);
      }
    } else {
      // ── 4b. Payment failed ───────────────────────────────────────────────
      await prisma.order.update({
        where: { orderCode },
        data: { status: 'FAILED' },
      });

      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          event: 'failed',
          message: `Payment failed via PayOS webhook (orderCode: ${orderCode})`,
        },
      });

      try {
        await notifyOrderFailed(order.userId, order.id, orderCode);
      } catch (notificationError) {
        console.error('Failed to create order failed notification:', notificationError);
      }
    }

    // ── 8. Immediate 200 to PayOS ────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      orderCode,
    });
  } catch (error) {
    console.error(`PayOS webhook processing error [${requestId}]:`, error);
    if (error instanceof CreditInventoryError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (orderCodeForError) {
      try {
        await notifyWebhookFailed(orderCodeForError, 'Unhandled webhook processing error');
      } catch (notificationError) {
        console.error('Failed to create webhook failure notification:', notificationError);
      }
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  const payosServiceInstance = getPayosService();
  return NextResponse.json({
    message: 'PayOS webhook endpoint is active',
    url: '/api/webhook',
    configured: !!payosServiceInstance,
    note: payosServiceInstance
      ? 'PayOS service is configured and ready'
      : 'PayOS service not configured. Please set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env',
  });
}
