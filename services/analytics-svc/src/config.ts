export const config = {
  port: parseInt(process.env.PORT ?? '4030', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-analytics-svc',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/aivo',
};
