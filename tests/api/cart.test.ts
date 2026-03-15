import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUser, mockCartItem } = vi.hoisted(() => ({
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
    carbonCredit: { id: 1, forest: { name: 'Test Forest' } },
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cartItem: {
      findMany: vi.fn().mockResolvedValue([mockCartItem]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...mockCartItem, ...data, id: 10 }),
        ),
      update: vi.fn().mockResolvedValue({ ...mockCartItem, quantity: 5 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock('@/lib/validation', async (importOriginal) => {
  const { NextResponse } = require('next/server');
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    isValidationError: (r: unknown) => r instanceof NextResponse,
  };
});

import { GET, POST, PUT, DELETE } from '@/app/api/cart/route';

const mockNextRequest = (body: Record<string, unknown>, method = 'POST') => {
  return new NextRequest('http://localhost/api/cart', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
};

describe('Cart API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/cart returns cart items', async () => {
    const req = new NextRequest('http://localhost/api/cart');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /api/cart adds an item', async () => {
    const req = mockNextRequest({ carbonCreditId: 1, quantity: 2 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.userId).toBe(mockUser.id);
  });

  it('POST /api/cart returns 400 for invalid data', async () => {
    const req = mockNextRequest({ carbonCreditId: 1, quantity: -1 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('PUT /api/cart updates item quantity', async () => {
    const req = mockNextRequest({ carbonCreditId: 1, quantity: 5 }, 'PUT');
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });

  it('DELETE /api/cart removes an item', async () => {
    const req = mockNextRequest({ carbonCreditId: 1 }, 'DELETE');
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('DELETE /api/cart returns 400 for missing carbonCreditId', async () => {
    const req = mockNextRequest({}, 'DELETE');
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
