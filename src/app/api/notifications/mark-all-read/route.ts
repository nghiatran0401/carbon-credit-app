import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification-service';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    await notificationService.markAllAsRead(auth.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to mark all notifications as read');
  }
}
