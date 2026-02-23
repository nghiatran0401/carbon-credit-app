import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  isAuthError,
  handleRouteError,
  PUBLIC_USER_SELECT,
} from '@/lib/auth';
import { userUpdateSchema, validateBody, isValidationError } from '@/lib/validation';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().max(200).optional().nullable(),
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const supabaseUserId = url.searchParams.get('supabaseUserId');

    if (supabaseUserId) {
      const user = await prisma.user.findUnique({
        where: { supabaseUserId },
        select: {
          ...PUBLIC_USER_SELECT,
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
      return NextResponse.json(user || null);
    }

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          ...PUBLIC_USER_SELECT,
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
      return NextResponse.json(user || null);
    }

    const adminCheck = await requireAdmin(req);
    if (isAuthError(adminCheck)) return adminCheck;

    const page = url.searchParams.get('page');
    const limit = Number(url.searchParams.get('limit')) || 20;
    const userSelect = {
      ...PUBLIC_USER_SELECT,
      orders: {
        orderBy: { createdAt: 'desc' as const },
        take: 5,
      },
    };

    if (!page) {
      const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: userSelect,
      });
      return NextResponse.json(users);
    }

    const pageNum = Math.max(1, Number(page));
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: userSelect,
        skip: (pageNum - 1) * limit,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        page: pageNum,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch users');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(userUpdateSchema, body);
    if (isValidationError(validated)) return validated;

    const { id, role, emailVerified } = validated;

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) {
      updateData.role = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
    }
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        ...PUBLIC_USER_SELECT,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return handleRouteError(error, 'Failed to update user');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(profileUpdateSchema, body);
    if (isValidationError(validated)) return validated;

    const updateData: Record<string, unknown> = {};
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
    if (validated.company !== undefined) updateData.company = validated.company;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.id },
      data: updateData,
      select: PUBLIC_USER_SELECT,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return handleRouteError(error, 'Failed to update profile');
  }
}
