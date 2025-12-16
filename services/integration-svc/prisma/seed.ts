/**
 * AIVO Platform - Integration Service Seed Data
 *
 * Creates:
 * - Webhook endpoints for partner integrations
 * - Sample webhook deliveries
 * - API keys for external access
 */

import {
  PrismaClient,
  WebhookEventType,
  WebhookDeliveryStatus,
  ApiKeyStatus,
  ApiScope,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000002';
const ADMIN_USER_ID = '00000000-0000-0000-1000-000000000001';

// Webhook endpoint IDs
const CANVAS_WEBHOOK = '00000000-0000-0000-in00-000000000001';
const ANALYTICS_WEBHOOK = '00000000-0000-0000-in00-000000000002';

// API key IDs
const DEV_API_KEY = '00000000-0000-0000-in10-000000000001';
const PARTNER_API_KEY = '00000000-0000-0000-in10-000000000002';

async function main() {
  console.log('🌱 Seeding integration-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Webhook Endpoints
  // ══════════════════════════════════════════════════════════════════════════

  const webhookEndpoints = [
    {
      id: CANVAS_WEBHOOK,
      tenantId: DEV_TENANT_ID,
      name: 'Canvas LMS Integration',
      description: 'Send session and assessment events to Canvas for gradebook sync',
      url: 'https://canvas.example.com/api/v1/aivo-webhook',
      secretKeyRef: 'kms://aivo/integration/webhooks/canvas-secret',
      enabled: true,
      eventTypes: [
        WebhookEventType.SESSION_COMPLETED,
        WebhookEventType.ASSESSMENT_COMPLETED,
        WebhookEventType.SKILL_MASTERY_UPDATED,
      ],
      filterJson: {
        subjects: ['MATH', 'ELA'],
        gradeBands: ['K5', 'G6_8'],
      },
      createdBy: ADMIN_USER_ID,
      failureCount: 0,
    },
    {
      id: ANALYTICS_WEBHOOK,
      tenantId: DEV_TENANT_ID,
      name: 'District Analytics Dashboard',
      description: 'Stream engagement events to district data warehouse',
      url: 'https://analytics.district.example.com/ingest/aivo',
      secretKeyRef: 'kms://aivo/integration/webhooks/district-analytics-secret',
      enabled: true,
      eventTypes: [
        WebhookEventType.SESSION_STARTED,
        WebhookEventType.SESSION_COMPLETED,
        WebhookEventType.STREAK_MILESTONE,
        WebhookEventType.ACHIEVEMENT_UNLOCKED,
        WebhookEventType.LEARNER_ENROLLED,
      ],
      filterJson: null,
      createdBy: ADMIN_USER_ID,
      failureCount: 0,
      lastDeliveryAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    },
  ];

  for (const endpoint of webhookEndpoints) {
    await prisma.webhookEndpoint.upsert({
      where: { id: endpoint.id },
      update: {},
      create: endpoint,
    });
  }
  console.log(`  ✅ Created ${webhookEndpoints.length} webhook endpoints`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Sample Webhook Deliveries
  // ══════════════════════════════════════════════════════════════════════════

  const deliveries = [
    {
      id: '00000000-0000-0000-in20-000000000001',
      webhookId: ANALYTICS_WEBHOOK,
      eventType: WebhookEventType.SESSION_COMPLETED,
      eventId: '00000000-0000-0000-ev00-000000000001',
      payloadJson: {
        event: 'SESSION_COMPLETED',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        tenantId: DEV_TENANT_ID,
        data: {
          sessionId: '00000000-0000-0000-6000-000000000001',
          learnerId: '00000000-0000-0000-2000-000000000001',
          duration: 1500,
          itemsCompleted: 12,
          correctAnswers: 10,
        },
      },
      status: WebhookDeliveryStatus.SUCCESS,
      attemptCount: 1,
      maxAttempts: 5,
      scheduledAt: new Date(Date.now() - 30 * 60 * 1000),
      firstAttemptAt: new Date(Date.now() - 30 * 60 * 1000),
      lastAttemptAt: new Date(Date.now() - 30 * 60 * 1000),
      completedAt: new Date(Date.now() - 30 * 60 * 1000),
      lastStatusCode: 200,
      responseTimeMs: 145,
    },
    {
      id: '00000000-0000-0000-in20-000000000002',
      webhookId: CANVAS_WEBHOOK,
      eventType: WebhookEventType.SKILL_MASTERY_UPDATED,
      eventId: '00000000-0000-0000-ev00-000000000002',
      payloadJson: {
        event: 'SKILL_MASTERY_UPDATED',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        tenantId: DEV_TENANT_ID,
        data: {
          learnerId: '00000000-0000-0000-2000-000000000001',
          skillId: 'addition-2digit',
          previousLevel: 0.65,
          newLevel: 0.75,
          masteryAchieved: false,
        },
      },
      status: WebhookDeliveryStatus.SUCCESS,
      attemptCount: 1,
      maxAttempts: 5,
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
      firstAttemptAt: new Date(Date.now() - 60 * 60 * 1000),
      lastAttemptAt: new Date(Date.now() - 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 60 * 60 * 1000),
      lastStatusCode: 200,
      responseTimeMs: 220,
    },
    // Pending delivery
    {
      id: '00000000-0000-0000-in20-000000000003',
      webhookId: ANALYTICS_WEBHOOK,
      eventType: WebhookEventType.SESSION_STARTED,
      eventId: '00000000-0000-0000-ev00-000000000003',
      payloadJson: {
        event: 'SESSION_STARTED',
        timestamp: new Date().toISOString(),
        tenantId: DEV_TENANT_ID,
        data: {
          sessionId: '00000000-0000-0000-6000-000000000010',
          learnerId: '00000000-0000-0000-2000-000000000002',
        },
      },
      status: WebhookDeliveryStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 5,
      scheduledAt: new Date(),
    },
  ];

  for (const delivery of deliveries) {
    await prisma.webhookDelivery.upsert({
      where: { id: delivery.id },
      update: {},
      create: delivery,
    });
  }
  console.log(`  ✅ Created ${deliveries.length} webhook deliveries`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Webhook Delivery Attempts
  // ══════════════════════════════════════════════════════════════════════════

  const attempts = [
    {
      id: '00000000-0000-0000-in30-000000000001',
      deliveryId: '00000000-0000-0000-in20-000000000001',
      endpointId: ANALYTICS_WEBHOOK,
      attemptNumber: 1,
      eventType: WebhookEventType.SESSION_COMPLETED,
      eventId: '00000000-0000-0000-ev00-000000000001',
      status: 'SUCCESS',
      retryCount: 0,
      requestedAt: new Date(Date.now() - 30 * 60 * 1000),
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Aivo-Signature': 'sha256=***',
        'X-Aivo-Event': 'SESSION_COMPLETED',
        'X-Aivo-Delivery-Id': '00000000-0000-0000-in20-000000000001',
      },
      responseStatus: 200,
      responseBody: '{"status":"ok","processed":true}',
      responseTimeMs: 145,
      deliveredAt: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      id: '00000000-0000-0000-in30-000000000002',
      deliveryId: '00000000-0000-0000-in20-000000000002',
      endpointId: CANVAS_WEBHOOK,
      attemptNumber: 1,
      eventType: WebhookEventType.SKILL_MASTERY_UPDATED,
      eventId: '00000000-0000-0000-ev00-000000000002',
      status: 'SUCCESS',
      retryCount: 0,
      requestedAt: new Date(Date.now() - 60 * 60 * 1000),
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Aivo-Signature': 'sha256=***',
        'X-Aivo-Event': 'SKILL_MASTERY_UPDATED',
        'X-Aivo-Delivery-Id': '00000000-0000-0000-in20-000000000002',
      },
      responseStatus: 200,
      responseBody: '{"received":true,"lti_outcome_updated":true}',
      responseTimeMs: 220,
      deliveredAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  ];

  for (const attempt of attempts) {
    await prisma.webhookDeliveryAttempt.upsert({
      where: { id: attempt.id },
      update: {},
      create: attempt,
    });
  }
  console.log(`  ✅ Created ${attempts.length} delivery attempts`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create API Keys
  // ══════════════════════════════════════════════════════════════════════════

  const apiKeys = [
    {
      id: DEV_API_KEY,
      tenantId: DEV_TENANT_ID,
      name: 'Development API Key',
      description: 'For local development and testing',
      keyPrefix: 'aivo_pk_dev_',
      keyHash: 'sha256:dev_key_hash_placeholder_do_not_use_in_production',
      scopes: [ApiScope.READ_LEARNER_PROGRESS, ApiScope.READ_SESSION_DATA, ApiScope.READ_ANALYTICS],
      rateLimitPerMinute: 120,
      rateLimitPerHour: 2000,
      rateLimitPerDay: 20000,
      status: ApiKeyStatus.ACTIVE,
      lastUsedAt: new Date(Date.now() - 5 * 60 * 1000),
      usageCount: 1547,
      createdBy: ADMIN_USER_ID,
      allowedIps: ['127.0.0.1', '::1', '192.168.1.0/24'],
    },
    {
      id: PARTNER_API_KEY,
      tenantId: DEV_TENANT_ID,
      name: 'District Analytics Partner',
      description: 'Read-only access for district analytics dashboard',
      keyPrefix: 'aivo_pk_ana_',
      keyHash: 'sha256:partner_key_hash_placeholder',
      clientId: 'district-analytics-client',
      clientSecretHash: '$2b$12$placeholder_bcrypt_hash',
      scopes: [ApiScope.READ_LEARNER_PROGRESS, ApiScope.READ_ANALYTICS, ApiScope.MANAGE_WEBHOOKS],
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000,
      status: ApiKeyStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      usageCount: 8432,
      createdBy: ADMIN_USER_ID,
      allowedIps: ['10.0.0.0/8'], // District internal network
    },
    // Revoked key example
    {
      id: '00000000-0000-0000-in10-000000000003',
      tenantId: DEV_TENANT_ID,
      name: 'Old Integration Key',
      description: 'Deprecated key - revoked during security audit',
      keyPrefix: 'aivo_pk_old_',
      keyHash: 'sha256:old_key_hash_revoked',
      scopes: [ApiScope.READ_LEARNER_PROGRESS],
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000,
      status: ApiKeyStatus.REVOKED,
      usageCount: 234,
      createdBy: ADMIN_USER_ID,
      revokedAt: new Date('2024-01-01'),
      revokedBy: ADMIN_USER_ID,
      revokeReason: 'Security audit - replacing with scoped keys',
      revocationReason: 'Security audit - replacing with scoped keys',
      allowedIps: [],
    },
  ];

  for (const apiKey of apiKeys) {
    await prisma.apiKey.upsert({
      where: { id: apiKey.id },
      update: {},
      create: apiKey,
    });
  }
  console.log(`  ✅ Created ${apiKeys.length} API keys`);

  console.log('');
  console.log('✅ integration-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 2 webhook endpoints (Canvas LMS, District Analytics)');
  console.log('  - 3 webhook deliveries (2 success, 1 pending)');
  console.log('  - 2 delivery attempts with response details');
  console.log('  - 3 API keys (dev, partner, revoked example)');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - Webhook event filtering and delivery');
  console.log('  - OAuth2 client credentials flow');
  console.log('  - Scoped API key management');
  console.log('  - Rate limiting and IP restrictions');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
