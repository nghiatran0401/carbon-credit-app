import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RateLimitConfig {
  /** Max requests allowed within the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

function createRatelimit(config: RateLimitConfig) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
    analytics: true,
  });
}

export const RATE_LIMITS = {
  global: { limit: 60, windowSeconds: 60 } as RateLimitConfig,
  auth: { limit: 5, windowSeconds: 60 } as RateLimitConfig,
  checkout: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
} as const;

const ratelimiters = new Map<string, Ratelimit>();

function getRatelimiter(prefix: string, config: RateLimitConfig): Ratelimit {
  const key = `${prefix}:${config.limit}:${config.windowSeconds}`;
  let rl = ratelimiters.get(key);
  if (!rl) {
    rl = createRatelimit(config);
    ratelimiters.set(key, rl);
  }
  return rl;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429 NextResponse if exceeded.
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  prefix: string = '',
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const identifier = `${prefix}:${ip}`;
  const rl = getRatelimiter(prefix, config);

  const { success, limit, remaining, reset } = await rl.limit(identifier);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
        },
      },
    );
  }

  return null;
}

/**
 * Global rate limit check for middleware. Returns a 429 Response if exceeded, null otherwise.
 */
export async function checkGlobalRateLimit(req: NextRequest): Promise<NextResponse | null> {
  return checkRateLimit(req, RATE_LIMITS.global, 'global');
}
