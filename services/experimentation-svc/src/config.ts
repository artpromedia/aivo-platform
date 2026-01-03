/**
 * Experimentation Service Configuration
 */

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3018', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Database
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_experimentation'),
  warehouseUrl: requireEnvInProduction('WAREHOUSE_URL', 'postgresql://localhost:5432/aivo_warehouse'),
  policyDbUrl: requireEnvInProduction('POLICY_DB_URL', 'postgresql://localhost:5432/aivo_policies'),

  // Assignment behavior
  assignment: {
    // Whether to cache assignments in database (enables audit trail)
    cacheAssignments: process.env.CACHE_ASSIGNMENTS !== 'false',
    // Default variant key when experiment not found or tenant opted out
    defaultControlKey: 'control',
  },

  // Policy cache
  policyCacheTtlMs: parseInt(process.env.POLICY_CACHE_TTL_MS ?? '30000', 10),

  // Exposure logging
  exposure: {
    // Batch size for warehouse inserts
    batchSize: parseInt(process.env.EXPOSURE_BATCH_SIZE ?? '100', 10),
    // Flush interval in ms
    flushIntervalMs: parseInt(process.env.EXPOSURE_FLUSH_INTERVAL_MS ?? '5000', 10),
  },

  // JWT verification (optional, for authenticated endpoints)
  jwtSecret: requireEnvInProduction('JWT_SECRET', 'dev-secret-change-in-prod'),
  jwtAudience: process.env.JWT_AUDIENCE ?? 'aivo-api',
  jwtIssuer: process.env.JWT_ISSUER ?? 'auth.aivo.com',
};
