import dotenv from 'dotenv';

dotenv.config();

function requireEnvInProduction(name: string, devDefault: string): string {
  const val = process.env[name];
  if (val) return val;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return devDefault;
}

export const config = {
  port: Number(process.env.PORT ?? '4061'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnvInProduction(
    'DATABASE_URL',
    'postgresql://localhost:5432/aivo_onboarding',
  ),
  jwtPublicKey: process.env.JWT_PUBLIC_KEY ?? '',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH ?? '',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
};
