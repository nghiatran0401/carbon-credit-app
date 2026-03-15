import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, handleRouteError } from '@/lib/auth';
import {
  carbonCreditCreateSchema,
  carbonCreditUpdateSchema,
  validateBody,
  isValidationError,
} from '@/lib/validation';
import { MARKETPLACE_PAGE_SIZE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get('page');
    const limit = Number(url.searchParams.get('limit')) || MARKETPLACE_PAGE_SIZE;
    const forestType = url.searchParams.get('forestType');
    const certification = url.searchParams.get('certification');
    const availability = url.searchParams.get('availability');
    const sortBy = url.searchParams.get('sortBy');

    const cacheHeaders = {
      'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    };

    if (!page) {
      const credits = await prisma.carbonCredit.findMany({
        include: { forest: true },
        orderBy: { id: 'asc' },
      });
      return NextResponse.json(credits, { headers: cacheHeaders });
    }

    const where: Record<string, unknown> = {};

    if (forestType && forestType !== 'all') {
      where.forest = { type: { equals: forestType, mode: 'insensitive' } };
    }
    if (certification && certification !== 'all') {
      where.certification = {
        contains: certification.replace(/-/g, ' '),
        mode: 'insensitive',
      };
    }
    if (availability === 'available') {
      where.availableCredits = { gt: 0 };
    } else if (availability === 'unavailable') {
      where.availableCredits = { lte: 0 };
    }

    let orderBy: Record<string, string> = { id: 'asc' };
    if (sortBy === 'price-low') orderBy = { pricePerCredit: 'asc' };
    else if (sortBy === 'price-high') orderBy = { pricePerCredit: 'desc' };
    else if (sortBy === 'quantity') orderBy = { availableCredits: 'asc' };
    else if (sortBy === 'vintage') orderBy = { vintage: 'desc' };

    const pageNum = Math.max(1, Number(page));
    const [credits, total] = await Promise.all([
      prisma.carbonCredit.findMany({
        where,
        include: { forest: true },
        orderBy,
        skip: (pageNum - 1) * limit,
        take: limit,
      }),
      prisma.carbonCredit.count({ where }),
    ]);

    return NextResponse.json(
      {
        data: credits,
        pagination: {
          page: pageNum,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: cacheHeaders },
    );
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
