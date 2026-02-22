import { vi } from 'vitest';
import { NextResponse } from 'next/server';

export const mockAdminUser = {
  id: 1,
  email: 'admin@test.com',
  role: 'ADMIN',
  emailVerified: true,
  supabaseUserId: 'supabase-admin-123',
};

export const mockRegularUser = {
  id: 2,
  email: 'user@test.com',
  role: 'USER',
  emailVerified: true,
  supabaseUserId: 'supabase-user-456',
};

export function setupAuthMocks(user = mockAdminUser) {
  vi.mock('@/lib/auth', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...actual,
      getAuthenticatedUser: vi.fn().mockResolvedValue(user),
      getSupabaseUser: vi.fn().mockResolvedValue({ id: user.supabaseUserId, email: user.email }),
      requireAuth: vi.fn().mockResolvedValue(user),
      requireAdmin: vi
        .fn()
        .mockResolvedValue(
          user.role === 'ADMIN'
            ? user
            : NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
        ),
      requireOwnershipOrAdmin: vi
        .fn()
        .mockImplementation(async (_req: unknown, resourceUserId: number) => {
          if (user.id === resourceUserId || user.role === 'ADMIN') return user;
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }),
      isAuthError: (result: unknown) => result instanceof NextResponse,
    };
  });
}

export function setupRateLimitMock() {
  vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockReturnValue(null),
    RATE_LIMITS: {
      auth: { limit: 10, windowSeconds: 60 },
      register: { limit: 5, windowSeconds: 60 },
      checkout: { limit: 10, windowSeconds: 60 },
      api: { limit: 100, windowSeconds: 60 },
    },
  }));
}
