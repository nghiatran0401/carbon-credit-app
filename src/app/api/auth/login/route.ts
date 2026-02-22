import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rateLimited = checkRateLimit(req, RATE_LIMITS.auth, 'auth-login');
  if (rateLimited) return rateLimited;
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      id: supabaseUser.id,
      email: supabaseUser.email,
      emailVerified: supabaseUser.email_confirmed_at !== null,
    });
  } catch (error) {
    console.error('Authentication check failed:', error);
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 });
  }
}
