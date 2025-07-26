import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  if (payment.order.status === "Pending" && payment.status === "pending") {
    console.log(`Fallback: Manually completing order ${payment.order.id} for session ${sessionId}`);

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "succeeded",
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payment.order.id },
      data: {
        status: "Completed",
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
