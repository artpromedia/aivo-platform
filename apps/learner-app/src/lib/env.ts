import { z } from 'zod';

/**
 * Environment variable schema with runtime validation
 * This ensures all required environment variables are present and valid
 * before the application starts.
 */
const envSchema = z.object({
  // API Configuration
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Sentry Configuration (optional in development)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  
  // Application Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Feature Flags (optional)
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().transform(v => v === 'true').optional(),
  NEXT_PUBLIC_ENABLE_PWA: z.string().transform(v => v === 'true').optional(),
});

/**
 * Type for validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws an error with detailed information if validation fails
 */
function parseEnv(): Env {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_PWA: process.env.NEXT_PUBLIC_ENABLE_PWA,
  });

  if (!result.success) {
    const errorMessages = result.error.errors.map(function(err) {
      return '  - ' + err.path.join('.') + ': ' + err.message;
    });
    
    throw new Error(
      'Environment validation failed:\n' + errorMessages.join('\n') + '\n\n' +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }

  return result.data;
}

/**
 * Validated environment variables
 * Use this instead of process.env for type-safe access
 */
export const env = parseEnv();

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if we're in test
 */
export const isTest = env.NODE_ENV === 'test';
