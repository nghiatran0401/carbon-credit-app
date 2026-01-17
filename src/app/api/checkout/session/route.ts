import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { carbonMovementService } from "@/lib/carbon-movement-service";
import { orderAuditMiddleware } from "@/lib/order-audit-middleware";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  // Find payment and order by Stripe session ID
  const payment = await prisma.payment.findFirst({
    where: { stripeSessionId: sessionId },
    include: {
      order: {
        include: {
          items: true,
          orderHistory: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Fallback: If order is still pending, mark it as completed
  // This handles cases where the webhook didn't fire
  if (payment.order.status === "PENDING" && payment.status === "PENDING") {
    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payment.order.id },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
      },
    });

    // Add order history
    await prisma.orderHistory.create({
      data: {
        orderId: payment.order.id,
        event: "paid",
        message: `Order manually completed via success page for session ${sessionId}`,
      },
    });

    // Clear the user's cart
    await prisma.cartItem.deleteMany({ where: { userId: payment.order.userId } });

    // Ensure audit trail is created for the completed order
    try {
      console.log(`Creating audit trail for order ${payment.order.id} via checkout session`);
      const auditResult = await orderAuditMiddleware.ensureOrderAudit(payment.order.id);
      
      if (auditResult.created) {
        console.log(`✅ Audit trail created for order ${payment.order.id} via checkout session`);
      } else if (auditResult.exists) {
        console.log(`ℹ️ Audit trail already exists for order ${payment.order.id}`);
      } else if (auditResult.error) {
        console.error(`❌ Failed to create audit trail for order ${payment.order.id}: ${auditResult.error}`);
      }
    } catch (auditError: any) {
      console.error(`❌ Error in audit middleware for order ${payment.order.id}:`, auditError.message);
      // Don't fail the request if audit storage fails
    }

    // Track carbon credit movement in Neo4j
    try {
      console.log(`Tracking carbon credit movement for order ${payment.order.id} via checkout session`);
      await carbonMovementService.trackOrderMovement(payment.order.id);
      console.log(`✅ Carbon credit movement tracked for order ${payment.order.id}`);
    } catch (movementError: any) {
      console.error(`❌ Error tracking movement for order ${payment.order.id}:`, movementError.message);
      // Don't fail the request if movement tracking fails
    }

    // Fetch updated data
    const updatedPayment = await prisma.payment.findFirst({
      where: { stripeSessionId: sessionId },
      include: {
        order: {
          include: {
            items: true,
            orderHistory: true,
          },
        },
      },
    });

    return NextResponse.json({
      payment: updatedPayment,
      order: updatedPayment?.order,
    });
  }

  return NextResponse.json({
    payment,
    order: payment.order,
  });
}
