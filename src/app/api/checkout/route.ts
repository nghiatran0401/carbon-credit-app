export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import Stripe from 'stripe';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const baseUrl = env.NEXT_PUBLIC_BASE_URL;
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(req: NextRequest) {
  const rateLimited = checkRateLimit(req, RATE_LIMITS.checkout, 'checkout');
  if (rateLimited) return rateLimited;

  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const userId = auth.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        carbonCredit: {
          include: { forest: true },
        },
      },
    });

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    let total = 0;
    let totalCredits = 0;
    for (const item of cartItems) {
      const price = item.carbonCredit.pricePerCredit;
      if (!price || price <= 0) {
        return NextResponse.json(
          { error: `Invalid price for credit #${item.carbonCreditId}` },
          { status: 400 },
        );
      }
      total += price * item.quantity;
      totalCredits += item.quantity;
    }

    const line_items = cartItems.map((item) => {
      const price = item.carbonCredit.pricePerCredit;
      const name = item.carbonCredit.forest?.name || 'Carbon Credit';

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: name,
            metadata: {
              seller: name,
            },
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,
      metadata: { userId: String(userId) },
    });

    const sellerName = cartItems[0]?.carbonCredit?.forest?.name || 'Platform';

    const order = await prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        totalPrice: total,
        totalCredits,
        currency: 'USD',
        buyer: String(userId),
        seller: sellerName,
        items: {
          create: cartItems.map((item) => ({
            carbonCreditId: item.carbonCreditId,
            quantity: item.quantity,
            pricePerCredit: item.carbonCredit.pricePerCredit,
            subtotal: item.carbonCredit.pricePerCredit * item.quantity,
          })),
        },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        stripeSessionId: session.id,
        amount: total,
        currency: 'USD',
        status: 'PENDING',
        method: 'card',
      },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        event: 'created',
        message: `Order created and awaiting payment via Stripe session ${session.id}`,
      },
    });

    return NextResponse.json({ sessionId: session.id, checkoutUrl: session.url });
  } catch (error) {
    return handleRouteError(error, 'Failed to create checkout session');
  }
}
