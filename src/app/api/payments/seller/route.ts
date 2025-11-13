import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Simulate transfer of payment to seller after successful token transfer
 * In a real system, this would integrate with a payment processor
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Get the order with all details
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        items: {
          include: {
            carbonCredit: {
              include: {
                forest: true,
              },
            },
          },
        },
        payments: true,
        orderHistory: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order is paid
    if (order.status !== "Completed") {
      return NextResponse.json(
        { error: "Order is not completed" },
        { status: 400 },
      );
    }

    // Check if tokens have been transferred
    const tokenTransferEvent = order.orderHistory.find(
      (h) => h.event === "tokens_transferred",
    );

    if (!tokenTransferEvent) {
      return NextResponse.json(
        {
          error:
            "Tokens have not been transferred yet. Cannot release payment to seller.",
        },
        { status: 400 },
      );
    }

    // Check if payment to seller already processed
    const sellerPaymentEvent = order.orderHistory.find(
      (h) => h.event === "seller_paid",
    );

    if (sellerPaymentEvent) {
      return NextResponse.json(
        {
          message: "Payment to seller has already been processed",
          alreadyProcessed: true,
        },
        { status: 200 },
      );
    }

    // Simulate payment to seller
    // In a real system, this would:
    // 1. Call payment processor API to transfer funds
    // 2. Handle different sellers for different forest items
    // 3. Apply any platform fees
    // 4. Handle currency conversion if needed

    const sellers = new Map<string, { amount: number; items: string[] }>();

    // Group by seller (uploader)
    for (const item of order.items) {
      if (!item.carbonCredit?.forest) continue;

      const seller = item.carbonCredit.forest.uploader;
      const amount = item.subtotal;
      const forestName = item.carbonCredit.forest.name;

      if (!sellers.has(seller)) {
        sellers.set(seller, { amount: 0, items: [] });
      }

      const sellerData = sellers.get(seller)!;
      sellerData.amount += amount;
      sellerData.items.push(`${forestName} (${item.quantity} credits)`);
    }

    // Process payment for each seller
    const paymentResults = [];
    for (const [seller, data] of sellers.entries()) {
      // Simulate payment processing
      // In reality, this would call your payment processor
      const platformFee = data.amount * 0.05; // 5% platform fee
      const sellerAmount = data.amount - platformFee;

      paymentResults.push({
        seller,
        totalAmount: data.amount,
        platformFee,
        sellerAmount,
        items: data.items,
        status: "processed",
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      // Add order history for seller payment
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          event: "seller_paid",
          message: `Payment of $${sellerAmount.toFixed(2)} transferred to seller ${seller} (Platform fee: $${platformFee.toFixed(2)}). Items: ${data.items.join(", ")}`,
        },
      });
    }

    // Add summary order history
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        event: "payment_completed",
        message: `All payments released to ${sellers.size} seller(s). Total: $${order.totalPrice.toFixed(2)}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully transferred to seller(s)",
      payments: paymentResults,
      totalSellers: sellers.size,
      totalAmount: order.totalPrice,
    });
  } catch (error: any) {
    console.error("Error processing seller payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process seller payment" },
      { status: 500 },
    );
  }
}

/**
 * Get seller payment status for an order
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        orderHistory: {
          where: {
            event: {
              in: ["seller_paid", "payment_completed"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const sellerPaymentEvents = order.orderHistory.filter(
      (h) => h.event === "seller_paid",
    );
    const paymentCompletedEvent = order.orderHistory.find(
      (h) => h.event === "payment_completed",
    );

    return NextResponse.json({
      orderId: order.id,
      sellerPaid: sellerPaymentEvents.length > 0,
      paymentCompleted: !!paymentCompletedEvent,
      sellerPayments: sellerPaymentEvents.map((event) => ({
        id: event.id,
        message: event.message,
        createdAt: event.createdAt,
      })),
      completionEvent: paymentCompletedEvent
        ? {
            message: paymentCompletedEvent.message,
            createdAt: paymentCompletedEvent.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error fetching seller payment status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch seller payment status" },
      { status: 500 },
    );
  }
}
