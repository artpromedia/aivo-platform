/**
 * Email Analytics Routes Tests
 *
 * Tests for:
 * - 503 when OonruMail is not configured
 * - Admin-only access (403 for non-admin)
 * - Successful overview/bounces/realtime/timeseries responses
 * - Timeseries query validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const mockGetOverview = vi.fn();
const mockGetTimeSeries = vi.fn();
const mockGetBounceBreakdown = vi.fn();
const mockGetRealtime = vi.fn();
const mockInitialize = vi.fn();

vi.mock('../../channels/email/analytics.service.js', () => ({
  emailAnalyticsService: {
    initialize: mockInitialize,
    getOverview: mockGetOverview,
    getTimeSeries: mockGetTimeSeries,
    getBounceBreakdown: mockGetBounceBreakdown,
    getRealtime: mockGetRealtime,
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Email Analytics Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    const { registerEmailAnalyticsRoutes } = await import('../email-analytics.js');
    await registerEmailAnalyticsRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 403 when user is not admin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/overview',
      headers: { 'x-user-roles': 'teacher' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should allow district_admin access', async () => {
    mockGetOverview.mockResolvedValue({ delivery_rate: 0.98 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/overview',
      headers: { 'x-user-roles': 'district_admin' },
    });

    expect(response.statusCode).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 503 — not configured
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 503 when analytics not available (overview)', async () => {
    mockGetOverview.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/overview',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'Email analytics not available' });
  });

  it('should return 503 when analytics not available (bounces)', async () => {
    mockGetBounceBreakdown.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/bounces',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(503);
  });

  it('should return 503 when analytics not available (realtime)', async () => {
    mockGetRealtime.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/realtime',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(503);
  });

  it('should return 503 when analytics not available (timeseries)', async () => {
    mockGetTimeSeries.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/timeseries?start=2026-01-01&end=2026-02-01&interval=day',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(503);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS RESPONSES
  // ─────────────────────────────────────────────────────────────────────────

  it('should return overview stats when available', async () => {
    const stats = { delivery_rate: 0.98, open_rate: 0.45, click_rate: 0.12, bounce_rate: 0.02 };
    mockGetOverview.mockResolvedValue(stats);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/overview',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: stats });
  });

  it('should return bounce breakdown', async () => {
    const bounces = { hard: 5, soft: 12, total: 17, by_domain: { 'example.com': 3 } };
    mockGetBounceBreakdown.mockResolvedValue(bounces);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/bounces',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: bounces });
  });

  it('should return realtime stats', async () => {
    const rt = { active_sends: 10, queued: 5, delivered_last_hour: 200 };
    mockGetRealtime.mockResolvedValue(rt);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/realtime',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: rt });
  });

  it('should return time series data with valid query params', async () => {
    const ts = [{ timestamp: '2026-02-01', sent: 100 }];
    mockGetTimeSeries.mockResolvedValue(ts);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/timeseries?start=2026-02-01&end=2026-02-15&interval=day',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: ts });
    expect(mockGetTimeSeries).toHaveBeenCalledWith('2026-02-01', '2026-02-15', 'day');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  it('should return 400 for timeseries without required params', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/email/analytics/timeseries',
      headers: { 'x-user-roles': 'admin' },
    });

    expect(response.statusCode).toBe(400);
  });
});
