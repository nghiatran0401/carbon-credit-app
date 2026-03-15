import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    id: 1,
    email: 'user@test.com',
    role: 'USER',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    supabaseUserId: 'supabase-1',
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

vi.mock('@/lib/notification-service', () => ({
  notificationService: {
    listUserNotifications: vi.fn().mockResolvedValue({
      data: [{ id: 'n1', title: 'test', message: 'hello', status: 'unread' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getUnreadCount: vi.fn().mockResolvedValue(1),
    markAllRead: vi.fn().mockResolvedValue(1),
    markRead: vi.fn().mockResolvedValue({ id: 'n1', status: 'read' }),
  },
}));

import { GET as listNotifications } from '@/app/api/notifications/route';
import { GET as unreadCount } from '@/app/api/notifications/unread-count/route';
import { PATCH as readAll } from '@/app/api/notifications/read-all/route';
import { PATCH as markRead } from '@/app/api/notifications/[id]/read/route';

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/notifications returns paginated notifications', async () => {
    const req = new NextRequest('http://localhost/api/notifications?status=all');
    const res = await listNotifications(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
  });

  it('GET /api/notifications/unread-count returns unread count', async () => {
    const req = new NextRequest('http://localhost/api/notifications/unread-count');
    const res = await unreadCount(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.unreadCount).toBe(1);
  });

  it('PATCH /api/notifications/read-all marks notifications as read', async () => {
    const req = new NextRequest('http://localhost/api/notifications/read-all', { method: 'PATCH' });
    const res = await readAll(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.updatedCount).toBe(1);
  });

  it('PATCH /api/notifications/:id/read marks notification as read', async () => {
    const req = new NextRequest('http://localhost/api/notifications/n1/read', { method: 'PATCH' });
    const res = await markRead(req, { params: Promise.resolve({ id: 'n1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.notification.status).toBe('read');
  });
});
