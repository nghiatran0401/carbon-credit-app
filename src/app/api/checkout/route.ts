export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { paymentService } from '@/lib/payment-service';
import { getPayOSService } from '@/lib/payos-service';

const baseUrl = env.NEXT_PUBLIC_BASE_URL;

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

    const orderCode = await paymentService.generateUniqueOrderCode();
    const sellerName = cartItems[0]?.carbonCredit?.forest?.name || 'Platform';

    const order = await paymentService.createPayOSOrder({
      orderCode,
      userId,
      totalPrice: total,
      totalCredits,
      currency: 'USD',
      seller: sellerName,
      buyer: String(userId),
      cartItems: cartItems.map((item) => ({
        carbonCreditId: item.carbonCreditId,
        quantity: item.quantity,
        pricePerCredit: item.carbonCredit.pricePerCredit,
        subtotal: item.carbonCredit.pricePerCredit * item.quantity,
      })),
    });

    // payOS requires integer amount in VND — convert USD to VND cents equivalent
    // Using amount in smallest currency unit (cents for USD → integer)
    const payosAmount = Math.round(total * 100);

    const returnUrl = `${baseUrl}/api/payment/return?orderCode=${orderCode}`;
    const cancelUrl = `${baseUrl}/api/payment/cancel?orderCode=${orderCode}`;

    const payosService = getPayOSService();
    const paymentLink = await payosService.createPaymentLink({
      orderCode,
      amount: payosAmount,
      description: `Carbon Credits Order #${order.id}`,
      returnUrl,
      cancelUrl,
      buyerEmail: auth.email || undefined,
      items: cartItems.map((item) => ({
        name: item.carbonCredit.forest?.name || 'Carbon Credit',
        quantity: item.quantity,
        price: Math.round(item.carbonCredit.pricePerCredit * 100),
      })),
    });

    await paymentService.updatePaymentWithPayOSInfo(orderCode, {
      payosPaymentLinkId: paymentLink.data.paymentLinkId,
      payosOrderCode: orderCode,
    });

    return NextResponse.json({
      orderCode,
      checkoutUrl: paymentLink.data.checkoutUrl,
      paymentLinkId: paymentLink.data.paymentLinkId,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to create checkout session');
  }
}
