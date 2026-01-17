import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderAuditService } from "@/lib/order-audit-service";

export async function POST(req: Request) {
  console.log('🧪 Manual webhook test triggered');
  
  try {
    // Find the most recent completed order without audit record
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: { not: null }
      },
      include: {
        items: {
          include: {
            carbonCredit: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 5
    });

    console.log(`Found ${completedOrders.length} completed orders`);

    const results = [];

    for (const order of completedOrders) {
      try {
        const totalCredits = order.items.reduce((sum, item) => sum + item.quantity, 0);
        
        console.log(`Processing order ${order.id}: ${totalCredits} credits, $${order.totalPrice}, paid at ${order.paidAt}`);

        // Try to store audit trail
        const auditData = {
          orderId: order.id,
          totalCredits: totalCredits,
          totalPrice: order.totalPrice,
          paidAt: order.paidAt!
        };
        
        console.log(`Storing audit trail for order ${order.id}:`, auditData);
        await orderAuditService.storeOrderAudit(auditData);
        
        results.push({
          orderId: order.id,
          status: 'success',
          message: `Audit trail stored successfully`
        });
        
        console.log(`✅ Order audit trail stored in ImmuDB for order ${order.id}`);
      } catch (auditError: any) {
        console.error(`❌ Error storing order audit for order ${order.id}:`, auditError.message);
        
        results.push({
          orderId: order.id,
          status: 'error',
          message: auditError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${completedOrders.length} orders`,
      results
    });

  } catch (error: any) {
    console.error('Manual webhook test error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return NextResponse.json({
    message: "Manual webhook test endpoint. Use POST to trigger audit processing for completed orders.",
    timestamp: new Date().toISOString()
  });
}