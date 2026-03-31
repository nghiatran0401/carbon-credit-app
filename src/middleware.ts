import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkGlobalRateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Skip rate limiting for the rate-limited page itself to avoid redirect loops
  if (request.nextUrl.pathname === '/rate-limited') {
    return await updateSession(request);
  }

  const rateLimited = await checkGlobalRateLimit(request);

  if (rateLimited) {
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

    // Return JSON for API routes
    if (isApiRoute) return rateLimited;

    // Rewrite to the rate-limited page for browser requests
    const retryAfter = rateLimited.headers.get('Retry-After') || '60';
    const url = request.nextUrl.clone();
    url.pathname = '/rate-limited';
    url.searchParams.set('retry', retryAfter);

    const response = NextResponse.rewrite(url);
    response.headers.set('Retry-After', retryAfter);
    return response;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
