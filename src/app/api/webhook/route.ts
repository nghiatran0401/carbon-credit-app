import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { certificateService } from '@/lib/certificate-service';
import { orderAuditMiddleware } from '@/lib/order-audit-middleware';
import { carbonMovementService } from '@/lib/carbon-movement-service';
import { paymentService } from '@/lib/payment-service';
import { getPayOSService, type PayOSWebhookData } from '@/lib/payos-service';
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

    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
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

    const { processed } = await paymentService.processPayOSWebhook(webhookData, orderCode);

    if (!processed) {
      return NextResponse.json({ success: true, message: 'Webhook already processed' });
    }

    if (webhookData.code === '00' && webhookData.data.code === '00') {
      await prisma.order.update({
        where: { orderCode },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });

      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          event: 'paid',
          message: `Order paid via PayOS webhook (orderCode: ${orderCode})`,
        },
      });

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

      if (order.userId) {
        await prisma.cartItem.deleteMany({ where: { userId: order.userId } });
      }

      try {
        await certificateService.generateCertificate(order.id);
      } catch (certError) {
        console.error('Error generating certificate for order:', order.id, certError);
      }
    } else {
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
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      orderCode,
    });
  } catch (error) {
    console.error(`PayOS webhook processing error [${requestId}]:`, error);
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
