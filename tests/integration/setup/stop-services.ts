/**
 * Service Shutdown Script for Integration Tests
 *
 * Stops Docker containers and cleans up resources after tests complete.
 *
 * @module tests/integration/setup/stop-services
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DOCKER_COMPOSE_FILE = resolve(__dirname, '../docker-compose.test.yml');

interface TeardownOptions {
  removeVolumes?: boolean;
  removeOrphans?: boolean;
  timeout?: number;
}

async function stopDockerCompose(options: TeardownOptions = {}): Promise<void> {
  if (!existsSync(DOCKER_COMPOSE_FILE)) {
    return;
  }

  const { removeVolumes = false, removeOrphans = true, timeout = 30 } = options;

  let command = `docker compose -f "${DOCKER_COMPOSE_FILE}" down`;
  
  if (removeVolumes) {
    command += ' -v';
  }
  
  if (removeOrphans) {
    command += ' --remove-orphans';
  }
  
  command += ` -t ${timeout}`;

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
    });
  } catch (error) {
    console.warn('⚠️  Warning: Some containers may not have stopped cleanly');
  }
}

async function cleanupTestData(): Promise<void> {
  // Clean up any test artifacts
  const artifactsDir = resolve(__dirname, '../reports');
  
  // Keep reports but clean up temporary files
  try {
    execSync(`rm -rf "${artifactsDir}/tmp" 2>/dev/null || true`, {
      stdio: 'pipe',
    });
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// Global Teardown (called by Vitest)
// ============================================================================

export default async function globalTeardown(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧹 Integration Test Suite - Global Teardown');
  console.log('='.repeat(60) + '\n');

  // Check if we should skip Docker cleanup
  if (process.env.SKIP_DOCKER_TEARDOWN === 'true') {
    console.log('ℹ️  Skipping Docker teardown (SKIP_DOCKER_TEARDOWN=true)');
    console.log('   Containers will remain running for debugging\n');
    return;
  }

  // Check if we were using mocks
  if (process.env.USE_MOCKS === 'true') {
    console.log('ℹ️  Tests ran in mock mode, no Docker cleanup needed\n');
    return;
  }

  console.log('🛑 Stopping Docker containers...\n');

  try {
    // Default: don't remove volumes to speed up subsequent runs
    // Use CLEANUP_VOLUMES=true to remove volumes
    const removeVolumes = process.env.CLEANUP_VOLUMES === 'true';
    
    await stopDockerCompose({ removeVolumes });
    await cleanupTestData();

    console.log('\n✅ Teardown complete');
    
    if (!removeVolumes) {
      console.log('ℹ️  Volumes preserved. Set CLEANUP_VOLUMES=true to remove them.\n');
    }
  } catch (error) {
    console.error('❌ Teardown error:', error);
    // Don't throw - allow test process to exit cleanly
  }
}

// ============================================================================
// Exported Utilities
// ============================================================================

export { stopDockerCompose, cleanupTestData };
