import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'

export interface AuthenticatedUser {
  id: number
  email: string
  role: string
  emailVerified: boolean
}

/**
 * Get authenticated user from request
 * This is a placeholder - implement proper session/token validation
 * TODO: Implement JWT or session-based authentication
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  // TODO: Implement actual authentication
  // For now, this is a placeholder that should be replaced with:
  // 1. JWT token validation
  // 2. Session validation
  // 3. API key validation
  
  // Example implementation:
  // const token = req.headers.get('authorization')?.replace('Bearer ', '')
  // if (!token) return null
  // const decoded = verifyJWT(token)
  // const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
  // return user
  
  return null
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

