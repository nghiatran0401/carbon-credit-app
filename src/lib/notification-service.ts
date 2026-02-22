import { prisma } from './prisma';
import type { Notification, NotificationData, User } from '@/types';
import type { Prisma } from '@prisma/client';

export interface CreateNotificationData {
  userId: number;
  type: 'order' | 'credit' | 'system' | 'payment';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  private prisma = prisma;

  private validateNotificationData(data: CreateNotificationData): void {
    if (!data.userId || data.userId <= 0) {
      throw new Error('Invalid user ID');
    }
    if (!data.type || !['order', 'credit', 'system', 'payment'].includes(data.type)) {
      throw new Error('Invalid notification type');
    }
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (!data.message || data.message.trim().length === 0) {
      throw new Error('Message is required');
    }
    if (data.title.length > 200) {
      throw new Error('Title too long (max 200 characters)');
    }
    if (data.message.length > 1000) {
      throw new Error('Message too long (max 1000 characters)');
    }
  }

  private convertPrismaNotification(notification: {
    id: string;
    userId: number;
    type: string;
    title: string;
    message: string;
    data: unknown;
    read: boolean;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  }): Notification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as 'order' | 'credit' | 'system' | 'payment',
      title: notification.title,
      message: notification.message,
      data: notification.data as NotificationData | undefined,
      read: notification.read,
      readAt: notification.readAt?.toISOString(),
      createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: notification.updatedAt?.toISOString() || new Date().toISOString(),
      user: notification.user
        ? ({
            ...notification.user,
            createdAt: notification.user.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: notification.user.updatedAt?.toISOString() || new Date().toISOString(),
          } as User)
        : undefined,
    };
  }

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      this.validateNotificationData(data);

      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title.trim(),
          message: data.message.trim(),
          data: (data.data || {}) as Prisma.InputJsonValue,
        },
        include: {
          user: true,
        },
      });

      const notificationData = this.convertPrismaNotification(notification);

      // Send real-time notification via WebSocket (non-blocking)
      this.sendWebSocketNotification(data.userId, notificationData).catch((error) => {
        console.error('Failed to send WebSocket notification:', error);
      });

      return notificationData;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  private async sendWebSocketNotification(
    userId: number,
    notification: Notification,
  ): Promise<void> {
    // WebSocket notifications handled by polling - no action needed
  }

  async getUserNotifications(userId: number, limit = 50, offset = 0): Promise<Notification[]> {
    try {
      if (!userId || userId <= 0) {
        throw new Error('Invalid user ID');
      }
      if (limit < 1 || limit > 100) {
        throw new Error('Invalid limit (must be between 1 and 100)');
      }
      if (offset < 0) {
        throw new Error('Invalid offset (must be non-negative)');
      }

      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: true,
        },
      });

      return notifications.map((notification) => this.convertPrismaNotification(notification));
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      if (!userId || userId <= 0) {
        throw new Error('Invalid user ID');
      }

      return await this.prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      if (!notificationId || notificationId.trim().length === 0) {
        throw new Error('Invalid notification ID');
      }

      const notification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      return this.convertPrismaNotification(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: number): Promise<void> {
    try {
      if (!userId || userId <= 0) {
        throw new Error('Invalid user ID');
      }

      await this.prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Helper methods for creating specific types of notifications
  async createOrderNotification(
    userId: number,
    orderId: number,
    event: string,
    message: string,
  ): Promise<Notification> {
    return await this.createNotification({
      userId,
      type: 'order',
      title: `Order Update - #${orderId}`,
      message,
      data: { orderId, event },
    });
  }

  async createCreditNotification(
    userId: number,
    creditId: number,
    forestName: string,
    event: string,
  ): Promise<Notification> {
    return await this.createNotification({
      userId,
      type: 'credit',
      title: `New Credits Available`,
      message: `${event} in ${forestName}`,
      data: { creditId, forestName, event },
    });
  }

  async createPaymentNotification(
    userId: number,
    orderId: number,
    status: string,
    message: string,
  ): Promise<Notification> {
    return await this.createNotification({
      userId,
      type: 'payment',
      title: `Payment ${status}`,
      message,
      data: { orderId, status },
    });
  }

  async createSystemNotification(
    userId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return await this.createNotification({
      userId,
      type: 'system',
      title,
      message,
    });
  }

  // Batch operations for better performance
  async createBatchNotifications(notifications: CreateNotificationData[]): Promise<Notification[]> {
    try {
      const results: Notification[] = [];

      for (const notificationData of notifications) {
        try {
          const notification = await this.createNotification(notificationData);
          results.push(notification);
        } catch (error) {
          console.error(
            `Failed to create notification for user ${notificationData.userId}:`,
            error,
          );
          // Continue with other notifications even if one fails
        }
      }

      return results;
    } catch (error) {
      console.error('Error creating batch notifications:', error);
      throw error;
    }
  }

  // Cleanup old notifications (for maintenance)
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          read: true, // Only delete read notifications
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
