import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Max requests allowed within the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429 NextResponse if exceeded.
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  prefix: string = '',
): NextResponse | null {
  cleanup();

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return null;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      },
    );
  }

  return null;
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
  register: { limit: 5, windowSeconds: 60 } as RateLimitConfig,
  checkout: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
  api: { limit: 100, windowSeconds: 60 } as RateLimitConfig,
} as const;
