import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { orderAuditService } from '@/lib/order-audit-service';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  logger.info('Manual webhook test triggered');

  try {
    // Find the most recent completed order without audit record
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
      take: 5,
    });

    logger.info('Completed orders found for test webhook', { count: completedOrders.length });

    const results = [];

    for (const order of completedOrders) {
      try {
        const totalCredits = order.items.reduce((sum, item) => sum + item.quantity, 0);

        console.log(
          `Processing order ${order.id}: ${totalCredits} credits, $${order.totalPrice}, paid at ${order.paidAt}`,
        );

        // Try to store audit trail
        const auditData = {
          orderId: order.id,
          totalCredits: totalCredits,
          totalPrice: order.totalPrice,
          paidAt: order.paidAt!,
        };

        logger.info('Storing audit trail for order', { orderId: order.id });
        await orderAuditService.storeOrderAudit(auditData);

        results.push({
          orderId: order.id,
          status: 'success',
          message: `Audit trail stored successfully`,
        });

        logger.info('Order audit trail stored in ImmuDB', { orderId: order.id });
      } catch (auditError: unknown) {
        const message = auditError instanceof Error ? auditError.message : String(auditError);
        logger.error('Error storing order audit', { orderId: order.id, message });

        results.push({
          orderId: order.id,
          status: 'error',
          message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${completedOrders.length} orders`,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Manual webhook test error', { message });
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return NextResponse.json({
    message:
      'Manual webhook test endpoint. Use POST to trigger audit processing for completed orders.',
    timestamp: new Date().toISOString(),
  });
}
