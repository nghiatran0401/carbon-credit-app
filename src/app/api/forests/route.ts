import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, handleRouteError } from '@/lib/auth';
import {
  forestCreateSchema,
  forestUpdateSchema,
  validateBody,
  isValidationError,
} from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get('page');
    const limit = Number(url.searchParams.get('limit')) || 20;

    const cacheHeaders = {
      'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    };

    if (!page) {
      const forests = await prisma.forest.findMany({
        include: { credits: true },
        orderBy: { id: 'asc' },
      });
      return NextResponse.json(forests, { headers: cacheHeaders });
    }

    const pageNum = Math.max(1, Number(page));
    const [forests, total] = await Promise.all([
      prisma.forest.findMany({
        include: { credits: true },
        orderBy: { id: 'asc' },
        skip: (pageNum - 1) * limit,
        take: limit,
      }),
      prisma.forest.count(),
    ]);

    return NextResponse.json(
      {
        data: forests,
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
    return handleRouteError(error, 'Failed to fetch forests');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(forestCreateSchema, body);
    if (isValidationError(validated)) return validated;

    const forest = await prisma.forest.create({
      data: {
        name: validated.name,
        location: validated.location,
        type: validated.type,
        area: validated.area,
        description: validated.description,
        status: validated.status.toUpperCase() as 'ACTIVE' | 'MONITORING' | 'INACTIVE',
        lastUpdated: new Date(validated.lastUpdated as string),
      },
    });
    return NextResponse.json(forest);
  } catch (error) {
    return handleRouteError(error, 'Failed to create forest');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(forestUpdateSchema, body);
    if (isValidationError(validated)) return validated;

    const { id, ...data } = validated;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.area !== undefined) updateData.area = data.area;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status.toUpperCase();
    if (data.lastUpdated !== undefined)
      updateData.lastUpdated = new Date(data.lastUpdated as string);

    const forest = await prisma.forest.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(forest);
  } catch (error) {
    return handleRouteError(error, 'Failed to update forest');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.forest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete forest');
  }
}
