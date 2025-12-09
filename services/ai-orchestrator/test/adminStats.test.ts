import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { registerAdminStatsRoutes } from '../src/routes/adminStats.js';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ══════════════════════════════════════════════════════════════════════════════

// Mock Pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
};

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════════════════════

describe('Admin Stats Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.resetAllMocks();
    app = Fastify({ logger: false });
    await app.register(registerAdminStatsRoutes, { pool: mockPool as any });
  });

  afterEach(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AI CALL LOG STATS
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /admin/ai/call-logs/stats', () => {
    it('returns 400 for missing date parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/call-logs/stats',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid date range parameters');
    });

    it('returns 400 for invalid date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/call-logs/stats?from=invalid&to=2025-12-09',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid date range parameters');
    });

    it('returns stats with valid date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/call-logs/stats?from=2025-11-09&to=2025-12-09',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Verify structure of response
      expect(body).toHaveProperty('totalCalls');
      expect(body).toHaveProperty('callsByAgentType');
      expect(body).toHaveProperty('safetyDistribution');
      expect(body).toHaveProperty('avgLatencyMs');
      expect(body).toHaveProperty('p95LatencyMs');
      expect(body).toHaveProperty('avgCostCentsPerCall');
      expect(body).toHaveProperty('totalCostCents');
      expect(body).toHaveProperty('callsByProvider');
      expect(body).toHaveProperty('callsByStatus');
      expect(body).toHaveProperty('periodStart', '2025-11-09');
      expect(body).toHaveProperty('periodEnd', '2025-12-09');
    });

    it('includes all safety labels in distribution', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/call-logs/stats?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      expect(body.safetyDistribution).toHaveProperty('SAFE');
      expect(body.safetyDistribution).toHaveProperty('LOW');
      expect(body.safetyDistribution).toHaveProperty('MEDIUM');
      expect(body.safetyDistribution).toHaveProperty('HIGH');
    });

    it('includes SUCCESS and ERROR in status counts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/call-logs/stats?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      expect(body.callsByStatus).toHaveProperty('SUCCESS');
      expect(body.callsByStatus).toHaveProperty('ERROR');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AI INCIDENT STATS
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /admin/ai/incidents/stats', () => {
    it('returns 400 for missing date parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/incidents/stats',
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns stats with valid date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/incidents/stats?from=2025-11-09&to=2025-12-09',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Verify structure
      expect(body).toHaveProperty('totalIncidents');
      expect(body).toHaveProperty('incidentCountsBySeverity');
      expect(body).toHaveProperty('incidentCountsByCategory');
      expect(body).toHaveProperty('incidentCountsByStatus');
      expect(body).toHaveProperty('openIncidentsBySeverity');
      expect(body).toHaveProperty('topTenantsByIncidentCount');
    });

    it('includes all severity levels', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/incidents/stats?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      expect(body.incidentCountsBySeverity).toHaveProperty('INFO');
      expect(body.incidentCountsBySeverity).toHaveProperty('LOW');
      expect(body.incidentCountsBySeverity).toHaveProperty('MEDIUM');
      expect(body.incidentCountsBySeverity).toHaveProperty('HIGH');
      expect(body.incidentCountsBySeverity).toHaveProperty('CRITICAL');
    });

    it('includes all categories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/incidents/stats?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      expect(body.incidentCountsByCategory).toHaveProperty('SAFETY');
      expect(body.incidentCountsByCategory).toHaveProperty('PRIVACY');
      expect(body.incidentCountsByCategory).toHaveProperty('COMPLIANCE');
      expect(body.incidentCountsByCategory).toHaveProperty('PERFORMANCE');
      expect(body.incidentCountsByCategory).toHaveProperty('COST');
    });

    it('returns top tenants array with correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/incidents/stats?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      expect(Array.isArray(body.topTenantsByIncidentCount)).toBe(true);
      
      if (body.topTenantsByIncidentCount.length > 0) {
        const firstTenant = body.topTenantsByIncidentCount[0];
        expect(firstTenant).toHaveProperty('tenantId');
        expect(firstTenant).toHaveProperty('tenantName');
        expect(firstTenant).toHaveProperty('incidentCount');
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POLICY SUMMARY
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /admin/policies/active-summary', () => {
    it('returns policy summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/policies/active-summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('globalPolicy');
      expect(body).toHaveProperty('tenantOverrideCount');
    });

    it('includes global policy details when set', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/policies/active-summary',
      });

      const body = JSON.parse(response.body);
      
      if (body.globalPolicy) {
        expect(body.globalPolicy).toHaveProperty('id');
        expect(body.globalPolicy).toHaveProperty('name');
        expect(body.globalPolicy).toHaveProperty('version');
        expect(body.globalPolicy).toHaveProperty('updatedAt');
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // COMPLIANCE REPORT
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /admin/compliance/report', () => {
    it('returns 400 for missing date parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/report',
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns full compliance report', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/report?from=2025-11-09&to=2025-12-09',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('generatedAt');
      expect(body).toHaveProperty('periodStart', '2025-11-09');
      expect(body).toHaveProperty('periodEnd', '2025-12-09');
      expect(body).toHaveProperty('aiStats');
      expect(body).toHaveProperty('incidentStats');
      expect(body).toHaveProperty('dsrStats');
      expect(body).toHaveProperty('policyStatus');
    });

    it('aiStats section has correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/report?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      const aiStats = body.aiStats;
      
      expect(aiStats).toHaveProperty('totalCalls');
      expect(aiStats).toHaveProperty('safetyDistribution');
      expect(aiStats).toHaveProperty('avgLatencyMs');
    });

    it('incidentStats section has correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/report?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      const incidentStats = body.incidentStats;
      
      expect(incidentStats).toHaveProperty('totalIncidents');
      expect(incidentStats).toHaveProperty('incidentCountsBySeverity');
      expect(incidentStats).toHaveProperty('topTenantsByIncidentCount');
    });

    it('dsrStats section has correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/report?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      const dsrStats = body.dsrStats;
      
      expect(dsrStats).toHaveProperty('totalRequests');
      expect(dsrStats).toHaveProperty('countsByType');
      expect(dsrStats).toHaveProperty('countsByStatus');
      expect(dsrStats).toHaveProperty('recentRequests');
    });

    it('policyStatus section has correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/compliance/report?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      const policyStatus = body.policyStatus;
      
      expect(policyStatus).toHaveProperty('globalPolicy');
      expect(policyStatus).toHaveProperty('tenantOverrideCount');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DATA AGGREGATION TESTS (When real queries are implemented)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Data aggregation (mock verification)', () => {
    it('AI stats totals are consistent', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/call-logs/stats?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      
      // Sum of safety distribution should equal total calls
      const safetySum = Object.values(body.safetyDistribution as Record<string, number>).reduce(
        (a: number, b: number) => a + b,
        0
      );
      expect(safetySum).toBe(body.totalCalls);

      // Sum of status counts should equal total calls
      const statusSum = body.callsByStatus.SUCCESS + body.callsByStatus.ERROR;
      expect(statusSum).toBe(body.totalCalls);
    });

    it('Incident stats totals are consistent', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai/incidents/stats?from=2025-11-09&to=2025-12-09',
      });

      const body = JSON.parse(response.body);
      
      // Sum of severity counts should equal total incidents
      const severitySum = Object.values(body.incidentCountsBySeverity as Record<string, number>).reduce(
        (a: number, b: number) => a + b,
        0
      );
      expect(severitySum).toBe(body.totalIncidents);

      // Sum of status counts should equal total incidents
      const statusSum = Object.values(body.incidentCountsByStatus as Record<string, number>).reduce(
        (a: number, b: number) => a + b,
        0
      );
      expect(statusSum).toBe(body.totalIncidents);
    });
  });
});
