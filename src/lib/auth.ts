import { NextRequest, NextResponse } from 'next/server';
import { createClient } from './supabase/server';
import { prisma } from './prisma';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  emailVerified: boolean;
  supabaseUserId: string;
}

/**
 * Fields to select when returning user data publicly (excludes sensitive fields).
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  company: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  emailVerified: true,
  supabaseUserId: true,
} as const;

/**
 * Get authenticated user from request using Supabase session
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return null;
    }

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ supabaseUserId: supabaseUser.id }, { email: supabaseUser.email! }],
      },
    });

    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      emailVerified: dbUser.emailVerified,
      supabaseUserId: supabaseUser.id,
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Get only the authenticated Supabase user (no DB lookup).
 * Useful for the register endpoint where the DB user may not yet exist.
 */
export async function getSupabaseUser(): Promise<{ id: string; email: string } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email! };
  } catch {
    return null;
  }
}

/**
 * Require authentication for a route.
 * Returns the authenticated user or an error NextResponse.
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

/**
 * Require admin role for a route.
 * Returns the authenticated admin user or an error NextResponse.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  if (result.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  return result;
}

/**
 * Check if user owns a resource or is admin.
 * Returns the authenticated user or an error NextResponse.
 */
export async function requireOwnershipOrAdmin(
  req: NextRequest,
  resourceUserId: number,
): Promise<AuthenticatedUser | NextResponse> {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  if (result.id !== resourceUserId && result.role?.toLowerCase() !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: You do not have access to this resource' },
      { status: 403 },
    );
  }

  return result;
}

/**
 * Type guard to check if an auth result is an error response.
 */
export function isAuthError(result: AuthenticatedUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Create a sanitized error response (never leaks internal details).
 */
export function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Create a success response.
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Safely handle route errors: logs the real error, returns a generic message.
 */
export function handleRouteError(
  error: unknown,
  publicMessage: string,
  status: number = 500,
): NextResponse {
  console.error(publicMessage, error);
  return NextResponse.json({ error: publicMessage }, { status });
}
