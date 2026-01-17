import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import Stripe from "stripe";

const baseUrl = env.NEXT_PUBLIC_BASE_URL;
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

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
    const price = item.carbonCredit?.pricePerCredit || item.price || 0;
    total += price * item.quantity;
    totalCredits += item.quantity;
  }

  // Create Stripe Checkout Session
  const line_items = cartItems.map((item: any) => {
    const price = item.carbonCredit?.pricePerCredit || item.price || 0;
    const name = item.carbonCredit?.forest?.name || item.name || "Carbon Credit";

    if (!price || price <= 0) {
      throw new Error(`Invalid price for item: ${name}`);
    }

    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: name,
          metadata: {
            seller: item.seller || name,
          },
        },
        unit_amount: Math.round(price * 100),
      },
      quantity: item.quantity,
    };
  });

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
      status: "PENDING",
      totalPrice: total,
      totalCredits,
      currency: "USD",
      buyer: String(userId),                          // <- added
      seller: cartItems[0]?.seller || "Platform",    // <- added (fallback)
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
      stripeSessionId: session.id,
      amount: total,
      currency: "USD",
      status: "PENDING",
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

  return NextResponse.json({ sessionId: session.id, checkoutUrl: session.url });
}
