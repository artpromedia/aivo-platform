import Redis from 'ioredis';

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number.parseInt(process.env.PORT ?? '4030', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: requireEnvInProduction('JWT_SECRET', 'dev-secret-analytics-svc'),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_analytics'),

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: Number.parseInt(process.env.REDIS_DB ?? '0', 10),
    keyPrefix: 'analytics:',
    enabled: process.env.REDIS_ENABLED !== 'false',
  },

  // NATS configuration
  nats: {
    servers: process.env.NATS_SERVERS ?? 'nats://localhost:4222',
    enabled: process.env.NATS_ENABLED !== 'false',
    token: process.env.NATS_TOKEN,
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASS,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Redis client stub for graceful degradation when Redis is unavailable.
 * All methods return null/void to allow the application to continue without caching.
 */
class RedisStub {
  async get(_key: string): Promise<string | null> {
    return null;
  }

  async set(_key: string, _value: string): Promise<'OK'> {
    return 'OK';
  }

  async setex(_key: string, _seconds: number, _value: string): Promise<'OK'> {
    return 'OK';
  }

  async del(..._keys: string[]): Promise<number> {
    return 0;
  }

  async keys(_pattern: string): Promise<string[]> {
    return [];
  }

  async expire(_key: string, _seconds: number): Promise<number> {
    return 0;
  }

  async ttl(_key: string): Promise<number> {
    return -1;
  }
}

/**
 * Create Redis client with graceful degradation.
 * Returns a stub if Redis is disabled or connection fails.
 */
function createRedisClient(): Redis | RedisStub {
  if (!config.redis.enabled) {
    console.log('Redis disabled, using stub for graceful degradation');
    return new RedisStub();
  }

  try {
    const client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('Redis connection failed after 3 retries, using stub');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    client.on('error', (err) => {
      console.error('Redis error:', err.message);
    });

    client.on('connect', () => {
      console.log('Redis connected');
    });

    return client;
  } catch (error) {
    console.warn('Failed to create Redis client, using stub:', error);
    return new RedisStub();
  }
}

/**
 * Shared Redis client instance.
 * Use this for all caching operations in the analytics service.
 */
export const redisClient = createRedisClient();
