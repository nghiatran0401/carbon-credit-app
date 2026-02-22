import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateWebhookEventData {
  orderCode: number;
  signature: string;
  status: 'PROCESSED' | 'FAILED' | 'RETRYING';
  webhookData: any;
  processedAt?: Date;
  errorMessage?: string;
  retryCount?: number;
}

export class WebhookEventRepository {
  async findOrCreate(data: CreateWebhookEventData) {
    const existing = await prisma.webhookEvent.findUnique({
      where: { signature: data.signature },
    });

    if (existing) {
      return existing;
    }

    try {
      return await prisma.webhookEvent.create({
        data: {
          orderCode: data.orderCode,
          signature: data.signature,
          status: data.status,
          webhookData: data.webhookData as Prisma.InputJsonValue,
          processedAt: data.processedAt,
          errorMessage: data.errorMessage,
          retryCount: data.retryCount || 0,
        },
      });
    } catch (error) {
      const existingAfter = await prisma.webhookEvent.findUnique({
        where: { signature: data.signature },
      });
      if (existingAfter) {
        return existingAfter;
      }
      throw error;
    }
  }

  async isProcessed(signature: string): Promise<boolean> {
    const event = await prisma.webhookEvent.findUnique({
      where: { signature },
      select: { status: true },
    });
    return event?.status === 'PROCESSED';
  }

  async markAsProcessed(signature: string, processedAt?: Date) {
    return prisma.webhookEvent.update({
      where: { signature },
      data: {
        status: 'PROCESSED',
        processedAt: processedAt || new Date(),
      },
    });
  }

  async markAsFailed(signature: string, errorMessage: string) {
    return prisma.webhookEvent.update({
      where: { signature },
      data: {
        status: 'FAILED',
        errorMessage,
        retryCount: { increment: 1 },
      },
    });
  }

  async findBySignature(signature: string) {
    return prisma.webhookEvent.findUnique({
      where: { signature },
    });
  }

  async findByOrderCode(orderCode: number) {
    return prisma.webhookEvent.findMany({
      where: { orderCode },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const webhookEventRepository = new WebhookEventRepository();
