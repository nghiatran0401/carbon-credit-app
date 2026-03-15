import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, isAuthError, requireAuth } from '@/lib/auth';
import { notificationService } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const updatedCount = await notificationService.markAllRead(auth.id);
    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    return handleRouteError(error, 'Failed to mark notifications as read');
  }
}
