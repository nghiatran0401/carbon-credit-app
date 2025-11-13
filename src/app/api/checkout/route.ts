import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, cartItems } = body;
  if (!userId)
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Calculate totals
  let total = 0;
  let totalCredits = 0;
  for (const item of cartItems) {
    const price = item.carbonCredit?.pricePerCredit || item.price || 0;
    total += price * item.quantity;
    totalCredits += item.quantity;
  }

  // Validate prices
  for (const item of cartItems) {
    const price = item.carbonCredit?.pricePerCredit || item.price || 0;
    const name =
      item.carbonCredit?.forest?.name || item.name || "Carbon Credit";

    if (!price || price <= 0) {
      throw new Error(`Invalid price for item: ${name}`);
    }
  }

  // Create Order (pending)
  const order = await prisma.order.create({
    data: {
      userId,
      status: "Pending",
      totalPrice: total,
      totalCredits,
      currency: "USD",
      items: {
        create: cartItems.map((item: any) => {
          const price = item.carbonCredit?.pricePerCredit || item.price || 0;
          return {
            carbonCreditId: item.carbonCreditId || 1, // fallback for demo
            quantity: item.quantity,
            pricePerCredit: price,
            subtotal: price * item.quantity,
          };
        }),
      },
    },
  });

  // Create Payment (pending)
  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: total,
      currency: "USD",
      status: "pending",
      method: "card",
    },
  });

  // Create OrderHistory (created)
  await prisma.orderHistory.create({
    data: {
      orderId: order.id,
      event: "created",
      message: `Order created and awaiting payment`,
    },
  });

  // Return mock payment page URL
  const checkoutUrl = `${baseUrl}/payment?orderId=${order.id}`;

  return NextResponse.json({
    orderId: order.id,
    checkoutUrl,
    totalPrice: total,
    totalCredits,
  });
}
