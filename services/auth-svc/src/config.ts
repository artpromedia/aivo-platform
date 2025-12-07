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

export const config = {
  port: Number(process.env.PORT || 4001),
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aivo_auth',
  consumerTenantId: process.env.CONSUMER_TENANT_ID || '00000000-0000-0000-0000-000000000000',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  jwtPrivateKey: readKey(process.env.JWT_PRIVATE_KEY, process.env.JWT_PRIVATE_KEY_PATH),
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),
};
