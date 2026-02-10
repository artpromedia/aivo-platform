import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionPoolOptimizer, PoolConfigs } from '../src/connection-pool-optimizer.js';
import { QueryExplainAnalyzer, ReadReplicaRouter } from '../src/query-explain-analyzer.js';

// ============================================================================
// ConnectionPoolOptimizer
// ============================================================================

describe('ConnectionPoolOptimizer', () => {
  let optimizer: ConnectionPoolOptimizer;

  beforeEach(() => {
    optimizer = new ConnectionPoolOptimizer();
  });

  describe('getOptimalPoolSize', () => {
    it('calculates pool size based on CPU cores', () => {
      const result = optimizer.getOptimalPoolSize({
        cpuCores: 4,
        avgQueryTimeMs: 10,
        targetLatencyMs: 50,
        concurrentRequests: 20,
      });

      expect(result.min).toBeGreaterThan(0);
      expect(result.max).toBeGreaterThanOrEqual(result.min);
      // PostgreSQL formula: 4 * 2 + 1 = 9
      expect(result.max).toBeGreaterThanOrEqual(9);
    });

    it('caps max connections at 100', () => {
      const result = optimizer.getOptimalPoolSize({
        cpuCores: 64,
        avgQueryTimeMs: 500,
        targetLatencyMs: 100,
        concurrentRequests: 1000,
      });

      expect(result.max).toBeLessThanOrEqual(100);
    });
  });

  describe('generatePgBouncerConfig', () => {
    it('generates valid PgBouncer config', () => {
      const config = optimizer.generatePgBouncerConfig({
        databases: [{ name: 'aivo_prod', host: 'db1.local', port: 5432, user: 'app' }],
        defaultPoolSize: 20,
        maxClientConnections: 200,
        poolMode: 'transaction',
      });

      expect(config).toContain('[databases]');
      expect(config).toContain('[pgbouncer]');
      expect(config).toContain('pool_mode = transaction');
      expect(config).toContain('max_client_conn = 200');
      expect(config).toContain('default_pool_size = 20');
      expect(config).toContain('aivo_prod = host=db1.local');
    });
  });

  describe('pool scaling', () => {
    it('shouldScaleUp when utilization is high and requests waiting', () => {
      optimizer.updateStats({
        total: 5,
        active: 5,
        idle: 0,
        waiting: 3,
        utilizationPercent: 100,
        acquireLatencyMs: 50,
      });

      expect(optimizer.shouldScaleUp()).toBe(true);
    });

    it('shouldScaleDown when utilization is low', () => {
      optimizer.updateStats({
        total: 10,
        active: 1,
        idle: 8,
        waiting: 0,
        utilizationPercent: 10,
        acquireLatencyMs: 1,
      });

      expect(optimizer.shouldScaleDown()).toBe(true);
    });

    it('does not scale up when already at max', () => {
      // Default max is 10
      optimizer.updateStats({
        total: 10,
        active: 10,
        idle: 0,
        waiting: 5,
        utilizationPercent: 100,
        acquireLatencyMs: 100,
      });

      expect(optimizer.shouldScaleUp()).toBe(false);
    });
  });

  describe('getRecommendations', () => {
    it('warns about high utilization', () => {
      optimizer.updateStats({
        utilizationPercent: 95,
        total: 5,
        active: 5,
        idle: 0,
        waiting: 0,
        acquireLatencyMs: 5,
      });
      const recs = optimizer.getRecommendations();
      expect(recs.some((r) => r.includes('utilization'))).toBe(true);
    });

    it('warns about high acquire latency', () => {
      optimizer.updateStats({
        acquireLatencyMs: 200,
        total: 5,
        active: 3,
        idle: 2,
        waiting: 0,
        utilizationPercent: 60,
      });
      const recs = optimizer.getRecommendations();
      expect(recs.some((r) => r.includes('latency'))).toBe(true);
    });

    it('warns about waiting requests', () => {
      optimizer.updateStats({
        waiting: 10,
        total: 5,
        active: 5,
        idle: 0,
        utilizationPercent: 100,
        acquireLatencyMs: 5,
      });
      const recs = optimizer.getRecommendations();
      expect(recs.some((r) => r.includes('waiting'))).toBe(true);
    });
  });

  describe('health checks', () => {
    it('tracks healthy connections', () => {
      optimizer.startHealthChecks(
        async () => 5,
        ['conn-1', 'conn-2'],
        60000 // Long interval so it doesn't fire during test
      );

      const healthy = optimizer.getHealthyConnections();
      expect(healthy).toContain('conn-1');
      expect(healthy).toContain('conn-2');

      optimizer.stopHealthChecks();
    });
  });
});

