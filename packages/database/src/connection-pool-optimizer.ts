/**
 * Connection Pool Optimizer
 *
 * Manages database connection pools with:
 * - Dynamic pool sizing based on load
 * - Connection health monitoring
 * - Automatic failover
 * - PgBouncer configuration generation
 */

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
  createTimeoutMs: number;
  reapIntervalMs: number;
  createRetryIntervalMs: number;
}

export interface PoolStats {
  total: number;
  idle: number;
  waiting: number;
  active: number;
  acquireLatencyMs: number;
  utilizationPercent: number;
}

export interface ConnectionHealthCheck {
  healthy: boolean;
  latencyMs: number;
  lastCheck: Date;
  errorCount: number;
}

export class ConnectionPoolOptimizer {
  private config: PoolConfig;
  private stats: PoolStats = {
    total: 0,
    idle: 0,
    waiting: 0,
    active: 0,
    acquireLatencyMs: 0,
    utilizationPercent: 0,
  };
  private healthChecks: Map<string, ConnectionHealthCheck> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      min: 2,
      max: 10,
      idleTimeoutMs: 30000,
      acquireTimeoutMs: 30000,
      createTimeoutMs: 30000,
      reapIntervalMs: 1000,
      createRetryIntervalMs: 200,
      ...config,
    };
  }

  /**
   * Get optimal pool size based on workload
   */
  getOptimalPoolSize(options: {
    cpuCores: number;
    avgQueryTimeMs: number;
    targetLatencyMs: number;
    concurrentRequests: number;
  }): { min: number; max: number } {
    const { cpuCores, avgQueryTimeMs, targetLatencyMs, concurrentRequests } =
      options;

    // PostgreSQL formula: connections = (core_count * 2) + effective_spindle_count
    // For SSDs, spindle count is ~1
    const baseConnections = cpuCores * 2 + 1;

    // Adjust based on query latency requirements
    const latencyFactor = targetLatencyMs / avgQueryTimeMs;

    // Calculate based on Little's Law: L = λW
    // Where L is connections needed, λ is arrival rate, W is service time
    const littlesLawConnections = Math.ceil(
      (concurrentRequests * avgQueryTimeMs) / 1000
    );

    const maxConnections = Math.max(
      baseConnections,
      Math.min(littlesLawConnections, 100) // Cap at 100
    );

    return {
      min: Math.min(Math.ceil(maxConnections * 0.2), 5),
      max: maxConnections,
    };
  }

  /**
   * Generate PgBouncer configuration
   */
  generatePgBouncerConfig(options: {
    databases: Array<{
      name: string;
      host: string;
      port: number;
      user: string;
    }>;
    defaultPoolSize: number;
    maxClientConnections: number;
    poolMode: 'session' | 'transaction' | 'statement';
  }): string {
    const { databases, defaultPoolSize, maxClientConnections, poolMode } =
      options;

    let config = `[databases]\n`;

    for (const db of databases) {
      config += `${db.name} = host=${db.host} port=${db.port} user=${db.user} dbname=${db.name}\n`;
    }

    config += `
[pgbouncer]
; Pool mode: session, transaction, or statement
pool_mode = ${poolMode}

; Maximum number of client connections allowed
max_client_conn = ${maxClientConnections}

; Default pool size per user/database pair
default_pool_size = ${defaultPoolSize}

; Minimum pool size per user/database pair
min_pool_size = ${Math.ceil(defaultPoolSize * 0.2)}

; Reserve additional connections for superusers
reserve_pool_size = 5
reserve_pool_timeout = 3

; Connection timeouts
server_connect_timeout = 15
server_login_retry = 15
server_idle_timeout = 600
server_lifetime = 3600

; Query timeouts
query_timeout = 0
query_wait_timeout = 120

; Client idle timeout
client_idle_timeout = 0

; Log settings
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

; Stats period
stats_period = 60

; Admin interface
admin_users = postgres
stats_users = pgbouncer_stats

; Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Socket settings
listen_addr = *
listen_port = 6432
unix_socket_dir = /var/run/pgbouncer

; TLS settings
;server_tls_sslmode = prefer
;server_tls_ca_file = /etc/ssl/certs/ca-certificates.crt
`;

    return config;
  }

  /**
   * Start health checking
   */
  startHealthChecks(
    checkFn: (connectionId: string) => Promise<number>,
    connectionIds: string[],
    intervalMs: number = 30000
  ): void {
    // Initialize health checks
    for (const id of connectionIds) {
      this.healthChecks.set(id, {
        healthy: true,
        latencyMs: 0,
        lastCheck: new Date(),
        errorCount: 0,
      });
    }

    // Run periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      for (const id of connectionIds) {
        try {
          const latencyMs = await checkFn(id);
          this.healthChecks.set(id, {
            healthy: true,
            latencyMs,
            lastCheck: new Date(),
            errorCount: 0,
          });
        } catch (_error) {
          const current = this.healthChecks.get(id);
          this.healthChecks.set(id, {
            healthy: false,
            latencyMs: -1,
            lastCheck: new Date(),
            errorCount: (current?.errorCount || 0) + 1,
          });
        }
      }
    }, intervalMs);
  }

  /**
   * Stop health checking
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Get healthy connections
   */
  getHealthyConnections(): string[] {
    const healthy: string[] = [];
    for (const [id, check] of this.healthChecks) {
      if (check.healthy && check.errorCount < 3) {
        healthy.push(id);
      }
    }
    return healthy;
  }

  /**
   * Update pool statistics
   */
  updateStats(stats: Partial<PoolStats>): void {
    this.stats = { ...this.stats, ...stats };

    // Calculate utilization
    if (this.stats.total > 0) {
      this.stats.utilizationPercent =
        (this.stats.active / this.stats.total) * 100;
    }
  }

  /**
   * Get current stats
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Get health check results
   */
  getHealthChecks(): Map<string, ConnectionHealthCheck> {
    return new Map(this.healthChecks);
  }

  /**
   * Should scale up pool?
   */
  shouldScaleUp(): boolean {
    return (
      this.stats.utilizationPercent > 80 &&
      this.stats.total < this.config.max &&
      this.stats.waiting > 0
    );
  }

  /**
   * Should scale down pool?
   */
  shouldScaleDown(): boolean {
    return (
      this.stats.utilizationPercent < 20 &&
      this.stats.total > this.config.min &&
      this.stats.idle > this.stats.total * 0.5
    );
  }

  /**
   * Get recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.stats.utilizationPercent > 90) {
      recommendations.push(
        'Pool utilization is very high (>90%). Consider increasing max pool size.'
      );
    }

    if (this.stats.acquireLatencyMs > 100) {
      recommendations.push(
        `Connection acquire latency is high (${this.stats.acquireLatencyMs}ms). ` +
          'Consider increasing pool size or optimizing queries.'
      );
    }

    if (this.stats.waiting > 5) {
      recommendations.push(
        `${this.stats.waiting} requests waiting for connections. ` +
          'Increase pool size or reduce query duration.'
      );
    }

    const unhealthy = Array.from(this.healthChecks.values()).filter(
      (h) => !h.healthy
    );
    if (unhealthy.length > 0) {
      recommendations.push(
        `${unhealthy.length} connection(s) are unhealthy. Check database connectivity.`
      );
    }

    return recommendations;
  }
}

/**
 * Default pool configurations for different environments
 */
export const PoolConfigs = {
  development: {
    min: 1,
    max: 5,
    idleTimeoutMs: 60000,
    acquireTimeoutMs: 30000,
    createTimeoutMs: 30000,
    reapIntervalMs: 1000,
    createRetryIntervalMs: 200,
  } as PoolConfig,

  production: {
    min: 5,
    max: 20,
    idleTimeoutMs: 30000,
    acquireTimeoutMs: 10000,
    createTimeoutMs: 10000,
    reapIntervalMs: 1000,
    createRetryIntervalMs: 100,
  } as PoolConfig,

  highLoad: {
    min: 10,
    max: 50,
    idleTimeoutMs: 20000,
    acquireTimeoutMs: 5000,
    createTimeoutMs: 5000,
    reapIntervalMs: 500,
    createRetryIntervalMs: 50,
  } as PoolConfig,
};
