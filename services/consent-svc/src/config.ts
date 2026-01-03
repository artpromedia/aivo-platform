import * as fs from 'node:fs';
import * as path from 'node:path';

import 'dotenv/config';

function readKey(keyEnv: string | undefined, fileEnv: string | undefined): string {
  if (keyEnv) return keyEnv;
  if (fileEnv) {
    const abs = path.resolve(fileEnv);
    return fs.readFileSync(abs, 'utf-8');
  }
  throw new Error('JWT public key not provided');
}

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number(process.env.PORT || 4004),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgres://localhost:5432/aivo_consent'),
  ssl: process.env.PGSSL === 'true',
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),
  privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || 'https://aivo.example.com/privacy-policy',
};
