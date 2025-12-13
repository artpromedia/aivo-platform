export const config = {
  port: parseInt(process.env.PORT ?? '4030', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-analytics-svc',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/aivo',
  
  // NATS configuration
  nats: {
    servers: process.env.NATS_SERVERS ?? 'nats://localhost:4222',
    enabled: process.env.NATS_ENABLED !== 'false',
    token: process.env.NATS_TOKEN,
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASS,
  },
};
