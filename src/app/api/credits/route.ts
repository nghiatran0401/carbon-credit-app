import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/lib/notification-service';
import { requireAdmin, isAuthError, handleRouteError } from '@/lib/auth';
import {
  carbonCreditCreateSchema,
  carbonCreditUpdateSchema,
  validateBody,
  isValidationError,
} from '@/lib/validation';

export async function GET() {
  try {
    const credits = await prisma.carbonCredit.findMany({
      include: {
        forest: true,
      },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(credits);
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch credits');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(carbonCreditCreateSchema, body);
    if (isValidationError(validated)) return validated;

    const credit = await prisma.carbonCredit.create({
      data: validated,
      include: {
        forest: true,
      },
    });

    try {
      const users = await prisma.user.findMany({
        where: { role: 'USER' },
        select: { id: true },
      });

      for (const user of users) {
        try {
          await notificationService.createCreditNotification(
            user.id,
            credit.id,
            credit.forest?.name || 'Unknown Forest',
            `New ${credit.certification} credits available (${credit.availableCredits} credits)`,
          );
        } catch (notifError) {
          console.error(`Failed to create notification for user ${user.id}:`, notifError);
        }
      }
    } catch (notifError) {
      console.error('Error creating credit notifications:', notifError);
    }

    return NextResponse.json(credit);
  } catch (error) {
    return handleRouteError(error, 'Failed to create credit');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(carbonCreditUpdateSchema, body);
    if (isValidationError(validated)) return validated;

    const { id, ...data } = validated;
    const credit = await prisma.carbonCredit.update({ where: { id }, data });
    return NextResponse.json(credit);
  } catch (error) {
    return handleRouteError(error, 'Failed to update credit');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.carbonCredit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete credit');
  }
}
