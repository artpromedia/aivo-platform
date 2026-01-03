import 'dotenv/config';

function requireEnvInProduction(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || defaultValue || '';
}

export const config = {
  port: parseInt(process.env.PORT ?? '4030', 10),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_goals'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  internalApiKey: requireEnvInProduction('INTERNAL_API_KEY', 'dev-only-key'),
};
