import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { carbonMovementService } from "@/lib/carbon-movement-service";
import { orderAuditMiddleware } from "@/lib/order-audit-middleware";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  // Find payment and order by Stripe session ID stored in paymentData
  const payment = await prisma.payment.findFirst({
    where: {
      paymentData: {
        path: ["stripeSessionId"],
        equals: sessionId,
      },
    },
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
    const now = new Date();
    const orderId = payment.order.id;
    const userId = payment.order.userId;

    // Run all independent post-payment tasks concurrently
    await Promise.all([
      // Update payment status
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt: now },
      }),

      // Update order status
      prisma.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED", paidAt: now },
      }),

      // Add order history
      prisma.orderHistory.create({
        data: {
          orderId,
          event: "paid",
          message: `Order manually completed via success page for session ${sessionId}`,
        },
      }),

      // Clear the user's cart
      prisma.cartItem.deleteMany({ where: { userId } }),

      // Ensure audit trail is created for the completed order
      orderAuditMiddleware.ensureOrderAudit(orderId).then((auditResult) => {
        if (auditResult.created) {
          console.log(`✅ Audit trail created for order ${orderId} via checkout session`);
        } else if (auditResult.exists) {
          console.log(`ℹ️ Audit trail already exists for order ${orderId}`);
        } else if (auditResult.error) {
          console.error(`❌ Failed to create audit trail for order ${orderId}: ${auditResult.error}`);
        }
      }).catch((auditError: any) => {
        console.error(`❌ Error in audit middleware for order ${orderId}:`, auditError.message);
      }),

      // Track carbon credit movement in Neo4j
      carbonMovementService.trackOrderMovement(orderId).then(() => {
        console.log(`✅ Carbon credit movement tracked for order ${orderId}`);
      }).catch((movementError: any) => {
        console.error(`❌ Error tracking movement for order ${orderId}:`, movementError.message);
      }),
    ]);

    // Fetch updated data
    const updatedPayment = await prisma.payment.findFirst({
      where: {
        paymentData: {
          path: ["stripeSessionId"],
          equals: sessionId,
        },
      },
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
