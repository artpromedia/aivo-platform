import * as dotenv from 'dotenv';

dotenv.config();

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number(process.env.PORT || 4002),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_tenant'),
  jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
  
  // Tenant resolver configuration
  redisUrl: process.env.REDIS_URL,
  baseDomain: process.env.BASE_DOMAIN || 'aivo.ai',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  defaultTenantId: process.env.DEFAULT_TENANT_ID,
};
