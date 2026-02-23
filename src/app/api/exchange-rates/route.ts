import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rates = await prisma.exchangeRate.findMany();
    return NextResponse.json(rates, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
  }
}
