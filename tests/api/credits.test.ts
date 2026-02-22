import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockCredit } = vi.hoisted(() => ({
  mockCredit: {
    id: 1,
    forestId: 1,
    vintage: 2024,
    certification: 'Gold Standard',
    totalCredits: 1000,
    availableCredits: 1000,
    pricePerCredit: 10.5,
    symbol: 'tCO₂',
    retiredCredits: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    forest: { id: 1, name: 'Test Forest' },
  },
}));

vi.mock('@/lib/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireAdmin: vi.fn().mockResolvedValue({
      id: 1,
      email: 'admin@test.com',
      role: 'ADMIN',
      emailVerified: true,
      supabaseUserId: 'admin-123',
    }),
    isAuthError: (r: unknown) => r instanceof NextResponse,
    handleRouteError: vi.fn().mockImplementation((_err: unknown, msg: string) => {
      return NextResponse.json({ error: msg }, { status: 500 });
    }),
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    carbonCredit: {
      findMany: vi.fn().mockResolvedValue([mockCredit]),
      create: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...mockCredit, ...data, id: 10 }),
        ),
      update: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...mockCredit, ...data }),
        ),
      delete: vi.fn().mockResolvedValue(mockCredit),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
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

import { GET, POST, PUT, DELETE } from '@/app/api/credits/route';

const mockNextRequest = (body: Record<string, unknown>) => {
  return new NextRequest('http://localhost/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

describe('Credits API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/credits returns credits', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('forestId');
  });

  it('POST /api/credits creates a credit', async () => {
    const req = mockNextRequest({
      forestId: 1,
      vintage: 2024,
      certification: 'Gold Standard',
      totalCredits: 1000,
      availableCredits: 1000,
      pricePerCredit: 10.5,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.forestId).toBe(1);
  });

  it('PUT /api/credits updates a credit', async () => {
    const req = mockNextRequest({
      id: 1,
      certification: 'VCS',
      pricePerCredit: 12.0,
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.certification).toBe('VCS');
  });

  it('DELETE /api/credits deletes a credit', async () => {
    const req = mockNextRequest({ id: 1 });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
