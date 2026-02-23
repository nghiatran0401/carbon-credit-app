import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const forestId = Number(id);
    if (!forestId || Number.isNaN(forestId)) {
      return NextResponse.json({ error: 'Invalid forest ID' }, { status: 400 });
    }

    const credit = await prisma.carbonCredit.findFirst({
      where: { forestId },
      include: { forest: true },
    });

    if (!credit) {
      return NextResponse.json({ error: 'No credit found for this forest' }, { status: 404 });
    }

    return NextResponse.json(credit);
  } catch (error) {
    console.error('Failed to fetch credit for forest:', error);
    return NextResponse.json({ error: 'Failed to fetch credit' }, { status: 500 });
  }
}
