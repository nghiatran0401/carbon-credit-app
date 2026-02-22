import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUser, mockBookmark, mockForest } = vi.hoisted(() => ({
  mockUser: {
    id: 1,
    email: 'user@test.com',
    role: 'USER',
    emailVerified: true,
    supabaseUserId: 'user-123',
  },
  mockBookmark: {
    id: 1,
    userId: 1,
    forestId: 10,
    createdAt: new Date().toISOString(),
    forest: null as unknown,
  },
  mockForest: {
    id: 10,
    name: 'Test Forest',
    credits: [],
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
    bookmark: {
      findMany: vi.fn().mockResolvedValue([{ ...mockBookmark, forest: mockForest }]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 1,
          userId: data.userId,
          forestId: data.forestId,
          createdAt: new Date().toISOString(),
          forest: mockForest,
        }),
      ),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

import { GET, POST, DELETE } from '@/app/api/bookmarks/route';

const mockNextRequest = (
  body: Record<string, unknown>,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
) => {
  return new NextRequest('http://localhost/api/bookmarks', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
};

describe('Bookmarks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/bookmarks', () => {
    it("returns user's bookmarks with forest data", async () => {
      const req = mockNextRequest({}, 'GET');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('forest');
      expect(data[0].forest).toHaveProperty('name', 'Test Forest');
    });

    it('returns 401 when not authenticated', async () => {
      const { requireAuth } = await import('@/lib/auth');
      const { NextResponse } = await import('next/server');
      vi.mocked(requireAuth).mockResolvedValueOnce(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      );

      const req = mockNextRequest({}, 'GET');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/bookmarks', () => {
    it('creates a bookmark successfully', async () => {
      const req = mockNextRequest({ forestId: 10 }, 'POST');
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('id');
      expect(data.userId).toBe(mockUser.id);
      expect(data.forestId).toBe(10);
    });

    it('returns existing bookmark if already bookmarked', async () => {
      const { prisma } = await import('@/lib/prisma');
      const existing = { ...mockBookmark, forest: mockForest };
      vi.mocked(prisma.bookmark.findFirst).mockResolvedValueOnce(existing as never);

      const req = mockNextRequest({ forestId: 10 }, 'POST');
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(mockBookmark.id);
      expect(data.forestId).toBe(10);
    });

    it('returns 400 when forestId is missing', async () => {
      const req = mockNextRequest({}, 'POST');
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Missing forestId');
    });

    it('returns 401 when not authenticated', async () => {
      const { requireAuth } = await import('@/lib/auth');
      const { NextResponse } = await import('next/server');
      vi.mocked(requireAuth).mockResolvedValueOnce(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      );

      const req = mockNextRequest({ forestId: 10 }, 'POST');
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/bookmarks', () => {
    it('deletes a bookmark successfully', async () => {
      const req = mockNextRequest({ forestId: 10 }, 'DELETE');
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('returns 401 when not authenticated', async () => {
      const { requireAuth } = await import('@/lib/auth');
      const { NextResponse } = await import('next/server');
      vi.mocked(requireAuth).mockResolvedValueOnce(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      );

      const req = mockNextRequest({ forestId: 10 }, 'DELETE');
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });
  });

  describe('Error handling', () => {
    it('GET returns 500 on error', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.bookmark.findMany).mockRejectedValueOnce(new Error('DB error'));

      const req = mockNextRequest({}, 'GET');
      const res = await GET(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to fetch bookmarks');
    });

    it('POST returns 500 on error', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.bookmark.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.bookmark.create).mockRejectedValueOnce(new Error('DB error'));

      const req = mockNextRequest({ forestId: 10 }, 'POST');
      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to create bookmark');
    });

    it('DELETE returns 500 on error', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.bookmark.deleteMany).mockRejectedValueOnce(new Error('DB error'));

      const req = mockNextRequest({ forestId: 10 }, 'DELETE');
      const res = await DELETE(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to delete bookmark');
    });
  });
});