describe('PoolConfigs', () => {
  it('has development config with small pool', () => {
    expect(PoolConfigs.development.min).toBe(1);
    expect(PoolConfigs.development.max).toBe(5);
  });

  it('has production config with larger pool', () => {
    expect(PoolConfigs.production.min).toBe(5);
    expect(PoolConfigs.production.max).toBe(20);
  });

  it('has highLoad config with large pool', () => {
    expect(PoolConfigs.highLoad.min).toBe(10);
    expect(PoolConfigs.highLoad.max).toBe(50);
  });
});

// ============================================================================
// QueryExplainAnalyzer
// ============================================================================

describe('QueryExplainAnalyzer', () => {
  let analyzer: QueryExplainAnalyzer;

  beforeEach(() => {
    analyzer = new QueryExplainAnalyzer();
  });

  describe('analyze', () => {
    it('identifies sequential scans on large tables', () => {
      const plan = {
        'Node Type': 'Seq Scan',
        'Relation Name': 'users',
        'Startup Cost': 0,
        'Total Cost': 500,
        'Plan Rows': 5000,
        'Plan Width': 100,
        'Actual Rows': 5000,
        Filter: "(status = 'active')",
      };

      const analysis = analyzer.analyze(plan);
      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.issues.some((i) => i.type === 'sequential_scan')).toBe(true);
      expect(analysis.score).toBeLessThan(100);
    });

    it('does not flag small sequential scans', () => {
      const plan = {
        'Node Type': 'Seq Scan',
        'Relation Name': 'settings',
        'Startup Cost': 0,
        'Total Cost': 10,
        'Plan Rows': 50,
        'Plan Width': 40,
        'Actual Rows': 50,
      };

      const analysis = analyzer.analyze(plan);
      const seqScanIssues = analysis.issues.filter((i) => i.type === 'sequential_scan');
      expect(seqScanIssues).toHaveLength(0);
    });

    it('identifies expensive sort operations', () => {
      const plan = {
        'Node Type': 'Sort',
        'Startup Cost': 100,
        'Total Cost': 2000,
        'Plan Rows': 20000,
        'Plan Width': 50,
        'Actual Rows': 20000,
        'Sort Key': ['created_at'],
        'Sort Space Type': 'Disk',
      };

      const analysis = analyzer.analyze(plan);
      expect(analysis.issues.some((i) => i.type === 'expensive_sort')).toBe(true);
    });

    it('identifies expensive nested loops', () => {
      const plan = {
        'Node Type': 'Nested Loop',
        'Startup Cost': 0,
        'Total Cost': 5000,
        'Plan Rows': 1000,
        'Plan Width': 100,
        'Actual Loops': 200,
      };

      const analysis = analyzer.analyze(plan);
      expect(analysis.issues.some((i) => i.type === 'expensive_nested_loop')).toBe(true);
    });

    it('recursively analyzes child plans', () => {
      const plan = {
        'Node Type': 'Hash Join',
        'Startup Cost': 0,
        'Total Cost': 100,
        'Plan Rows': 100,
        'Plan Width': 50,
        Plans: [
          {
            'Node Type': 'Seq Scan',
            'Relation Name': 'orders',
            'Startup Cost': 0,
            'Total Cost': 500,
            'Plan Rows': 50000,
            'Plan Width': 80,
            'Actual Rows': 50000,
            Filter: '(amount > 0)',
          },
        ],
      };

      const analysis = analyzer.analyze(plan);
      expect(analysis.issues.some((i) => i.type === 'sequential_scan')).toBe(true);
    });

    it('calculates score between 0 and 100', () => {
      const plan = {
        'Node Type': 'Index Scan',
        'Startup Cost': 0,
        'Total Cost': 10,
        'Plan Rows': 1,
        'Plan Width': 50,
      };

      const analysis = analyzer.analyze(plan);
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
    });
  });

  describe('formatReport', () => {
    it('generates a readable report', () => {
      const analysis = analyzer.analyze({
        'Node Type': 'Seq Scan',
        'Relation Name': 'users',
        'Startup Cost': 0,
        'Total Cost': 500,
        'Plan Rows': 5000,
        'Plan Width': 100,
        'Actual Rows': 5000,
        'Actual Total Time': 150,
      });

      const report = analyzer.formatReport(analysis);
      expect(report).toContain('Query Analysis Report');
      expect(report).toContain('Score:');
      expect(report).toContain('Issues Found:');
    });
  });

  describe('generateIndexSuggestion', () => {
    it('generates basic CREATE INDEX', () => {
      const sql = analyzer.generateIndexSuggestion('users', ['email']);
      expect(sql).toBe('CREATE INDEX idx_users_email ON users (email);');
    });

    it('generates unique index', () => {
      const sql = analyzer.generateIndexSuggestion('users', ['email'], { unique: true });
      expect(sql).toContain('UNIQUE');
    });

    it('generates concurrent index', () => {
      const sql = analyzer.generateIndexSuggestion('users', ['status'], { concurrent: true });
      expect(sql).toContain('CONCURRENTLY');
    });

    it('generates partial index', () => {
      const sql = analyzer.generateIndexSuggestion('orders', ['user_id'], {
        partial: "status = 'active'",
      });
      expect(sql).toContain('WHERE');
    });

    it('generates covering index with INCLUDE', () => {
      const sql = analyzer.generateIndexSuggestion('users', ['tenant_id'], {
        include: ['name', 'email'],
      });
      expect(sql).toContain('INCLUDE (name, email)');
    });

    it('generates multi-column index', () => {
      const sql = analyzer.generateIndexSuggestion('events', ['tenant_id', 'created_at']);
      expect(sql).toBe(
        'CREATE INDEX idx_events_tenant_id_created_at ON events (tenant_id, created_at);'
      );
    });
  });
});

