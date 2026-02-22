import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUserData } = vi.hoisted(() => ({
  mockUserData: {
    id: 1,
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    company: 'TestCo',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emailVerified: true,
    supabaseUserId: 'admin-123',
    orders: [],
  },
}));

vi.mock('@/lib/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireAuth: vi.fn().mockResolvedValue({
      id: 1,
      email: 'admin@test.com',
      role: 'ADMIN',
      emailVerified: true,
      supabaseUserId: 'admin-123',
    }),
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
    PUBLIC_USER_SELECT: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
      supabaseUserId: true,
    },
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(mockUserData),
      findMany: vi.fn().mockResolvedValue([mockUserData]),
      update: vi.fn().mockResolvedValue({ ...mockUserData, role: 'USER' }),
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

import { GET, PUT } from '@/app/api/users/route';

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/users returns users without passwordHash', async () => {
    const req = new NextRequest('http://localhost/api/users');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('email');
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('firstName');
    expect(data[0]).not.toHaveProperty('passwordHash');
    expect(data[0]).not.toHaveProperty('password');
  });

  it('GET /api/users with supabaseUserId returns single user', async () => {
    const req = new NextRequest('http://localhost/api/users?supabaseUserId=admin-123');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('email');
    expect(data).not.toHaveProperty('passwordHash');
  });

  it('GET /api/users with email returns single user', async () => {
    const req = new NextRequest('http://localhost/api/users?email=admin@test.com');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('email');
    expect(data).not.toHaveProperty('passwordHash');
  });

  it('PUT /api/users updates user role', async () => {
    const req = new NextRequest('http://localhost/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, role: 'user' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('role');
    expect(data).not.toHaveProperty('passwordHash');
  });

  it('PUT /api/users returns 400 for missing id', async () => {
    const req = new NextRequest('http://localhost/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
