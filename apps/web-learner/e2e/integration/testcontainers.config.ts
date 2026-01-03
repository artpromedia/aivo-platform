/**
 * TestContainers Configuration for Integration Testing
 *
 * Provides containerized test infrastructure for:
 * - PostgreSQL database
 * - Redis cache
 * - Elasticsearch (for search)
 * - LocalStack (AWS services simulation)
 * - Mock OAuth providers
 */

import {
  GenericContainer,
  StartedTestContainer,
  Wait,
  Network,
  StartedNetwork,
} from 'testcontainers';

export interface ContainerConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionString: string;
  };
  redis: {
    host: string;
    port: number;
    url: string;
  };
  elasticsearch: {
    host: string;
    port: number;
    url: string;
  };
  localstack: {
    host: string;
    port: number;
    endpoint: string;
  };
}

export class TestContainersManager {
  private network: StartedNetwork | null = null;
  private postgresContainer: StartedTestContainer | null = null;
  private redisContainer: StartedTestContainer | null = null;
  private elasticsearchContainer: StartedTestContainer | null = null;
  private localstackContainer: StartedTestContainer | null = null;

  private config: ContainerConfig | null = null;

  /**
   * Start all test containers
   */
  async start(): Promise<ContainerConfig> {
    console.log('Starting TestContainers...');

    // Create shared network
    this.network = await new Network().start();

    // Start containers in parallel
    const [postgres, redis, elasticsearch, localstack] = await Promise.all([
      this.startPostgres(),
      this.startRedis(),
      this.startElasticsearch(),
      this.startLocalStack(),
    ]);

    this.postgresContainer = postgres;
    this.redisContainer = redis;
    this.elasticsearchContainer = elasticsearch;
    this.localstackContainer = localstack;

    this.config = {
      postgres: {
        host: postgres.getHost(),
        port: postgres.getMappedPort(5432),
        database: 'aivo_test',
        user: 'aivo',
        password: 'test_password',
        connectionString: `postgresql://aivo:test_password@${postgres.getHost()}:${postgres.getMappedPort(5432)}/aivo_test`,
      },
      redis: {
        host: redis.getHost(),
        port: redis.getMappedPort(6379),
        url: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
      },
      elasticsearch: {
        host: elasticsearch.getHost(),
        port: elasticsearch.getMappedPort(9200),
        url: `http://${elasticsearch.getHost()}:${elasticsearch.getMappedPort(9200)}`,
      },
      localstack: {
        host: localstack.getHost(),
        port: localstack.getMappedPort(4566),
        endpoint: `http://${localstack.getHost()}:${localstack.getMappedPort(4566)}`,
      },
    };

    console.log('TestContainers started successfully');
    return this.config;
  }

  /**
   * Stop all test containers
   */
  async stop(): Promise<void> {
    console.log('Stopping TestContainers...');

    await Promise.all([
      this.postgresContainer?.stop(),
      this.redisContainer?.stop(),
      this.elasticsearchContainer?.stop(),
      this.localstackContainer?.stop(),
    ]);

    await this.network?.stop();

    this.postgresContainer = null;
    this.redisContainer = null;
    this.elasticsearchContainer = null;
    this.localstackContainer = null;
    this.network = null;
    this.config = null;

    console.log('TestContainers stopped');
  }

  /**
   * Get current container configuration
   */
  getConfig(): ContainerConfig {
    if (!this.config) {
      throw new Error('Containers not started. Call start() first.');
    }
    return this.config;
  }

  /**
   * Reset database to clean state
   */
  async resetDatabase(): Promise<void> {
    if (!this.postgresContainer || !this.config) {
      throw new Error('PostgreSQL container not running');
    }

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Run migrations fresh
    await execAsync(
      `psql "${this.config.postgres.connectionString}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`
    );

    console.log('Database reset complete');
  }

  /**
   * Flush Redis cache
   */
  async flushRedis(): Promise<void> {
    if (!this.redisContainer || !this.config) {
      throw new Error('Redis container not running');
    }

    const { createClient } = await import('redis');
    const client = createClient({ url: this.config.redis.url });
    await client.connect();
    await client.flushAll();
    await client.disconnect();

    console.log('Redis flushed');
  }

  /**
   * Start PostgreSQL container
   */
  private async startPostgres(): Promise<StartedTestContainer> {
    return new GenericContainer('postgres:15-alpine')
      .withNetwork(this.network!)
      .withNetworkAliases('postgres')
      .withEnvironment({
        POSTGRES_USER: 'aivo',
        POSTGRES_PASSWORD: 'test_password',
        POSTGRES_DB: 'aivo_test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
      .withStartupTimeout(60000)
      .start();
  }

  /**
   * Start Redis container
   */
  private async startRedis(): Promise<StartedTestContainer> {
    return new GenericContainer('redis:7-alpine')
      .withNetwork(this.network!)
      .withNetworkAliases('redis')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .withStartupTimeout(30000)
      .start();
  }

  /**
   * Start Elasticsearch container
   */
  private async startElasticsearch(): Promise<StartedTestContainer> {
    return new GenericContainer('docker.elastic.co/elasticsearch/elasticsearch:8.11.0')
      .withNetwork(this.network!)
      .withNetworkAliases('elasticsearch')
      .withEnvironment({
        'discovery.type': 'single-node',
        'xpack.security.enabled': 'false',
        ES_JAVA_OPTS: '-Xms512m -Xmx512m',
      })
      .withExposedPorts(9200)
      .withWaitStrategy(Wait.forHttp('/_cluster/health', 9200).forStatusCode(200))
      .withStartupTimeout(120000)
      .start();
  }

  /**
   * Start LocalStack container (AWS simulation)
   */
  private async startLocalStack(): Promise<StartedTestContainer> {
    return new GenericContainer('localstack/localstack:3.0')
      .withNetwork(this.network!)
      .withNetworkAliases('localstack')
      .withEnvironment({
        SERVICES: 's3,sqs,sns,ses,dynamodb',
        DEBUG: '0',
        DOCKER_HOST: 'unix:///var/run/docker.sock',
      })
      .withExposedPorts(4566)
      .withWaitStrategy(Wait.forHttp('/_localstack/health', 4566).forStatusCode(200))
      .withStartupTimeout(120000)
      .start();
  }
}

// Singleton instance for shared use
let containerManager: TestContainersManager | null = null;

export async function getTestContainers(): Promise<TestContainersManager> {
  if (!containerManager) {
    containerManager = new TestContainersManager();
    await containerManager.start();
  }
  return containerManager;
}

export async function stopTestContainers(): Promise<void> {
  if (containerManager) {
    await containerManager.stop();
    containerManager = null;
  }
}

// Environment variable setter for application configuration
export function setTestEnvironment(config: ContainerConfig): void {
  process.env.DATABASE_URL = config.postgres.connectionString;
  process.env.REDIS_URL = config.redis.url;
  process.env.ELASTICSEARCH_URL = config.elasticsearch.url;
  process.env.AWS_ENDPOINT_URL = config.localstack.endpoint;
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';
  process.env.AWS_REGION = 'us-east-1';
}
