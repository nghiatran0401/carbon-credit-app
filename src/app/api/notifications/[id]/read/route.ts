import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, isAuthError, requireAuth } from '@/lib/auth';
import { notificationService } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const params = await context.params;
    const notification = await notificationService.markRead(auth.id, params.id);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    return handleRouteError(error, 'Failed to mark notification as read');
  }
}
