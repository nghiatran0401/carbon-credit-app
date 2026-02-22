import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment-service';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * PayOS Return URL Handler
 * User is redirected here after completing payment on PayOS.
 * Verifies payment status and redirects to the success page.
 */
export async function GET(request: NextRequest) {
  try {
    const orderCodeParam = request.nextUrl.searchParams.get('orderCode');

    if (!orderCodeParam) {
      return NextResponse.redirect(new URL('/cart', env.NEXT_PUBLIC_BASE_URL));
    }

    const orderCode = Number(orderCodeParam);
    if (isNaN(orderCode)) {
      return NextResponse.redirect(new URL('/cart', env.NEXT_PUBLIC_BASE_URL));
    }

    await paymentService.verifyPaymentStatus(orderCode);

    const successUrl = new URL(`/success?orderCode=${orderCode}`, env.NEXT_PUBLIC_BASE_URL);
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('Error in PayOS return URL handler:', error);
    return NextResponse.redirect(new URL('/cart', env.NEXT_PUBLIC_BASE_URL));
  }
}
