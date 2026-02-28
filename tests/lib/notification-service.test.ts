import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, any>>,
  deliveries: [] as Array<Record<string, any>>,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn().mockImplementation(async (callback: any) => {
      const tx = {
        notification: {
          findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
            return (
              state.notifications.find(
                (item) =>
                  item.userId === where.userId &&
                  item.type === where.type &&
                  item.dedupeKey === where.dedupeKey,
              ) ?? null
            );
          }),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            const created = {
              id: `n_${state.notifications.length + 1}`,
              createdAt: new Date(),
              ...data,
            };
            state.notifications.push(created);
            return created;
          }),
        },
        notificationDelivery: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            const created = {
              id: `d_${state.deliveries.length + 1}`,
              ...data,
            };
            state.deliveries.push(created);
            return created;
          }),
        },
      };
      return callback(tx);
    }),
    notification: {
      count: vi.fn().mockImplementation(async ({ where }: any) => {
        return state.notifications.filter(
          (item) => item.userId === where.userId && item.status === where.status,
        ).length;
      }),
      updateMany: vi.fn().mockImplementation(async ({ where, data }: any) => {
        let count = 0;
        for (const notification of state.notifications) {
          if (notification.userId === where.userId && notification.status === where.status) {
            notification.status = data.status;
            notification.readAt = data.readAt;
            count++;
          }
        }
        return { count };
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: any) => {
        return state.notifications.filter((item) => item.userId === where.userId);
      }),
    },
  },
}));

import { buildNotificationEvent, notificationTypes } from '@/lib/notification-events';
import { notificationService } from '@/lib/notification-service';

describe('notificationService', () => {
  beforeEach(() => {
    state.notifications = [];
    state.deliveries = [];
  });

  it('deduplicates notification creation by dedupe key', async () => {
    const event = buildNotificationEvent({
      type: notificationTypes.ORDER_PAID,
      recipients: [1],
      title: 'Order paid',
      message: 'Order #1 paid',
      entityType: 'order',
      entityId: 1,
      stateVersion: 'completed',
    });

    const first = await notificationService.publishEvent(event);
    const second = await notificationService.publishEvent(event);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(state.notifications).toHaveLength(1);
    expect(state.deliveries).toHaveLength(1);
  });

  it('updates unread count consistency after markAllRead', async () => {
    state.notifications.push(
      { id: 'a', userId: 1, status: 'unread' },
      { id: 'b', userId: 1, status: 'unread' },
      { id: 'c', userId: 1, status: 'read' },
    );

    const before = await notificationService.getUnreadCount(1);
    const updated = await notificationService.markAllRead(1);
    const after = await notificationService.getUnreadCount(1);

    expect(before).toBe(2);
    expect(updated).toBe(2);
    expect(after).toBe(0);
  });
});
