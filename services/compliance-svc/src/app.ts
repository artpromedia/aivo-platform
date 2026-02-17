/**
 * AIVO Compliance Service - Application Setup
 *
 * Unified compliance service combining:
 * - Core compliance monitoring (frameworks, findings, dashboard)
 * - COPPA/consent management (from consent-svc)
 * - Legal hold management (from legal-hold-svc)
 * - Data Subject Requests (from dsr-svc)
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';

// ── Core compliance routes ─────────────────────────────────────────────────
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerFindingRoutes } from './routes/findings.js';
import { registerFrameworkRoutes } from './routes/frameworks.js';

// ── Consolidated module routes ─────────────────────────────────────────────
import {
  registerConsentRoutes,
  registerPrivacyRoutes,
  registerCoppaRoutes,
  registerPiiRoutes,
} from './modules/coppa/index.js';
import {
  registerMatterRoutes,
  registerHoldRoutes,
  registerCustodianRoutes,
  registerDataSourceRoutes,
  registerReportRoutes,
  registerAcknowledgeRoute,
} from './modules/legal-hold/index.js';
import { registerDsrRoutes } from './modules/dsr/routes/dsr.js';
import { registerDsrRoutesV2 } from './modules/dsr/routes/dsr-v2.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Rate limiting
  void app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('compliance-svc'));

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'compliance-svc',
      version: '0.2.0',
    });
  });

  // Register auth middleware
  void app.register(authMiddleware as any);

  // ── Core compliance ────────────────────────────────────────────────────────
  void app.register(registerDashboardRoutes as any, { prefix: '/compliance/dashboard' });
  void app.register(registerFrameworkRoutes as any, { prefix: '/compliance/frameworks' });
  void app.register(registerFindingRoutes as any, { prefix: '/compliance/findings' });

  // ── COPPA / Consent (backward-compatible prefixes) ─────────────────────────
  void app.register(registerConsentRoutes as any, { prefix: '/consents' });
  void app.register(registerPrivacyRoutes as any, { prefix: '/privacy' });
  void app.register(registerCoppaRoutes as any, { prefix: '/coppa' });
  void app.register(registerPiiRoutes as any, { prefix: '/pii' });

  // ── Legal Hold (backward-compatible prefixes) ──────────────────────────────
  void app.register(registerMatterRoutes as any, { prefix: '/api/v1/matters' });
  void app.register(registerHoldRoutes as any, { prefix: '/api/v1/holds' });
  void app.register(registerCustodianRoutes as any, { prefix: '/api/v1/custodians' });
  void app.register(registerDataSourceRoutes as any, { prefix: '/api/v1/data-sources' });
  void app.register(registerReportRoutes as any, { prefix: '/api/v1/reports' });
  void app.register(registerAcknowledgeRoute as any, { prefix: '/api/v1' });

  // ── DSR (backward-compatible prefixes) ─────────────────────────────────────
  void app.register(registerDsrRoutes as any, { prefix: '/dsr' });
  void app.register(registerDsrRoutesV2 as any, { prefix: '/dsr' });

  return app;
}
