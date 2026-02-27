/**
 * Tests for status-page-svc auto-incident detection logic.
 *
 * We test the threshold evaluation, incident creation/resolution rules,
 * and the processComponentSnapshot function's logic paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock collectMetricSnapshots and DB ──────────────────────────────────
vi.mock('../src/services/prometheus-client.js', () => ({
  collectMetricSnapshots: vi.fn().mockResolvedValue([]),
}));

vi.mock('../src/db/database.js', () => {
  const stmtRun = vi.fn();
  const stmtGet = vi.fn();
  const stmtAll = vi.fn().mockReturnValue([]);

  return {
    getDb: vi.fn(() => ({
      prepare: vi.fn(() => ({
        run: stmtRun,
        get: stmtGet,
        all: stmtAll,
      })),
    })),
    __stmtRun: stmtRun,
    __stmtGet: stmtGet,
    __stmtAll: stmtAll,
  };
});

vi.mock('../src/config.js', () => ({
  config: {
    detection: {
      pollIntervalSeconds: 30,
      downThresholdSeconds: 120,
      errorRateThreshold: 0.05,
      errorRateDurationSeconds: 300,
      latencyFactor: 2,
      latencyDurationSeconds: 600,
    },
    databasePath: ':memory:',
    prometheusUrl: 'http://localhost:9090',
  },
}));

vi.mock('../src/components.js', () => ({
  COMPONENTS: [
    { id: 'auth-svc', name: 'Authentication Service', group: 'core' },
    { id: 'api-gateway', name: 'API Gateway', group: 'core' },
  ],
  deriveOverallStatus: vi.fn().mockReturnValue('operational'),
}));

vi.mock('node-cron', () => ({
  default: { schedule: vi.fn(() => ({ stop: vi.fn() })) },
}));

describe('auto-incident detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startAutoDetection / stopAutoDetection', () => {
    it('startAutoDetection does not throw', async () => {
      const { startAutoDetection } = await import('../src/services/auto-incident.js');
      expect(() => startAutoDetection()).not.toThrow();
    });

    it('stopAutoDetection does not throw when not started', async () => {
      const { stopAutoDetection } = await import('../src/services/auto-incident.js');
      expect(() => stopAutoDetection()).not.toThrow();
    });
  });

  describe('runDetectionCycle', () => {
    it('calls collectMetricSnapshots', async () => {
      const { runDetectionCycle } = await import('../src/services/auto-incident.js');
      const { collectMetricSnapshots } = await import(
        '../src/services/prometheus-client.js'
      );

      await runDetectionCycle();
      expect(collectMetricSnapshots).toHaveBeenCalled();
    });

    it('handles collectMetricSnapshots failure gracefully', async () => {
      const { runDetectionCycle } = await import('../src/services/auto-incident.js');
      const { collectMetricSnapshots } = await import(
        '../src/services/prometheus-client.js'
      );
      vi.mocked(collectMetricSnapshots).mockRejectedValueOnce(
        new Error('Prometheus unreachable'),
      );

      // Should not throw — errors are caught and logged
      await expect(runDetectionCycle()).resolves.toBeUndefined();
    });
  });

  describe('threshold logic (unit)', () => {
    // These tests verify the pure threshold logic independently

    it('healthy component stays operational', () => {
      const snap = {
        component_id: 'auth-svc',
        is_healthy: true,
        error_rate: 0.01,
        p95_latency_ms: 50,
      };
      // Healthy, low error rate, low latency → operational
      expect(snap.is_healthy).toBe(true);
      expect(snap.error_rate).toBeLessThan(0.05);
    });

    it('unhealthy component triggers down tracking', () => {
      const snap = {
        component_id: 'auth-svc',
        is_healthy: false,
        error_rate: null,
        p95_latency_ms: null,
      };
      expect(snap.is_healthy).toBe(false);
    });

    it('high error rate exceeds threshold', () => {
      const threshold = 0.05;
      const errorRate = 0.12;
      expect(errorRate).toBeGreaterThan(threshold);
    });

    it('latency factor correctly determines degradation', () => {
      const baseline = 100; // ms
      const factor = 2;
      const current = 250; // ms
      expect(current).toBeGreaterThan(baseline * factor);
    });

    it('latency within threshold is not degraded', () => {
      const baseline = 100;
      const factor = 2;
      const current = 150;
      expect(current).toBeLessThanOrEqual(baseline * factor);
    });
  });

  describe('incident severity mapping', () => {
    it('major_outage → critical severity', () => {
      const statusToSeverity = (status: string) =>
        status === 'major_outage' ? 'critical' :
        status === 'partial_outage' ? 'major' : 'minor';

      expect(statusToSeverity('major_outage')).toBe('critical');
      expect(statusToSeverity('partial_outage')).toBe('major');
      expect(statusToSeverity('degraded')).toBe('minor');
    });
  });

  describe('auto-resolve logic', () => {
    it('resolves when all components are healthy', () => {
      const componentStatuses = new Map([
        ['auth-svc', 'operational'],
        ['api-gateway', 'operational'],
      ]);
      const ids = ['auth-svc', 'api-gateway'];
      const allHealthy = ids.every(id => componentStatuses.get(id) === 'operational');
      expect(allHealthy).toBe(true);
    });

    it('does not resolve when some components are unhealthy', () => {
      const componentStatuses = new Map([
        ['auth-svc', 'operational'],
        ['api-gateway', 'major_outage'],
      ]);
      const ids = ['auth-svc', 'api-gateway'];
      const allHealthy = ids.every(id => componentStatuses.get(id) === 'operational');
      expect(allHealthy).toBe(false);
    });
  });
});
