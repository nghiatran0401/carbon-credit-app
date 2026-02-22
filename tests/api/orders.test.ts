import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUser, mockOrder } = vi.hoisted(() => ({
  mockUser: {
    id: 1,
    email: 'admin@test.com',
    role: 'ADMIN',
    emailVerified: true,
    supabaseUserId: 'admin-123',
  },
  mockOrder: {
    id: 1,
    userId: 1,
    status: 'PENDING',
    totalPrice: 105,
    totalCredits: 10,
    currency: 'USD',
    buyer: '1',
    seller: 'Platform',
    items: [{ id: 1, carbonCreditId: 1, quantity: 10, pricePerCredit: 10.5, subtotal: 105 }],
    payments: [],
    orderHistory: [],
    user: { id: 1, email: 'admin@test.com' },
  },
}));

vi.mock('@/lib/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireAuth: vi.fn().mockResolvedValue(mockUser),
    requireAdmin: vi.fn().mockResolvedValue(mockUser),
    requireOwnershipOrAdmin: vi.fn().mockResolvedValue(mockUser),
    isAuthError: (r: unknown) => r instanceof NextResponse,
    handleRouteError: vi.fn().mockImplementation((_err: unknown, msg: string) => {
      return NextResponse.json({ error: msg }, { status: 500 });
    }),
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: vi.fn().mockResolvedValue([mockOrder]),
      findUnique: vi.fn().mockResolvedValue(mockOrder),
      create: vi.fn().mockResolvedValue({ ...mockOrder, id: 10, items: mockOrder.items }),
      update: vi.fn().mockResolvedValue({ ...mockOrder, status: 'COMPLETED' }),
      delete: vi.fn().mockResolvedValue(mockOrder),
    },
    orderHistory: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
  },
}));

vi.mock('@/lib/notification-service', () => ({
  notificationService: {
    createOrderNotification: vi.fn().mockResolvedValue(undefined),
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

import { GET, POST, PUT, DELETE } from '@/app/api/orders/route';

const mockNextRequest = (body: Record<string, unknown>, url = 'http://localhost/api/orders') => {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/orders returns orders', async () => {
    const req = new NextRequest('http://localhost/api/orders');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /api/orders creates an order', async () => {
    const req = mockNextRequest({
      status: 'PENDING',
      items: [{ carbonCreditId: 1, quantity: 10, pricePerCredit: 10.5 }],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id');
  });

  it('POST /api/orders validates items', async () => {
    const req = mockNextRequest({
      status: 'PENDING',
      items: [],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('PUT /api/orders updates an order', async () => {
    const req = mockNextRequest({ id: 1, status: 'COMPLETED' });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });

  it('PUT /api/orders validates id', async () => {
    const req = mockNextRequest({ status: 'COMPLETED' });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('DELETE /api/orders deletes an order', async () => {
    const req = mockNextRequest({ id: 1 });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
