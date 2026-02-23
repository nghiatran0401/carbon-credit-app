import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseUser, handleRouteError } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimited = checkRateLimit(req, RATE_LIMITS.register, 'auth-register');
  if (rateLimited) return rateLimited;
  try {
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized: valid Supabase session required' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { firstName, lastName, company } = body;

    const email = supabaseUser.email;
    const supabaseUserId = supabaseUser.id;

    const emailParts = email.split('@')[0].split('.');
    const finalFirstName = firstName || emailParts[0] || 'User';
    const finalLastName = lastName || emailParts.slice(1).join(' ') || '';

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const existingBySupabaseId = await prisma.user.findUnique({ where: { supabaseUserId } });
    if (existingBySupabaseId) {
      return NextResponse.json(
        { error: 'User with this Supabase ID already exists' },
        { status: 400 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        supabaseUserId,
        firstName: finalFirstName,
        lastName: finalLastName,
        company: company || null,
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleRouteError(error, 'Registration failed');
  }
}
