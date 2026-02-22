import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification-service';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const { id } = params;
    const body = await req.json();
    const { action } = body;

    if (action === 'markAsRead') {
      const notification = await notificationService.markAsRead(id);
      return NextResponse.json(notification);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, 'Failed to update notification');
  }
}
