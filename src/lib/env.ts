import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  
  // Application
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  
  // Neo4j (optional)
  NEO4J_URI: z.string().url().optional(),
  NEO4J_USER: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),
  
  // ImmuDB (optional)
  IMMUDB_HOST: z.string().optional(),
  IMMUDB_PORT: z.string().optional(),
  IMMUDB_USERNAME: z.string().optional(),
  IMMUDB_PASSWORD: z.string().optional(),
  IMMUDB_DATABASE: z.string().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

function getEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars}\n\n` +
        'Please check your .env file and ensure all required variables are set.'
      )
    }
    throw error
  }
}

export const env = getEnv()

