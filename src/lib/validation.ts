import { z } from 'zod'

// Common validation schemas
export const idSchema = z.object({
  id: z.number().int().positive(),
})

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

// User schemas
export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(200).optional().nullable(),
})

export const userUpdateSchema = z.object({
  id: z.number().int().positive(),
  role: z.enum(['admin', 'user']).optional(),
  emailVerified: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Forest schemas
export const forestCreateSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  area: z.number().positive(),
  description: z.string().min(1).max(2000),
  status: z.enum(['Active', 'Monitoring', 'Inactive']),
  lastUpdated: z.string().datetime().or(z.date()),
})

export const forestUpdateSchema = forestCreateSchema.partial().merge(idSchema)

// Carbon Credit schemas
export const carbonCreditCreateSchema = z.object({
  forestId: z.number().int().positive(),
  vintage: z.number().int().min(2000).max(2100),
  certification: z.string().min(1).max(100),
  totalCredits: z.number().int().positive(),
  availableCredits: z.number().int().min(0),
  pricePerCredit: z.number().positive(),
  symbol: z.string().default('tCO₂'),
  retiredCredits: z.number().int().min(0).default(0),
})

export const carbonCreditUpdateSchema = carbonCreditCreateSchema.partial().merge(idSchema)

// Order schemas
export const orderCreateSchema = z.object({
  userId: z.number().int().positive(),
  status: z.enum(['Pending', 'Processing', 'Completed', 'Cancelled', 'Failed']).default('Pending'),
  items: z.array(
    z.object({
      carbonCreditId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      pricePerCredit: z.number().positive(),
    })
  ).min(1),
})

export const orderUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['Pending', 'Processing', 'Completed', 'Cancelled', 'Failed']).optional(),
  totalPrice: z.number().nonnegative().optional(),
  totalCredits: z.number().int().nonnegative().optional(),
  paidAt: z.string().datetime().or(z.date()).optional().nullable(),
  failureReason: z.string().max(500).optional().nullable(),
})

// Cart schemas
export const cartItemCreateSchema = z.object({
  userId: z.number().int().positive(),
  carbonCreditId: z.number().int().positive(),
  quantity: z.number().int().positive(),
})

export const cartItemUpdateSchema = z.object({
  userId: z.number().int().positive(),
  carbonCreditId: z.number().int().positive(),
  quantity: z.number().int().positive(),
})

// Bookmark schemas
export const bookmarkCreateSchema = z.object({
  userId: z.number().int().positive(),
  forestId: z.number().int().positive(),
})

// Notification schemas
export const notificationCreateSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum(['order', 'credit', 'system', 'payment']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
})

// Checkout schema
export const checkoutSchema = z.object({
  userId: z.number().int().positive(),
  cartItems: z.array(
    z.object({
      carbonCreditId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      price: z.number().positive().optional(),
      carbonCredit: z.any().optional(),
    })
  ).min(1),
})

/**
 * Validate request body against a schema
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<T> {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(`Validation error: ${errors}`)
    }
    throw error
  }
}

