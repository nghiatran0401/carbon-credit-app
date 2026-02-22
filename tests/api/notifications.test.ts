import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUser, mockNotification } = vi.hoisted(() => ({
  mockUser: {
    id: 1,
    email: 'user@test.com',
    role: 'USER',
    emailVerified: true,
    supabaseUserId: 'user-123',
  },
  mockNotification: {
    id: 'notif-1',
    userId: 1,
    type: 'order',
    title: 'Test Notification',
    message: 'This is a test',
    data: { orderId: 123 },
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    getUserNotifications: vi.fn().mockResolvedValue([mockNotification]),
    getUnreadCount: vi.fn().mockResolvedValue(1),
    createNotification: vi
      .fn()
      .mockImplementation(async (data: Record<string, unknown>) => ({
        ...mockNotification,
        ...data,
        id: 'notif-new',
      })),
    markAsRead: vi
      .fn()
      .mockResolvedValue({ ...mockNotification, read: true, readAt: new Date().toISOString() }),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

import { GET, POST } from '@/app/api/notifications/route';
import { PUT } from '@/app/api/notifications/[id]/route';
import { POST as markAllAsRead } from '@/app/api/notifications/mark-all-read/route';

const mockRequest = (
  body: Record<string, unknown>,
  method = 'POST',
  searchParams?: Record<string, string>,
) => {
  const url = new URL('http://localhost/api/notifications');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
};

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return notifications for authenticated user', async () => {
      const req = mockRequest({}, 'GET');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('unreadCount');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.notifications)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const req = mockRequest({}, 'GET', { limit: '10', offset: '5' });
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(5);
    });

    it('should use default pagination when not provided', async () => {
      const req = mockRequest({}, 'GET');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.limit).toBe(50);
      expect(data.pagination.offset).toBe(0);
    });
  });

  describe('POST /api/notifications', () => {
    it('should return error when required fields are missing', async () => {
      const req = mockRequest({ userId: 1 });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it('should create notification with valid data', async () => {
      const req = mockRequest({
        userId: 1,
        type: 'order',
        title: 'Test Notification',
        message: 'This is a test notification',
        data: { orderId: 123 },
      });
      const response = await POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.title).toBe('Test Notification');
    });

    it('should validate notification type', async () => {
      const req = mockRequest({
        userId: 1,
        type: 'invalid',
        title: 'Test',
        message: 'Test message',
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it('should reject non-positive userId', async () => {
      const req = mockRequest({
        userId: -1,
        type: 'order',
        title: 'Test',
        message: 'Test message',
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/notifications/[id]', () => {
    it('should mark notification as read', async () => {
      const req = new NextRequest('http://localhost/api/notifications/notif-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead' }),
      });
      const response = await PUT(req, { params: { id: 'notif-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.read).toBe(true);
    });

    it('should return error for invalid action', async () => {
      const req = new NextRequest('http://localhost/api/notifications/notif-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalidAction' }),
      });
      const response = await PUT(req, { params: { id: 'notif-1' } });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read for authenticated user', async () => {
      const req = new NextRequest('http://localhost/api/notifications/mark-all-read', {
        method: 'POST',
      });
      const response = await markAllAsRead(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const url = new URL('http://localhost/api/notifications');
      const req = new NextRequest(url, {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(req);
      expect([400, 500]).toContain(response.status);
    });
  });
});
