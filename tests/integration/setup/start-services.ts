/**
 * Service Startup Script for Integration Tests
 *
 * Starts Docker containers and waits for services to be healthy
 * before running integration tests.
 *
 * @module tests/integration/setup/start-services
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DOCKER_COMPOSE_FILE = resolve(__dirname, '../docker-compose.test.yml');
const MAX_WAIT_TIME = 120000; // 2 minutes
const POLL_INTERVAL = 2000; // 2 seconds

interface ServiceHealth {
  name: string;
  port: number;
  healthCheck: () => Promise<boolean>;
}

const services: ServiceHealth[] = [
  {
    name: 'postgres-test',
    port: 5433,
    healthCheck: async () => {
      try {
        execSync('docker exec aivo-postgres-test pg_isready -U aivo_test', {
          stdio: 'pipe',
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'redis-test',
    port: 6380,
    healthCheck: async () => {
      try {
        execSync('docker exec aivo-redis-test redis-cli ping', {
          stdio: 'pipe',
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'nats-test',
    port: 4223,
    healthCheck: async () => {
      try {
        const response = await fetch('http://localhost:8223/healthz');
        return response.ok;
      } catch {
        return false;
      }
    },
  },
];

async function isDockerRunning(): Promise<boolean> {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function startDockerCompose(): Promise<void> {
  if (!existsSync(DOCKER_COMPOSE_FILE)) {
    console.log('⚠️  Docker Compose file not found, skipping container startup');
    return;
  }

  console.log('🐳 Starting Docker containers...');

  try {
    execSync(`docker compose -f "${DOCKER_COMPOSE_FILE}" up -d`, {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
    });
  } catch (error) {
    console.error('❌ Failed to start Docker containers');
    throw error;
  }
}

async function waitForService(service: ServiceHealth): Promise<boolean> {
  const startTime = Date.now();
  process.stdout.write(`   Waiting for ${service.name}...`);

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    if (await service.healthCheck()) {
      process.stdout.write(' ✅\n');
      return true;
    }
    await sleep(POLL_INTERVAL);
    process.stdout.write('.');
  }

  process.stdout.write(' ❌ (timeout)\n');
  return false;
}

async function waitForAllServices(): Promise<void> {
  console.log('\n⏳ Waiting for services to be healthy...\n');

  const results = await Promise.all(services.map(waitForService));
  const allHealthy = results.every(Boolean);

  if (!allHealthy) {
    const failed = services.filter((_, i) => !results[i]).map((s) => s.name);
    throw new Error(`Services failed to start: ${failed.join(', ')}`);
  }

  console.log('\n✅ All services are healthy\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Global Setup (called by Vitest)
// ============================================================================

export default async function globalSetup(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Integration Test Suite - Global Setup');
  console.log('='.repeat(60) + '\n');

  // Check if we should skip Docker (for CI where containers are already running)
  if (process.env.SKIP_DOCKER_SETUP === 'true') {
    console.log('ℹ️  Skipping Docker setup (SKIP_DOCKER_SETUP=true)\n');
    return;
  }

  // Check Docker availability
  if (!(await isDockerRunning())) {
    console.log('⚠️  Docker is not running, tests will use mocks');
    process.env.USE_MOCKS = 'true';
    return;
  }

  try {
    await startDockerCompose();
    await waitForAllServices();
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    
    // Don't fail entirely - allow tests to run with mocks
    console.log('⚠️  Falling back to mock mode');
    process.env.USE_MOCKS = 'true';
  }

  // Set environment variables for tests
  process.env.TEST_DATABASE_URL = 'postgresql://aivo_test:test_password@localhost:5433/aivo_test';
  process.env.TEST_REDIS_URL = 'redis://localhost:6380';
  process.env.TEST_NATS_URL = 'nats://localhost:4223';
  process.env.STRIPE_API_BASE = 'http://localhost:12111';
  process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '1026';

  console.log('📋 Environment configured:');
  console.log(`   DATABASE: ${process.env.TEST_DATABASE_URL}`);
  console.log(`   REDIS: ${process.env.TEST_REDIS_URL}`);
  console.log(`   NATS: ${process.env.TEST_NATS_URL}`);
  console.log('');
}

// ============================================================================
// Exported Utilities
// ============================================================================

export { startDockerCompose, waitForAllServices, isDockerRunning };
