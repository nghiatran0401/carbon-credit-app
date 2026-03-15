import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { emailService } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    if (!emailService.isEnabled()) {
      return NextResponse.json({ sent: false, reason: 'Email not configured' });
    }

    const userName = `${auth.firstName ?? ''} ${auth.lastName ?? ''}`.trim() || 'there';

    await emailService.sendWelcome({
      userName,
      userEmail: auth.email,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to send welcome email');
  }
}
