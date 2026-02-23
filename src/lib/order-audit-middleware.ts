import { prisma } from './prisma';
import { orderAuditService } from './order-audit-service';

interface OrderForAudit {
  id: number;
  status: string;
  paidAt: Date | null;
  totalPrice: number;
  items: Array<{ quantity: number }>;
  [key: string]: unknown;
}

type AuditResult = { exists: boolean; created: boolean; error?: string };

class OrderAuditMiddleware {
  /**
   * Ensure audit record exists for a completed order (fetches from DB by ID).
   * Used by webhook handler for single-order processing.
   */
  async ensureOrderAudit(orderId: number): Promise<AuditResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              carbonCredit: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      return this.processOrderAudit(order as OrderForAudit);
    } catch (error: unknown) {
      console.error(
        `❌ Error ensuring audit for order ${orderId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return {
        exists: false,
        created: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Core audit logic operating on a pre-loaded order — no extra DB fetch.
   */
  private async processOrderAudit(order: OrderForAudit): Promise<AuditResult> {
    if (order.status !== 'COMPLETED' || !order.paidAt) {
      return { exists: false, created: false, error: 'Order not completed' };
    }

    const totalCredits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const buyer = order.buyer as string | undefined;
    const seller = order.seller as string | undefined;

    try {
      const verification = await orderAuditService.verifyOrderIntegrity(order.id, {
        orderId: order.id,
        totalCredits,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt,
        buyer,
        seller,
      });

      if (verification.storedHash) {
        return { exists: true, created: false };
      }
    } catch {
      // Record doesn't exist, continue to create it
    }

    await orderAuditService.storeOrderAudit({
      orderId: order.id,
      totalCredits,
      totalPrice: order.totalPrice,
      paidAt: order.paidAt,
      buyer,
      seller,
    });

    return { exists: false, created: true };
  }

  /**
   * Process all completed orders and ensure they have audit records.
   * Fetches all orders with items in a single query to avoid N+1.
   */
  async processAllCompletedOrders(): Promise<{
    processed: number;
    created: number;
    existing: number;
    errors: number;
  }> {
    try {
      const completedOrders = await prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          paidAt: { not: null },
        },
        include: {
          items: {
            include: {
              carbonCredit: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      console.log(`🔄 Processing ${completedOrders.length} completed orders for audit records...`);

      let created = 0;
      let existing = 0;
      let errors = 0;

      for (const order of completedOrders) {
        const result = await this.processOrderAudit(order as OrderForAudit);

        if (result.created) created++;
        else if (result.exists) existing++;
        else if (result.error) errors++;
      }

      console.log(
        `📊 Audit processing complete: ${created} created, ${existing} existing, ${errors} errors`,
      );

      return {
        processed: completedOrders.length,
        created,
        existing,
        errors,
      };
    } catch (error: unknown) {
      console.error(
        'Error processing completed orders:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async runBackgroundAuditCheck(): Promise<void> {
    try {
      console.log('🕐 Running background audit check...');
      await this.processAllCompletedOrders();
    } catch (error: unknown) {
      console.error(
        'Background audit check failed:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

export const orderAuditMiddleware = new OrderAuditMiddleware();
