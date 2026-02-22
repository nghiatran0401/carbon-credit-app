import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification-service';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';

function validatePaginationParams(
  limit: string | null,
  offset: string | null,
): { limit: number; offset: number } {
  const parsedLimit = limit ? parseInt(limit) : 50;
  const parsedOffset = offset ? parseInt(offset) : 0;

  return {
    limit: Math.max(1, Math.min(100, isNaN(parsedLimit) ? 50 : parsedLimit)),
    offset: Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const url = new URL(req.url);
    const { limit, offset } = validatePaginationParams(
      url.searchParams.get('limit'),
      url.searchParams.get('offset'),
    );

    const [notifications, unreadCount] = await Promise.all([
      notificationService.getUserNotifications(auth.id, limit, offset),
      notificationService.getUnreadCount(auth.id),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit,
        total: notifications.length,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch notifications');
  }
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { userId, type, title, message, data } = body;

    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (!type) missingFields.push('type');
    if (!title) missingFields.push('title');
    if (!message) missingFields.push('message');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    if (typeof userId !== 'number' || userId <= 0) {
      return NextResponse.json({ error: 'userId must be a positive number' }, { status: 400 });
    }

    if (typeof type !== 'string' || !['order', 'credit', 'system', 'payment'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: order, credit, system, payment' },
        { status: 400 },
      );
    }

    if (typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message must be a non-empty string' }, { status: 400 });
    }

    const notification = await notificationService.createNotification({
      userId,
      type: type as 'order' | 'credit' | 'system' | 'payment',
      title: title.trim(),
      message: message.trim(),
      data: data || {},
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create notification');
  }
}
