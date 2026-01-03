import * as fs from 'node:fs';
import * as path from 'node:path';

import * as dotenv from 'dotenv';

dotenv.config();

function readKey(keyEnv: string | undefined, fileEnv: string | undefined): string {
  if (keyEnv) return keyEnv;
  if (fileEnv) {
    const abs = path.resolve(fileEnv);
    return fs.readFileSync(abs, 'utf-8');
  }
  throw new Error('JWT key not provided');
}

function readOptionalKey(keyEnv: string | undefined, fileEnv: string | undefined): string | undefined {
  if (keyEnv) return keyEnv;
  if (fileEnv) {
    const abs = path.resolve(fileEnv);
    try {
      return fs.readFileSync(abs, 'utf-8');
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number(process.env.PORT || 4001),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_auth'),
  consumerTenantId: process.env.CONSUMER_TENANT_ID || '00000000-0000-0000-0000-000000000000',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  jwtPrivateKey: readKey(process.env.JWT_PRIVATE_KEY, process.env.JWT_PRIVATE_KEY_PATH),
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),

  // SSO Configuration
  baseUrl: process.env.AUTH_SERVICE_BASE_URL || 'http://localhost:4001',
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:3000',
  
  // SAML SP Configuration
  samlSpEntityId: process.env.SAML_SP_ENTITY_ID || 'https://aivo.education/sp',
  samlSpPrivateKey: readOptionalKey(
    process.env.SAML_SP_PRIVATE_KEY,
    process.env.SAML_SP_PRIVATE_KEY_PATH
  ),
  samlSpCertificate: readOptionalKey(
    process.env.SAML_SP_CERTIFICATE,
    process.env.SAML_SP_CERTIFICATE_PATH
  ),

  // SSO State Encryption (required in production)
  ssoStateEncryptionKey: (() => {
    const key = process.env.SSO_STATE_ENCRYPTION_KEY;
    if (!key && process.env.NODE_ENV === 'production') {
      throw new Error('SSO_STATE_ENCRYPTION_KEY is required in production');
    }
    return key || 'dev-only-key-not-for-production';
  })(),

  // Service URLs
  notifyServiceUrl: process.env.NOTIFY_SERVICE_URL || 'http://notify-svc:4040',

  // Redis (for SSO state in multi-instance deployments)
  redisUrl: process.env.REDIS_URL,
};
