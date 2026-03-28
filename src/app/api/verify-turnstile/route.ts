export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rateLimited = await checkRateLimit(req, RATE_LIMITS.auth, 'turnstile');
  if (rateLimited) return rateLimited;

  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing turnstile token' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const success = await verifyTurnstileToken(token, ip);

    if (!success) {
      return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
