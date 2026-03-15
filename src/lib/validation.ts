import { z } from 'zod';
import { NextResponse } from 'next/server';

export const idSchema = z.object({
  id: z.number().int().positive(),
});

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(200).optional().nullable(),
});

export const userUpdateSchema = z.object({
  id: z.number().int().positive(),
  role: z.enum(['admin', 'user', 'ADMIN', 'USER']).optional(),
  emailVerified: z.boolean().optional(),
});

export const forestCreateSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  area: z.number().positive(),
  description: z.string().min(1).max(2000),
  status: z.enum(['ACTIVE', 'MONITORING', 'INACTIVE', 'Active', 'Monitoring', 'Inactive']),
  lastUpdated: z.string().or(z.date()),
});

export const forestUpdateSchema = forestCreateSchema.partial().merge(idSchema);

export const carbonCreditCreateSchema = z.object({
  forestId: z.number().int().positive(),
  vintage: z.number().int().min(2000).max(2100),
  certification: z.string().min(1).max(100),
  totalCredits: z.number().int().positive(),
  availableCredits: z.number().int().min(0),
  pricePerCredit: z.number().positive(),
  symbol: z.string().default('tCO₂'),
  retiredCredits: z.number().int().min(0).default(0),
});

export const carbonCreditUpdateSchema = carbonCreditCreateSchema.partial().merge(idSchema);

export const orderCreateSchema = z.object({
  status: z
    .enum(['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED'])
    .default('PENDING'),
  items: z
    .array(
      z.object({
        carbonCreditId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        pricePerCredit: z.number().positive(),
      }),
    )
    .min(1),
});

export const orderUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z
    .enum(['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED'])
    .optional(),
  totalPrice: z.number().nonnegative().optional(),
  totalCredits: z.number().int().nonnegative().optional(),
  paidAt: z.string().datetime().or(z.date()).optional().nullable(),
  failureReason: z.string().max(500).optional().nullable(),
});

export const cartItemSchema = z.object({
  carbonCreditId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

/**
 * Validate request body against a schema.
 * Returns parsed data on success, or a 400 NextResponse on failure.
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T | NextResponse {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return NextResponse.json({ error: `Validation error: ${errors}` }, { status: 400 });
  }
  return result.data;
}

/**
 * Type guard to check if validation result is an error response.
 */
export function isValidationError<T>(result: T | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
