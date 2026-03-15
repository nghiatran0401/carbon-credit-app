import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, isAuthError, requireAuth } from '@/lib/auth';
import { notificationService } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 20);
    const status = (searchParams.get('status') || 'all') as 'unread' | 'read' | 'archived' | 'all';
    const type = searchParams.get('type') || undefined;

    const result = await notificationService.listUserNotifications({
      userId: auth.id,
      page,
      limit,
      status,
      type: type as
        | 'order_paid'
        | 'order_failed'
        | 'order_cancelled'
        | 'order_status_updated'
        | 'certificate_issued'
        | 'credits_retired'
        | 'audit_created'
        | 'anchor_confirmed'
        | 'webhook_failed'
        | undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch notifications');
  }
}
