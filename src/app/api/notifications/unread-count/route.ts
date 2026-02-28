import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, isAuthError, requireAuth } from '@/lib/auth';
import { notificationService } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const unreadCount = await notificationService.getUnreadCount(auth.id);
    return NextResponse.json({ unreadCount });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch unread notification count');
  }
}
