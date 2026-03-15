import { prisma } from '@/lib/prisma';
import { webhookEventRepository } from '@/lib/webhook-event-repository';
import type { PayOSWebhookData } from '@/lib/payos-service';

export interface CreatePayOSOrderParams {
  orderCode: number;
  userId: number;
  totalPrice: number;
  totalCredits: number;
  currency: string;
  seller: string;
  buyer: string;
  cartItems: Array<{
    carbonCreditId: number;
    quantity: number;
    pricePerCredit: number;
    subtotal: number;
  }>;
}

export class PaymentService {
  /**
   * Generate a unique numeric order code for payOS.
   * Uses timestamp * 10000 + random(1000-9999) with collision retry.
   */
  async generateUniqueOrderCode(maxRetries: number = 5): Promise<number> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Keep within PostgreSQL Int range (max 2,147,483,647)
      // 5-digit timestamp (cycles ~27.7h) + 4-digit random → max 999,999,999
      const timePart = Math.floor(Date.now() / 1000) % 100000;
      const random = Math.floor(Math.random() * 9000) + 1000;
      const orderCode = timePart * 10000 + random;

      const existing = await prisma.order.findUnique({
        where: { orderCode },
      });
      if (!existing) {
        return orderCode;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Fallback: pure random within Int32 range
    return Math.floor(Math.random() * 2000000000) + 100000000;
  }

  /**
   * Create order + payment record in a transaction for payOS checkout.
   */
  async createPayOSOrder(params: CreatePayOSOrderParams) {
    const { orderCode, userId, totalPrice, totalCredits, currency, seller, buyer, cartItems } =
      params;

    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.create({
          data: {
            orderCode,
            userId,
            status: 'PENDING',
            totalPrice,
            totalCredits,
            currency,
            totalUsd: totalPrice,
            seller,
            buyer,
            paymentProvider: 'PAYOS',
            items: {
              create: cartItems.map((item) => ({
                carbonCreditId: item.carbonCreditId,
                quantity: item.quantity,
                pricePerCredit: item.pricePerCredit,
                subtotal: item.subtotal,
              })),
            },
          },
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            orderCode,
            amount: totalPrice,
            currency,
            status: 'PENDING',
            method: 'payos',
            paymentData: {},
            payosOrderCode: orderCode,
          },
        });

        await tx.orderHistory.create({
          data: {
            orderId: order.id,
            event: 'created',
            message: `Order created and awaiting payment via PayOS (orderCode: ${orderCode})`,
          },
        });

        return order;
      },
      { timeout: 10000 },
    );
  }

  /**
   * Store payOS payment link details on the payment record.
   */
  async updatePaymentWithPayOSInfo(
    orderCode: number,
    payosInfo: { payosPaymentLinkId?: string; payosOrderCode?: number; payosReference?: string },
  ) {
    await prisma.payment.updateMany({
      where: { orderCode },
      data: {
        ...(payosInfo.payosPaymentLinkId && { payosPaymentLinkId: payosInfo.payosPaymentLinkId }),
        ...(payosInfo.payosOrderCode && { payosOrderCode: payosInfo.payosOrderCode }),
        ...(payosInfo.payosReference && { payosReference: payosInfo.payosReference }),
      },
    });
  }

  /**
   * Process a payOS webhook idempotently.
   * Returns { processed: true } if new, { processed: false } if duplicate.
   */
  async processPayOSWebhook(
    webhookData: PayOSWebhookData,
    orderCode: number,
  ): Promise<{ processed: boolean }> {
    const signature = `${webhookData.data.paymentLinkId}-${webhookData.data.reference}-${webhookData.data.transactionDateTime}`;

    const webhookEvent = await webhookEventRepository.findOrCreate({
      orderCode,
      signature,
      status: 'RETRYING',
      webhookData: webhookData as any,
    });

    if (webhookEvent.status === 'PROCESSED') {
      return { processed: false };
    }

    const isPaid = webhookData.code === '00' && webhookData.data.code === '00';

    try {
      await prisma.$transaction(
        async (tx) => {
          const order = await tx.order.findUnique({
            where: { orderCode },
          });

          if (!order) {
            throw new Error(`Order not found: ${orderCode}`);
          }

          if (isPaid) {
            const paidAt = new Date(webhookData.data.transactionDateTime);

            await tx.payment.updateMany({
              where: { orderCode },
              data: {
                status: 'PAID',
                paidAt,
                payosReference: webhookData.data.reference,
                paymentData: webhookData as any,
              },
            });

            if (order.status === 'PENDING' || order.status === 'EXPIRED') {
              await tx.order.update({
                where: { orderCode },
                data: { status: 'PAID' },
              });
            }
          } else {
            await tx.payment.updateMany({
              where: { orderCode },
              data: {
                status: 'FAILED',
                paymentData: webhookData as any,
              },
            });
          }

          await tx.webhookEvent.update({
            where: { signature },
            data: {
              status: 'PROCESSED',
              processedAt: new Date(),
            },
          });
        },
        { timeout: 10000 },
      );

      return { processed: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await webhookEventRepository.markAsFailed(signature, errorMessage);
      throw error;
    }
  }

  /**
   * Verify whether a payment has been confirmed for a given orderCode.
   */
  async verifyPaymentStatus(orderCode: number): Promise<{ isPaid: boolean; orderStatus: string }> {
    const order = await prisma.order.findUnique({ where: { orderCode } });
    if (!order) {
      throw new Error(`Order not found: ${orderCode}`);
    }

    if (order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'COMPLETED') {
      return { isPaid: true, orderStatus: order.status };
    }

    if (order.status === 'PENDING') {
      const payments = await prisma.payment.findMany({ where: { orderCode } });
      const hasPaidPayment = payments.some((p) => p.status === 'PAID');

      if (hasPaidPayment) {
        await prisma.$transaction(async (tx) => {
          const currentOrder = await tx.order.findUnique({
            where: { orderCode },
            select: { status: true },
          });
          if (currentOrder?.status === 'PENDING') {
            await tx.order.update({
              where: { orderCode },
              data: { status: 'PAID' },
            });
          }
        });
        return { isPaid: true, orderStatus: 'PAID' };
      }

      const payment = payments.find((p) => p.paidAt === null && p.createdAt);
      if (payment) {
        const expirationMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - payment.createdAt.getTime() > expirationMs) {
          await prisma.order.update({
            where: { orderCode },
            data: { status: 'EXPIRED' },
          });
          return { isPaid: false, orderStatus: 'EXPIRED' };
        }
      }

      return { isPaid: false, orderStatus: 'PENDING' };
    }

    return { isPaid: false, orderStatus: order.status };
  }
}

export const paymentService = new PaymentService();
