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
    include: { carbonCredit: true },
  });
  if (!cart.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  const amount = cart.reduce((sum, item) => sum + item.quantity * item.carbonCredit.pricePerCredit, 0);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: "usd",
    metadata: { userId: String(userId) },
  });

  // Create order in DB (status: pending)
  let totalPrice = 0;
  const items = cart.map((item) => {
    const subtotal = item.quantity * item.carbonCredit.pricePerCredit;
    totalPrice += subtotal;
    return {
      carbonCreditId: item.carbonCreditId,
      quantity: item.quantity,
      pricePerCredit: item.carbonCredit.pricePerCredit,
      subtotal,
    };
  });
  const order = await prisma.order.create({
    data: {
      userId,
      status: "pending",
      totalPrice,
      items: { create: items },
    },
    include: { items: true },
  });

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { userId } });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, orderId: order.id });
}
