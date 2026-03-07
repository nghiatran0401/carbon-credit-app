import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const orderId = parseInt(params.id);

  if (!orderId) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Order is already completed" },
        { status: 400 },
      );
    }

    const now = new Date();

    // Run independent updates concurrently
    await Promise.all([
      // Update payment status
      order.payments && order.payments.length > 0
        ? prisma.payment.update({
            where: { id: order.payments[0].id },
            data: { status: "PAID", paidAt: now },
          })
        : Promise.resolve(),

      // Update order status
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          paidAt: now,
        },
      }),

      // Add order history
      prisma.orderHistory.create({
        data: {
          orderId: orderId,
          event: "paid",
          message: `Order manually completed via admin interface`,
        },
      }),

      // Clear the user's cart
      prisma.cartItem.deleteMany({ where: { userId: order.userId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Order completed successfully",
    });
  } catch (error) {
    console.error("Error completing order:", error);
    return NextResponse.json(
      { error: "Failed to complete order" },
      { status: 500 },
    );
  }
}
