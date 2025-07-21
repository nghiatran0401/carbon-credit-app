import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const Stripe = require("stripe");
const stripe = Stripe(stripeSecret);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, cartItems } = body;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Calculate totals
  let total = 0;
  let totalCredits = 0;
  for (const item of cartItems) {
    total += item.price * item.quantity;
    totalCredits += item.quantity;
  }

  // Create Stripe Checkout Session
  const line_items = cartItems.map((item: any) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cart`,
    metadata: { userId: String(userId) },
  });

  // Create Order (pending)
  const order = await prisma.order.create({
    data: {
      userId,
      status: "Pending",
      totalPrice: total,
      totalCredits,
      currency: "USD",
      // Remove stripeSessionId from Order (not in model)
      items: {
        create: cartItems.map((item: any) => ({
          carbonCreditId: item.carbonCreditId || 1, // fallback for demo
          quantity: item.quantity,
          pricePerCredit: item.price,
          subtotal: item.price * item.quantity,
        })),
      },
    },
  });

  // Create Payment (pending)
  await prisma.payment.create({
    data: {
      orderId: order.id,
      stripeSessionId: session.id,
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
      message: `Order created and awaiting payment via Stripe session ${session.id}`,
    },
  });

  return NextResponse.json({ sessionId: session.id });
}
