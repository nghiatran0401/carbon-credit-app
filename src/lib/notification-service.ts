import { prisma } from '@/lib/prisma';
import type {
  NotificationEvent,
  NotificationPriority,
  NotificationType,
} from '@/lib/notification-events';
import { Prisma } from '@prisma/client';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type NotificationStatusFilter = 'unread' | 'read' | 'archived' | 'all';

type ListUserNotificationsParams = {
  userId: number;
  page?: number;
  limit?: number;
  status?: NotificationStatusFilter;
  type?: NotificationType;
};

type CreateNotificationInput = {
  userIds: number[];
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
};

function toPositiveInt(value: number | undefined, fallback: number) {
  if (!value || Number.isNaN(value) || value < 1) return fallback;
  return Math.floor(value);
}

function normalizeUserIds(userIds: number[]) {
  return Array.from(new Set(userIds.filter((id) => Number.isInteger(id) && id > 0)));
}

async function createSingleNotification(input: {
  userId: number;
  type: string;
  title: string;
  message: string;
  priority: string;
  entityType?: string;
  entityId?: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        dedupeKey: input.dedupeKey,
      },
    });

    if (existing) {
      return existing;
    }

    const notification = await tx.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority,
        entityType: input.entityType,
        entityId: input.entityId,
        dedupeKey: input.dedupeKey,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await tx.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: 'in_app',
        deliveryState: 'delivered',
      },
    });

    return notification;
  });
}

async function createNotificationForUsers(input: CreateNotificationInput) {
  const userIds = normalizeUserIds(input.userIds);
  if (!userIds.length) return [];

  const created = await Promise.all(
    userIds.map((userId) =>
      createSingleNotification({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority ?? 'info',
        entityType: input.entityType,
        entityId: input.entityId,
        dedupeKey: input.dedupeKey,
        metadata: input.metadata,
      }),
    ),
  );

  return created;
}

async function publishEvent(event: NotificationEvent) {
  return createNotificationForUsers({
    userIds: event.payload.recipients,
    type: event.type,
    title: event.payload.title,
    message: event.payload.message,
    priority: event.payload.priority,
    entityType: event.payload.entityType,
    entityId: event.payload.entityId,
    dedupeKey: event.dedupeKey,
    metadata: {
      ...event.payload.metadata,
      emittedAt: event.emittedAt,
    },
  });
}

async function listUserNotifications({
  userId,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  status = 'all',
  type,
}: ListUserNotificationsParams) {
  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const skip = (safePage - 1) * safeLimit;

  const where: Record<string, unknown> = { userId };
  if (status !== 'all') {
    where.status = status;
  }
  if (type) {
    where.type = type;
  }

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

async function markRead(userId: number, notificationId: string) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, status: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  if (existing.status === 'read') {
    return prisma.notification.findUnique({ where: { id: notificationId } });
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'read',
      readAt: new Date(),
      archivedAt: null,
    },
  });
}

async function markAllRead(userId: number) {
  const now = new Date();
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      status: 'unread',
    },
    data: {
      status: 'read',
      readAt: now,
    },
  });

  return result.count;
}

async function archive(userId: number, notificationId: string) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'archived',
      archivedAt: new Date(),
    },
  });
}

async function getUnreadCount(userId: number) {
  return prisma.notification.count({
    where: {
      userId,
      status: 'unread',
    },
  });
}

export const notificationService = {
  publishEvent,
  createNotificationForUsers,
  listUserNotifications,
  markRead,
  markAllRead,
  archive,
  getUnreadCount,
};
