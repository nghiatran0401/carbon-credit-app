import { NextRequest, NextResponse } from 'next/server'
import { createClient } from './supabase/server'
import { prisma } from './prisma'

export interface AuthenticatedUser {
  id: number
  email: string
  role: string
  emailVerified: boolean
  supabaseUserId: string
}

/**
 * Get authenticated user from request using Supabase session
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()
    
    if (error || !supabaseUser) {
      return null
    }

    // Get user from database using Supabase user ID (preferred) or email (fallback)
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseUserId: supabaseUser.id },
          { email: supabaseUser.email! },
        ]
      }
    })

    if (!dbUser) {
      return null
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      emailVerified: dbUser.emailVerified,
      supabaseUserId: supabaseUser.id,
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

/**
 * Require authentication for a route
 * Returns the authenticated user or throws an error
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require admin role for a route
 * Returns the authenticated admin user or throws an error
 */
export async function requireAdmin(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(req)
  
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  
  return user
}

/**
 * Check if user owns a resource or is admin
 */
export async function requireOwnershipOrAdmin(
  req: NextRequest,
  resourceUserId: number
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req)
  
  if (user.id !== resourceUserId && user.role !== 'admin') {
    throw new Error('Forbidden: You do not have access to this resource')
  }
  
  return user
}

/**
 * Create an error response
 */
export function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

