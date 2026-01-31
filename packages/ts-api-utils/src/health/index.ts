/**
 * Database Health Check Utilities
 *
 * Provides comprehensive database health monitoring including:
 * - Connection pool status
 * - Query performance
 * - Database latency
 * - Connection count
 */

import type { PrismaClient } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface DatabaseHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  connectionPool?: {
    active: number;
    idle: number;
    total: number;
  };
  lastCheck: string;
  error?: string;
}

export interface ServiceHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  database?: DatabaseHealthCheck | undefined;
  dependencies?: Record<string, DependencyHealthCheck> | undefined;
}

export interface DependencyHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check database connectivity and performance
 */
export async function checkDatabaseHealth(prisma: PrismaClient): Promise<DatabaseHealthCheck> {
  const startTime = Date.now();

  try {
    // Execute a simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1 as health_check`;

    const latencyMs = Date.now() - startTime;

    // Determine health status based on latency
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (latencyMs > 1000) {
      status = 'unhealthy';
    } else if (latencyMs > 500) {
      status = 'degraded';
    }

    // Get connection pool metrics (if available)
    // Note: Prisma doesn't expose pool stats directly, this is a placeholder
    const connectionPool = {
      active: 0, // Would need custom implementation
      idle: 0,
      total: 10, // Default pool size
    };

    return {
      status,
      latencyMs,
      connectionPool,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if database is ready for accepting connections
 */
export async function checkDatabaseReadiness(
  prisma: PrismaClient,
  timeoutMs = 5000
): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Use a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error('Database readiness check timeout'));
      }, timeoutMs)
    );

    const queryPromise = prisma.$queryRaw`SELECT 1 as ready_check`;

    await Promise.race([queryPromise, timeoutPromise]);

    const elapsed = Date.now() - startTime;
    console.log(`Database ready check completed in ${elapsed}ms`);

    return true;
  } catch (error) {
    console.error('Database readiness check failed:', error);
    return false;
  }
}

/**
 * Create a comprehensive service health check
 */
export async function createServiceHealthCheck(
  serviceName: string,
  version: string,
  prisma?: PrismaClient,
  dependencies?: Record<string, () => Promise<DependencyHealthCheck>>
): Promise<ServiceHealthCheck> {
  // Calculate uptime (simplified - in production, track actual service start time)
  const uptime = process.uptime();

  // Check database health if Prisma client provided
  let databaseHealth: DatabaseHealthCheck | undefined;
  if (prisma) {
    databaseHealth = await checkDatabaseHealth(prisma);
  }

  // Check dependencies
  let dependenciesHealth: Record<string, DependencyHealthCheck> | undefined;
  if (dependencies) {
    dependenciesHealth = {};
    for (const [name, checkFn] of Object.entries(dependencies)) {
      try {
        dependenciesHealth[name] = await checkFn();
      } catch (error) {
        dependenciesHealth[name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  }

  // Determine overall service health
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (databaseHealth?.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (databaseHealth?.status === 'degraded') {
    overallStatus = 'degraded';
  }

  // Check if any dependencies are unhealthy
  if (dependenciesHealth) {
    const unhealthyDeps = Object.values(dependenciesHealth).filter(
      (dep) => dep.status === 'unhealthy'
    );
    const degradedDeps = Object.values(dependenciesHealth).filter(
      (dep) => dep.status === 'degraded'
    );

    if (unhealthyDeps.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedDeps.length > 0 && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  return {
    status: overallStatus,
    service: serviceName,
    version,
    timestamp: new Date().toISOString(),
    uptime,
    database: databaseHealth,
    dependencies: dependenciesHealth,
  };
}

/**
 * Execute a health check with timeout
 */
export async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Create a simple HTTP dependency checker
 */
export function createHttpDependencyChecker(
  url: string,
  timeoutMs = 5000
): () => Promise<DependencyHealthCheck> {
  return async () => {
    const startTime = Date.now();

    try {
      const response = await executeWithTimeout(
        fetch(url, { method: 'GET', signal: AbortSignal.timeout(timeoutMs) }),
        timeoutMs,
        'HTTP dependency check timeout'
      );

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: 'unhealthy',
          latencyMs,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        status: latencyMs > 1000 ? 'degraded' : 'healthy',
        latencyMs,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}
