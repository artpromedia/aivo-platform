/**
 * Tests for device-mgmt-svc — pool management and device policy logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/* ---------- replicate schemas from src/routes/pools.ts ---------- */

const GradeBandEnum = z.enum(['K_2', '3_5', '6_8', '9_12', 'ALL']);

const CreatePoolBody = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid(),
  name: z.string().min(1).max(100),
  gradeBand: GradeBandEnum.optional(),
});

const PoolListQuery = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  gradeBand: GradeBandEnum.optional(),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/* ---------- replicate schemas from src/routes/policies.ts ---------- */

const PolicyConfig = z.object({
  kioskMode: z.boolean().default(false),
  maxOfflineDays: z.number().int().min(0).max(30).default(7),
  gradeBand: GradeBandEnum.optional(),
  dailyScreenTimeLimit: z.number().int().min(0).optional(),
  allowedApps: z.array(z.string()).optional(),
  blockedUrls: z.array(z.string()).optional(),
  requireCheckIn: z.boolean().default(true),
  checkInIntervalHours: z.number().int().min(1).max(168).default(24),
});

const CreatePolicyBody = z.object({
  devicePoolId: z.string().uuid(),
  config: PolicyConfig,
});

/* ---------- pure helper: mergePolicies ---------- */

interface PolicyJson {
  kioskMode?: boolean;
  maxOfflineDays?: number;
  dailyScreenTimeLimit?: number;
  requireCheckIn?: boolean;
  checkInIntervalHours?: number;
  allowedApps?: string[];
  blockedUrls?: string[];
}

interface PolicySnapshot extends PolicyJson {}

function mergePolicies(policies: PolicyJson[]): PolicySnapshot {
  if (policies.length === 0) return {};
  const merged: PolicySnapshot = {};
  // Most restrictive wins
  merged.kioskMode = policies.some((p) => p.kioskMode === true);
  merged.maxOfflineDays = Math.min(...policies.map((p) => p.maxOfflineDays ?? 7));
  merged.requireCheckIn = policies.some((p) => p.requireCheckIn === true);
  const screenTimes = policies.map((p) => p.dailyScreenTimeLimit).filter(Boolean) as number[];
  if (screenTimes.length) merged.dailyScreenTimeLimit = Math.min(...screenTimes);
  merged.checkInIntervalHours = Math.min(
    ...policies.map((p) => p.checkInIntervalHours ?? 24),
  );
  // Merge app lists — intersection for allowed, union for blocked
  const allowedSets = policies.map((p) => p.allowedApps).filter(Boolean) as string[][];
  if (allowedSets.length) {
    const intersection = allowedSets.reduce((acc, list) =>
      acc.filter((app) => list.includes(app)),
    );
    merged.allowedApps = intersection;
  }
  const blockedSets = policies.map((p) => p.blockedUrls).filter(Boolean) as string[][];
  if (blockedSets.length) {
    merged.blockedUrls = [...new Set(blockedSets.flat())];
  }
  return merged;
}

/* ---------- helper: getClientIp ---------- */

function getClientIp(headers: Record<string, string | undefined>, fallbackIp: string): string {
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return fallbackIp;
}

describe('CreatePoolBody schema', () => {
  const uuid = '00000000-0000-0000-0000-000000000001';

  it('parses a valid pool', () => {
    const result = CreatePoolBody.parse({
      tenantId: uuid,
      schoolId: uuid,
      name: 'Lab Cart A',
    });
    expect(result.name).toBe('Lab Cart A');
  });

  it('rejects empty pool name', () => {
    expect(() =>
      CreatePoolBody.parse({ tenantId: uuid, schoolId: uuid, name: '' }),
    ).toThrow();
  });

  it('accepts optional gradeBand', () => {
    const result = CreatePoolBody.parse({
      tenantId: uuid,
      schoolId: uuid,
      name: 'K-2 Pool',
      gradeBand: 'K_2',
    });
    expect(result.gradeBand).toBe('K_2');
  });
});

describe('PoolListQuery schema', () => {
  const uuid = '00000000-0000-0000-0000-000000000001';

  it('applies defaults', () => {
    const result = PoolListQuery.parse({ tenantId: uuid });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('coerces string numbers', () => {
    const result = PoolListQuery.parse({ tenantId: uuid, limit: '10' as any });
    expect(result.limit).toBe(10);
  });
});

describe('PolicyConfig schema', () => {
  it('applies defaults', () => {
    const result = PolicyConfig.parse({});
    expect(result.kioskMode).toBe(false);
    expect(result.maxOfflineDays).toBe(7);
    expect(result.requireCheckIn).toBe(true);
    expect(result.checkInIntervalHours).toBe(24);
  });

  it('rejects maxOfflineDays > 30', () => {
    expect(() => PolicyConfig.parse({ maxOfflineDays: 31 })).toThrow();
  });

  it('accepts custom screen time', () => {
    const result = PolicyConfig.parse({ dailyScreenTimeLimit: 120 });
    expect(result.dailyScreenTimeLimit).toBe(120);
  });
});

describe('mergePolicies', () => {
  it('returns empty for no policies', () => {
    expect(mergePolicies([])).toEqual({});
  });

  it('enables kiosk if any policy enables it', () => {
    const merged = mergePolicies([
      { kioskMode: false },
      { kioskMode: true },
    ]);
    expect(merged.kioskMode).toBe(true);
  });

  it('picks most restrictive offline days', () => {
    const merged = mergePolicies([
      { maxOfflineDays: 7 },
      { maxOfflineDays: 3 },
    ]);
    expect(merged.maxOfflineDays).toBe(3);
  });

  it('picks smallest screen time limit', () => {
    const merged = mergePolicies([
      { dailyScreenTimeLimit: 180 },
      { dailyScreenTimeLimit: 120 },
    ]);
    expect(merged.dailyScreenTimeLimit).toBe(120);
  });

  it('intersects allowed apps', () => {
    const merged = mergePolicies([
      { allowedApps: ['aivo', 'chrome', 'zoom'] },
      { allowedApps: ['aivo', 'zoom'] },
    ]);
    expect(merged.allowedApps).toEqual(['aivo', 'zoom']);
  });

  it('unions blocked URLs', () => {
    const merged = mergePolicies([
      { blockedUrls: ['facebook.com'] },
      { blockedUrls: ['tiktok.com', 'facebook.com'] },
    ]);
    expect(merged.blockedUrls).toHaveLength(2);
    expect(merged.blockedUrls).toContain('facebook.com');
    expect(merged.blockedUrls).toContain('tiktok.com');
  });
});

describe('getClientIp', () => {
  it('extracts from x-forwarded-for header', () => {
    expect(getClientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, '127.0.0.1')).toBe('1.2.3.4');
  });

  it('uses fallback when no forwarded header', () => {
    expect(getClientIp({}, '192.168.1.1')).toBe('192.168.1.1');
  });
});
