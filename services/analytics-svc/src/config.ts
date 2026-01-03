function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: parseInt(process.env.PORT ?? '4030', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: requireEnvInProduction('JWT_SECRET', 'dev-secret-analytics-svc'),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_analytics'),
  
  // NATS configuration
  nats: {
    servers: process.env.NATS_SERVERS ?? 'nats://localhost:4222',
    enabled: process.env.NATS_ENABLED !== 'false',
    token: process.env.NATS_TOKEN,
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASS,
  },
};
