import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4002),
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aivo_tenant',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
  
  // Tenant resolver configuration
  redisUrl: process.env.REDIS_URL,
  baseDomain: process.env.BASE_DOMAIN || 'aivo.ai',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  defaultTenantId: process.env.DEFAULT_TENANT_ID,
};