// ============================================================================
// ReadReplicaRouter
// ============================================================================

describe('ReadReplicaRouter', () => {
  let router: ReadReplicaRouter;

  beforeEach(() => {
    router = new ReadReplicaRouter('primary://db', ['replica1://db', 'replica2://db']);
  });

  describe('getWriteUrl', () => {
    it('always returns primary', () => {
      expect(router.getWriteUrl()).toBe('primary://db');
    });
  });

  describe('getReadUrl', () => {
    it('round-robins across replicas', () => {
      const url1 = router.getReadUrl();
      const url2 = router.getReadUrl();
      expect(url1).not.toBe(url2);
      // Both should be replicas
      expect([url1, url2].every((u) => u.startsWith('replica'))).toBe(true);
    });

    it('falls back to primary when no healthy replicas', () => {
      router.markUnhealthy('replica1://db');
      router.markUnhealthy('replica2://db');
      expect(router.getReadUrl()).toBe('primary://db');
    });
  });

  describe('markUnhealthy/markHealthy', () => {
    it('removes and re-adds replicas', () => {
      router.markUnhealthy('replica1://db');
      // Only replica2 should be available
      const reads = new Set([router.getReadUrl(), router.getReadUrl()]);
      expect(reads.has('replica1://db')).toBe(false);

      router.markHealthy('replica1://db');
      // Now both should be available again
      const moreReads = new Set<string>();
      for (let i = 0; i < 10; i++) {
        moreReads.add(router.getReadUrl());
      }
      expect(moreReads.has('replica1://db')).toBe(true);
    });

    it('does not add unknown replicas via markHealthy', () => {
      router.markHealthy('unknown://db');
      const status = router.getStatus();
      expect(status.healthyReplicas).not.toContain('unknown://db');
    });
  });

  describe('isReadOnlyQuery', () => {
    it('identifies SELECT as read-only', () => {
      expect(router.isReadOnlyQuery('SELECT * FROM users')).toBe(true);
    });

    it('identifies WITH (CTE) as read-only', () => {
      expect(router.isReadOnlyQuery('WITH cte AS (SELECT 1) SELECT * FROM cte')).toBe(true);
    });

    it('identifies EXPLAIN as read-only', () => {
      expect(router.isReadOnlyQuery('EXPLAIN SELECT * FROM users')).toBe(true);
    });

    it('identifies INSERT as write', () => {
      expect(router.isReadOnlyQuery('INSERT INTO users VALUES (1)')).toBe(false);
    });

    it('identifies UPDATE as write', () => {
      expect(router.isReadOnlyQuery("UPDATE users SET name = 'x'")).toBe(false);
    });

    it('identifies DELETE as write', () => {
      expect(router.isReadOnlyQuery('DELETE FROM users')).toBe(false);
    });
  });

  describe('routeQuery', () => {
    it('routes reads to replicas', () => {
      const url = router.routeQuery('SELECT * FROM users');
      expect(url).toMatch(/^replica/);
    });

    it('routes writes to primary', () => {
      const url = router.routeQuery("INSERT INTO users (name) VALUES ('test')");
      expect(url).toBe('primary://db');
    });
  });

  describe('getStatus', () => {
    it('returns complete status', () => {
      const status = router.getStatus();
      expect(status.primary).toBe('primary://db');
      expect(status.replicas).toHaveLength(2);
      expect(status.healthyReplicas).toHaveLength(2);
      expect(status.unhealthyReplicas).toHaveLength(0);
    });

    it('reflects unhealthy replicas', () => {
      router.markUnhealthy('replica1://db');
      const status = router.getStatus();
      expect(status.healthyReplicas).toHaveLength(1);
      expect(status.unhealthyReplicas).toHaveLength(1);
      expect(status.unhealthyReplicas).toContain('replica1://db');
    });
  });
});
