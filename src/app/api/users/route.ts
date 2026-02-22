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

    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        ...PUBLIC_USER_SELECT,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    return NextResponse.json(users);
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
