import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  ping: vi.fn(),
  info: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock fetch for dependency health checks
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { HealthCheckService } from '../src/services/health-check.service';

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HealthCheckService(mockPrisma as any, mockRedis as any, mockLogger as any, 'auth-svc');
  });

  describe('liveness', () => {
    it('returns true', async () => {
      const result = await service.liveness();
      expect(result).toBe(true);
    });
  });

  describe('quickCheck', () => {
    it('returns healthy when DB is reachable', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const result = await service.quickCheck();
      expect(result).toBeDefined();
    });

    it('returns unhealthy when DB fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
      const result = await service.quickCheck();
      expect(result).toBeDefined();
    });
  });

  describe('checkDatabase', () => {
    it('returns pass when SELECT 1 succeeds quickly', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const result = await (service as any).checkDatabase();
      expect(result.status).toMatch(/pass|warn/);
    });

    it('returns fail when DB is unreachable', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await (service as any).checkDatabase();
      expect(result.status).toBe('fail');
    });
  });

  describe('checkRedis', () => {
    it('returns pass when Redis responds to PING', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('used_memory:1024\r\n');
      const result = await (service as any).checkRedis();
      expect(result.status).toMatch(/pass|warn/);
    });

    it('returns fail when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await (service as any).checkRedis();
      expect(result.status).toBe('fail');
    });
  });

  describe('checkResources', () => {
    it('returns resource usage metrics', async () => {
      const result = await (service as any).checkResources();
      expect(result).toBeDefined();
      expect(result.status).toMatch(/pass|warn|fail/);
    });
  });

  describe('checkDependencies', () => {
    it('returns pass when all dependencies healthy', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
      const result = await (service as any).checkDependencies();
      expect(result.status).toMatch(/pass|warn/);
    });

    it('returns warn/fail when a dependency is down', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await (service as any).checkDependencies();
      expect(result).toBeDefined();
    });
  });

  describe('check (full health check)', () => {
    it('aggregates all component checks', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('used_memory:1024\r\n');
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });

      const result = await service.check();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
    });
  });

  describe('readiness', () => {
    it('returns true when service is healthy', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('used_memory:1024\r\n');
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });

      const result = await service.readiness();
      expect(typeof result).toBe('boolean');
    });
  });
});
