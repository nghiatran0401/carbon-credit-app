import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSupabaseUser, handleRouteError } from '@/lib/auth';
import { generateCustodialWallet } from '@/lib/wallet-service';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  supabaseUserId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(200).optional().nullable(),
});

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  company: true,
  role: true,
  walletAddress: true,
  createdAt: true,
  supabaseUserId: true,
} as const;

/**
 * POST /api/users/register
 *
 * Called by the frontend immediately after supabase.auth.signUp() succeeds.
 * Ensures the Prisma User row exists and has a custodial Sepolia wallet address.
 *
 * Strategy:
 *  1. Look up the user by email.
 *  2. If the user already exists (e.g. created by a Supabase DB trigger) but
 *     has no wallet, generate one and patch it in.
 *  3. If the user does not exist yet, create them with a wallet.
 *
 * Safe to call multiple times — never overwrites an existing wallet address.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the caller has an active Supabase session
    const supabaseUser = await getSupabaseUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { supabaseUserId, email, firstName, lastName, company } = parsed.data;

    // Guard: the session must match the requested supabaseUserId
    if (supabaseUser.id !== supabaseUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- Find-then-act: handles both trigger-created and brand-new users ---

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, walletAddress: true },
    });

    let user;

    if (existing) {
      // User already exists (created by Supabase trigger or a previous call).
      // Patch supabaseUserId linkage, and assign a wallet only if missing.
      const updateData: Record<string, unknown> = { supabaseUserId };
      if (!existing.walletAddress) {
        updateData.walletAddress = generateCustodialWallet().address;
      }
      user = await prisma.user.update({
        where: { id: existing.id },
        data: updateData,
        select: USER_SELECT,
      });
    } else {
      // Brand-new user — create the row with a fresh wallet address.
      user = await prisma.user.create({
        data: {
          supabaseUserId,
          email,
          firstName,
          lastName,
          company: company ?? null,
          walletAddress: generateCustodialWallet().address,
        },
        select: USER_SELECT,
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to register user');
  }
}
