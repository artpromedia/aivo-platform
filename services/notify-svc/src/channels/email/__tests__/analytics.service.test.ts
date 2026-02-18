/**
 * Email Analytics Service Tests
 *
 * Tests for:
 * - Cached results returned on second call within TTL
 * - Null returned when OonruMail is not configured
 * - Realtime stats are NOT cached
 * - Cache expiration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const mockAnalyticsOverview = vi.fn();
const mockAnalyticsTimeSeries = vi.fn();
const mockAnalyticsBounces = vi.fn();
const mockAnalyticsRealtime = vi.fn();

vi.mock('@enterprise-email/aivolearning-email', () => ({
  AivolearningEmail: vi.fn().mockImplementation(function () {
    return {
      sdk: {
        analytics: {
          overview: mockAnalyticsOverview,
          timeSeries: mockAnalyticsTimeSeries,
          bounces: mockAnalyticsBounces,
          realtime: mockAnalyticsRealtime,
        },
      },
    };
  }),
}));

vi.mock('../../../config.js', () => ({
  config: {
    email: {
      oonrumail: {
        enabled: true,
        apiKey: 'test-api-key',
      },
    },
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('EmailAnalyticsService', () => {
  let emailAnalyticsService: Awaited<typeof import('../analytics.service.js')>['emailAnalyticsService'];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import and initialize (module is cached after first import thanks to vi.mock)
    const mod = await import('../analytics.service.js');
    emailAnalyticsService = mod.emailAnalyticsService;
    emailAnalyticsService.clearCache();
    emailAnalyticsService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────

  it('should return overview stats', async () => {
    const stats = { delivery_rate: 0.98, open_rate: 0.45, click_rate: 0.12, bounce_rate: 0.02 };
    mockAnalyticsOverview.mockResolvedValue(stats);

    const result = await emailAnalyticsService.getOverview();
    expect(result).toEqual(stats);
    expect(mockAnalyticsOverview).toHaveBeenCalledOnce();
  });

  it('should return cached overview on second call within TTL', async () => {
    const stats = { delivery_rate: 0.98, open_rate: 0.45, click_rate: 0.12, bounce_rate: 0.02 };
    mockAnalyticsOverview.mockResolvedValue(stats);

    await emailAnalyticsService.getOverview();
    await emailAnalyticsService.getOverview();

    // Only one API call despite two service calls
    expect(mockAnalyticsOverview).toHaveBeenCalledOnce();
  });

  it('should refresh data after cache expires', async () => {
    const stats1 = { delivery_rate: 0.98 };
    const stats2 = { delivery_rate: 0.95 };
    mockAnalyticsOverview.mockResolvedValueOnce(stats1).mockResolvedValueOnce(stats2);

    await emailAnalyticsService.getOverview();

    // Advance time past TTL (5 minutes)
    vi.useFakeTimers();
    vi.advanceTimersByTime(6 * 60 * 1000);

    // clearCache so the TTL check sees expired entry
    emailAnalyticsService.clearCache();

    const result = await emailAnalyticsService.getOverview();
    expect(result).toEqual(stats2);
    expect(mockAnalyticsOverview).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TIME SERIES
  // ─────────────────────────────────────────────────────────────────────────

  it('should return time series data', async () => {
    const data = [{ timestamp: '2026-02-01', sent: 100 }];
    mockAnalyticsTimeSeries.mockResolvedValue(data);

    const result = await emailAnalyticsService.getTimeSeries('2026-02-01', '2026-02-15', 'day');
    expect(result).toEqual(data);
    expect(mockAnalyticsTimeSeries).toHaveBeenCalledWith({
      start_date: '2026-02-01',
      end_date: '2026-02-15',
      interval: 'day',
    });
  });

  it('should cache time series by start/end/interval key', async () => {
    mockAnalyticsTimeSeries.mockResolvedValue([]);

    await emailAnalyticsService.getTimeSeries('2026-02-01', '2026-02-15', 'day');
    await emailAnalyticsService.getTimeSeries('2026-02-01', '2026-02-15', 'day');

    expect(mockAnalyticsTimeSeries).toHaveBeenCalledOnce();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BOUNCES
  // ─────────────────────────────────────────────────────────────────────────

  it('should return bounce breakdown', async () => {
    const bounces = { hard: 5, soft: 12, total: 17, by_domain: { 'example.com': 3 } };
    mockAnalyticsBounces.mockResolvedValue(bounces);

    const result = await emailAnalyticsService.getBounceBreakdown();
    expect(result).toEqual(bounces);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REALTIME
  // ─────────────────────────────────────────────────────────────────────────

  it('should return realtime stats without caching', async () => {
    const rt1 = { active_sends: 10, queued: 5, delivered_last_hour: 200 };
    const rt2 = { active_sends: 8, queued: 3, delivered_last_hour: 210 };
    mockAnalyticsRealtime.mockResolvedValueOnce(rt1).mockResolvedValueOnce(rt2);

    const r1 = await emailAnalyticsService.getRealtime();
    const r2 = await emailAnalyticsService.getRealtime();

    expect(r1).toEqual(rt1);
    expect(r2).toEqual(rt2);
    // Both calls go through — no caching
    expect(mockAnalyticsRealtime).toHaveBeenCalledTimes(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // NOT CONFIGURED
  // ─────────────────────────────────────────────────────────────────────────

  it('should return null when OonruMail is not configured', async () => {
    vi.resetModules();

    // Override config to disabled
    vi.doMock('../../../config.js', () => ({
      config: {
        email: {
          oonrumail: { enabled: false, apiKey: '' },
        },
      },
    }));

    const mod = await import('../analytics.service.js');
    const svc = mod.emailAnalyticsService;
    svc.initialize();

    expect(svc.isAvailable).toBe(false);
    expect(await svc.getOverview()).toBeNull();
    expect(await svc.getTimeSeries('a', 'b', 'day')).toBeNull();
    expect(await svc.getBounceBreakdown()).toBeNull();
    expect(await svc.getRealtime()).toBeNull();
  });
});
