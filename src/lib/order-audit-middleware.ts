import { prisma } from "./prisma";
import { orderAuditService } from "./order-audit-service";

class OrderAuditMiddleware {
  /**
   * Ensure audit record exists for a completed order
   */
  async ensureOrderAudit(orderId: number): Promise<{
    exists: boolean;
    created: boolean;
    error?: string;
  }> {
    try {
      // Get the order details
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

      if (order.status !== "COMPLETED" || !order.paidAt) {
        return { exists: false, created: false, error: "Order not completed" };
      }

      // Calculate total credits
      const totalCredits = order.items.reduce((sum, item) => sum + item.quantity, 0);

      // Read buyer/seller from order
      const buyer = (order as any).buyer;
      const seller = (order as any).seller;

      // Check if audit record already exists
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
          console.log(`✅ Audit record already exists for order ${orderId}`);
          return { exists: true, created: false };
        }
      } catch (error) {
        // Record doesn't exist, continue to create it
      }

      // Create audit record (include buyer/seller)
      await orderAuditService.storeOrderAudit({
        orderId: order.id,
        totalCredits,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt,
        buyer,
        seller,
      });

      console.log(`✅ Created audit record for order ${orderId}`);
      return { exists: false, created: true };
    } catch (error: any) {
      console.error(`❌ Error ensuring audit for order ${orderId}:`, error.message);
      return { exists: false, created: false, error: error.message };
    }
  }

  /**
   * Process all completed orders and ensure they have audit records
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
          status: "COMPLETED",
          paidAt: { not: null },
        },
        orderBy: { id: "desc" },
      });

      console.log(`🔄 Processing ${completedOrders.length} completed orders for audit records...`);

      let created = 0;
      let existing = 0;
      let errors = 0;

      for (const order of completedOrders) {
        const result = await this.ensureOrderAudit(order.id);

        if (result.created) created++;
        else if (result.exists) existing++;
        else if (result.error) errors++;
      }

      console.log(`📊 Audit processing complete: ${created} created, ${existing} existing, ${errors} errors`);

      return {
        processed: completedOrders.length,
        created,
        existing,
        errors,
      };
    } catch (error: any) {
      console.error("Error processing completed orders:", error.message);
      throw error;
    }
  }

  /**
   * Run audit check in background (can be called periodically)
   */
  async runBackgroundAuditCheck(): Promise<void> {
    try {
      console.log("🕐 Running background audit check...");
      await this.processAllCompletedOrders();
    } catch (error: any) {
      console.error("Background audit check failed:", error.message);
    }
  }
}

export const orderAuditMiddleware = new OrderAuditMiddleware();
