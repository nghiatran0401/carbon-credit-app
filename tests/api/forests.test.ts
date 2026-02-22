import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockForest } = vi.hoisted(() => ({
  mockForest: {
    id: 1,
    name: 'Test Forest',
    location: 'Test Location',
    type: 'Rainforest',
    area: 123.45,
    description: 'A test forest.',
    status: 'ACTIVE',
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    deletedAt: null,
    credits: [],
    bookmarks: [],
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
    forest: {
      findMany: vi.fn().mockResolvedValue([mockForest]),
      create: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...mockForest, ...data, id: 10 }),
        ),
      update: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...mockForest, ...data }),
        ),
      delete: vi.fn().mockResolvedValue(mockForest),
    },
  },
}));

vi.mock('@/lib/validation', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const { NextResponse } = require('next/server');
  return {
    ...actual,
    isValidationError: (r: unknown) => r instanceof NextResponse,
  };
});

import { GET, POST, PUT, DELETE } from '@/app/api/forests/route';

const mockNextRequest = (body: Record<string, unknown>) => {
  return new NextRequest('http://localhost/api/forests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

describe('Forests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/forests returns forests', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
  });

  it('POST /api/forests creates a forest', async () => {
    const req = mockNextRequest({
      name: 'New Forest',
      location: 'Test Location',
      type: 'Mangrove',
      area: 100,
      description: 'A mangrove forest.',
      status: 'ACTIVE',
      lastUpdated: new Date().toISOString(),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('New Forest');
  });

  it('PUT /api/forests updates a forest', async () => {
    const req = mockNextRequest({
      id: 1,
      name: 'Updated Forest',
      location: 'New Location',
      type: 'Wetland',
      area: 200,
      description: 'Updated desc.',
      status: 'MONITORING',
      lastUpdated: new Date().toISOString(),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Updated Forest');
  });

  it('DELETE /api/forests deletes a forest', async () => {
    const req = mockNextRequest({ id: 1 });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
