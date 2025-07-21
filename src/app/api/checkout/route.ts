import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// You must set STRIPE_SECRET_KEY in your environment
const stripeSecret = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
const Stripe = require("stripe");
const stripe = Stripe(stripeSecret);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  const cart = await prisma.cartItem.findMany({
    where: { userId },
    include: { carbonCredit: true },
  });
  if (!cart.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  const amount = cart.reduce((sum, item) => sum + item.quantity * item.carbonCredit.pricePerCredit, 0);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: "usd",
    metadata: { userId: String(userId) },
  });
  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
