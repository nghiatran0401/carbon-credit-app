import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotificationService } from '@/lib/notification-service';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new NotificationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNotification', () => {
    const mockNotificationData = {
      userId: 1,
      type: 'order' as const,
      title: 'Test Notification',
      message: 'This is a test notification',
      data: { orderId: 123 },
    };

    const mockPrismaNotification = {
      id: 'test-id',
      userId: 1,
      type: 'order',
      title: 'Test Notification',
      message: 'This is a test notification',
      data: { orderId: 123 },
      read: false,
      readAt: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      user: {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    };

    it('should create notification successfully', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockPrismaNotification);

      const result = await notificationService.createNotification(mockNotificationData);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(result.type).toBe('order');
      expect(result.read).toBe(false);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          type: 'order',
          title: 'Test Notification',
          message: 'This is a test notification',
          data: { orderId: 123 },
        },
        include: {
          user: true,
        },
      });
    });

    it('should handle different notification types', async () => {
      const types = ['order', 'credit', 'payment', 'system'] as const;

      for (const type of types) {
        mockPrisma.notification.create.mockResolvedValue({
          ...mockPrismaNotification,
          type,
        });

        const result = await notificationService.createNotification({
          ...mockNotificationData,
          type,
        });

        expect(result).toBeDefined();
        expect(result.type).toBe(type);
      }
    });

    it('should handle notification creation errors', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('Database error'));

      await expect(notificationService.createNotification(mockNotificationData)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch user notifications with pagination', async () => {
      const mockNotifications = [
        { id: '1', userId: 1, type: 'order', title: 'Test 1', read: false },
        { id: '2', userId: 1, type: 'credit', title: 'Test 2', read: true },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications(1, 10, 5);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '1',
        userId: 1,
        type: 'order',
        title: 'Test 1',
        read: false,
      });
      expect(result[1]).toMatchObject({
        id: '2',
        userId: 1,
        type: 'credit',
        title: 'Test 2',
        read: true,
      });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 5,
        include: {
          user: true,
        },
      });
    });

    it('should use default pagination when not provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await notificationService.getUserNotifications(1);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
        include: {
          user: true,
        },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await notificationService.getUnreadCount(1);

      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          read: false,
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockUpdatedNotification = {
        id: 'test-id',
        userId: 1,
        type: 'order',
        title: 'Test',
        message: 'Test message',
        read: true,
        readAt: new Date('2024-01-01T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        user: { id: 1, email: 'test@example.com' },
      };

      mockPrisma.notification.update.mockResolvedValue(mockUpdatedNotification);

      const result = await notificationService.markAsRead('test-id');

      expect(result.read).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
        include: {
          user: true,
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await notificationService.markAllAsRead(1);

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          read: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('Helper methods', () => {
    it('should create order notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'order-1',
        userId: 1,
        type: 'order',
        title: 'Order Update - #123',
        message: 'Order completed successfully',
        data: { orderId: 123, event: 'completed' },
        read: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, email: 'test@example.com' },
      });

      const result = await notificationService.createOrderNotification(
        1,
        123,
        'completed',
        'Order completed successfully',
      );

      expect(result.type).toBe('order');
      expect(result.title).toBe('Order Update - #123');
      expect((result.data as Record<string, unknown>)?.orderId).toBe(123);
    });

    it('should create credit notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'credit-1',
        userId: 1,
        type: 'credit',
        title: 'New Credits Available',
        message: 'New Gold Standard credits available in Test Forest',
        data: {
          creditId: 456,
          forestName: 'Test Forest',
          event: 'New Gold Standard credits available',
        },
        read: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, email: 'test@example.com' },
      });

      const result = await notificationService.createCreditNotification(
        1,
        456,
        'Test Forest',
        'New Gold Standard credits available',
      );

      expect(result.type).toBe('credit');
      expect(result.title).toBe('New Credits Available');
      expect((result.data as Record<string, unknown>)?.forestName).toBe('Test Forest');
    });

    it('should create payment notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'payment-1',
        userId: 1,
        type: 'payment',
        title: 'Payment Succeeded',
        message: 'Payment received for order #123',
        data: { orderId: 123, status: 'succeeded' },
        read: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, email: 'test@example.com' },
      });

      const result = await notificationService.createPaymentNotification(
        1,
        123,
        'succeeded',
        'Payment received for order #123',
      );

      expect(result.type).toBe('payment');
      expect(result.title).toBe('Payment Succeeded');
      expect((result.data as Record<string, unknown>)?.status).toBe('succeeded');
    });

    it('should create system notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'system-1',
        userId: 1,
        type: 'system',
        title: 'System Maintenance',
        message: 'Scheduled maintenance in 1 hour',
        data: {},
        read: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, email: 'test@example.com' },
      });

      const result = await notificationService.createSystemNotification(
        1,
        'System Maintenance',
        'Scheduled maintenance in 1 hour',
      );

      expect(result.type).toBe('system');
      expect(result.title).toBe('System Maintenance');
    });
  });
});
