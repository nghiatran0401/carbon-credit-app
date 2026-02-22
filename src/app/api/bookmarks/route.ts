import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: auth.id },
      include: { forest: { include: { credits: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(bookmarks);
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch bookmarks');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const { forestId } = await req.json();
    if (forestId === undefined)
      return NextResponse.json({ error: 'Missing forestId' }, { status: 400 });

    const parsedForestId = Number(forestId);
    if (isNaN(parsedForestId))
      return NextResponse.json({ error: 'forestId is not a valid number' }, { status: 400 });

    const existing = await prisma.bookmark.findFirst({
      where: { userId: auth.id, forestId: parsedForestId },
    });
    if (existing) return NextResponse.json(existing);

    const bookmark = await prisma.bookmark.create({
      data: { userId: auth.id, forestId: parsedForestId },
    });
    return NextResponse.json(bookmark);
  } catch (error) {
    return handleRouteError(error, 'Failed to create bookmark');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const { forestId } = await req.json();
    if (!forestId) return NextResponse.json({ error: 'Missing forestId' }, { status: 400 });

    await prisma.bookmark.deleteMany({ where: { userId: auth.id, forestId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete bookmark');
  }
}
