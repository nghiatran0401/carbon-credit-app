import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getSupabaseUser: vi
    .fn()
    .mockResolvedValue({ id: 'supabase-user-789', email: 'newuser@test.com' }),
  handleRouteError: vi.fn().mockImplementation((_err: unknown, msg: string) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status: 500 });
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  RATE_LIMITS: {
    auth: { limit: 10, windowSeconds: 60 },
    register: { limit: 5, windowSeconds: 60 },
    checkout: { limit: 10, windowSeconds: 60 },
    api: { limit: 100, windowSeconds: 60 },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 99,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company,
          role: 'USER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          emailVerified: true,
        }),
      ),
    },
  },
}));

import { POST as registerPOST } from '@/app/api/auth/register/route';

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/auth/register creates a user with Supabase session', async () => {
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        company: 'TestCo',
      }),
    });
    const res = await registerPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data).not.toHaveProperty('passwordHash');
    expect(data).not.toHaveProperty('password');
  });

  it('POST /api/auth/register rejects when email already exists', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 1,
      email: 'existing@test.com',
    } as never);

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'User' }),
    });
    const res = await registerPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('already exists');
  });

  it('POST /api/auth/register rejects unauthenticated requests', async () => {
    const { getSupabaseUser } = await import('@/lib/auth');
    vi.mocked(getSupabaseUser).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'User' }),
    });
    const res = await registerPOST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Unauthorized');
  });
});
