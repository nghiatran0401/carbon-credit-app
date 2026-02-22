import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { mockUser, mockCartItem, mockSession } = vi.hoisted(() => ({
  mockUser: {
    id: 1,
    email: 'user@test.com',
    role: 'USER',
    emailVerified: true,
    supabaseUserId: 'user-123',
  },
  mockCartItem: {
    id: 1,
    userId: 1,
    carbonCreditId: 1,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    addedAt: new Date(),
    carbonCredit: {
      id: 1,
      pricePerCredit: 10.5,
      forest: { name: 'Test Forest' },
    },
  },
  mockSession: {
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/test',
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
  })),
}));

vi.mock('@/lib/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_123',
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
  },
}));

vi.mock('@/lib/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireAuth: vi.fn().mockResolvedValue(mockUser),
    isAuthError: (r: unknown) => r instanceof NextResponse,
    handleRouteError: vi.fn().mockImplementation((_err: unknown, msg: string) => {
      return NextResponse.json({ error: msg }, { status: 500 });
    }),
  };
});

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  RATE_LIMITS: { checkout: { limit: 10, windowSeconds: 60 } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cartItem: {
      findMany: vi.fn().mockResolvedValue([mockCartItem]),
    },
    order: {
      create: vi.fn().mockResolvedValue({
        id: 1,
        userId: mockUser.id,
        status: 'PENDING',
        totalPrice: 21,
        totalCredits: 2,
        currency: 'USD',
        buyer: String(mockUser.id),
        seller: 'Test Forest',
        items: [],
      }),
    },
    payment: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
    orderHistory: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
  },
}));

import { POST } from '@/app/api/checkout/route';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

describe('Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(null);
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(prisma.cartItem.findMany).mockResolvedValue([mockCartItem]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates a checkout session', async () => {
    const req = new NextRequest('http://localhost/api/checkout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      sessionId: 'cs_test_123',
      checkoutUrl: 'https://checkout.stripe.com/test',
    });
    expect(prisma.order.create).toHaveBeenCalled();
    expect(prisma.payment.create).toHaveBeenCalled();
    expect(prisma.orderHistory.create).toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    const { NextResponse } = await import('next/server');
    const errResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    vi.mocked(requireAuth).mockResolvedValueOnce(errResponse);

    const req = new NextRequest('http://localhost/api/checkout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when cart is empty', async () => {
    vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost/api/checkout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Cart is empty');
  });

  it('returns 400 when cart has invalid prices (pricePerCredit <= 0)', async () => {
    const invalidItem = {
      ...mockCartItem,
      carbonCredit: { ...mockCartItem.carbonCredit, pricePerCredit: 0 },
    };
    vi.mocked(prisma.cartItem.findMany).mockResolvedValueOnce([invalidItem]);

    const req = new NextRequest('http://localhost/api/checkout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid price for credit/);
  });

  it('rate limiting returns 429', async () => {
    const { NextResponse } = await import('next/server');
    const rateLimitResponse = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    vi.mocked(checkRateLimit).mockReturnValueOnce(rateLimitResponse);

    const req = new NextRequest('http://localhost/api/checkout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it('handles errors gracefully and returns 500', async () => {
    vi.mocked(prisma.cartItem.findMany).mockRejectedValueOnce(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/checkout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to create checkout session');
  });
});
