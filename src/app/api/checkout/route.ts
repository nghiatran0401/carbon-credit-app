import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const Stripe = require("stripe");
const stripe = Stripe(stripeSecret);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const cart = await prisma.cartItem.findMany({
    where: { userId },
    include: { carbonCredit: { include: { forest: true } } },
  });
  if (!cart.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  // Build line items for Stripe Checkout
  const line_items = cart.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.carbonCredit.forest?.name || "Carbon Credit",
        description: `${item.carbonCredit.certification} (${item.carbonCredit.vintage})`,
      },
      unit_amount: Math.round(item.carbonCredit.pricePerCredit * 100),
    },
    quantity: item.quantity,
  }));

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/cart?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/cart?canceled=1`,
    metadata: { userId: String(userId) },
  });

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { userId } });

  return NextResponse.json({ checkoutUrl: session.url });
}
