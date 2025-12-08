import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '4030', 10),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'dev-internal-key',
};
