import { notFound } from 'next/navigation';

import {
  getTenant,
  getTenantAiActivity,
  getTenantEffectivePolicy,
  getTenantEntitlements,
  getTenantFeatureFlags,
  getTenantPolicy,
} from '../../../lib/api';
import { requirePlatformAdmin } from '../../../lib/auth';
import type {
  EffectivePolicy,
  Entitlement,
  FeatureFlag,
  PolicyDocument,
  Tenant,
  TenantAiActivitySummary,
} from '../../../lib/types';

import { TenantDetailClient } from './tenant-detail-client';

// Mock data for development
const MOCK_TENANT: Tenant = {
  id: 'tenant-1',
  name: 'North Valley District',
  type: 'DISTRICT',
  status: 'ACTIVE',
  primaryDomain: 'northvalley.aivolearning.com',
  settings: {
    maxLearners: 10000,
    maxEducators: 500,
    aiEnabled: true,
  },
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
};

const MOCK_FLAGS: FeatureFlag[] = [
  {
    id: 'flag-1',
    tenantId: 'tenant-1',
    flagKey: 'ai_homework_helper',
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: '2024-05-01T00:00:00Z',
  },
  {
    id: 'flag-2',
    tenantId: 'tenant-1',
    flagKey: 'ai_lesson_planning',
    enabled: true,
    rolloutPercentage: 50,
    updatedAt: '2024-05-15T00:00:00Z',
  },
  {
    id: 'flag-3',
    tenantId: 'tenant-1',
    flagKey: 'ai_assessment_builder',
    enabled: false,
    rolloutPercentage: 0,
    updatedAt: '2024-04-01T00:00:00Z',
  },
];

const MOCK_ENTITLEMENTS: Entitlement[] = [
  {
    id: 'ent-1',
    tenantId: 'tenant-1',
    feature: 'AI_CALLS_MONTHLY',
    limit: 100000,
    used: 45230,
    expiresAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'ent-2',
    tenantId: 'tenant-1',
    feature: 'LEARNER_SEATS',
    limit: 10000,
    used: 4800,
    expiresAt: null,
  },
];

const MOCK_AI_ACTIVITY: TenantAiActivitySummary = {
  totalCalls: 45230,
  totalIncidents: 12,
  openIncidents: 2,
  avgLatencyMs: 850,
  totalCostCents: 15420,
  callsByDay: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0] ?? '',
    count: Math.floor(Math.random() * 2000) + 500,
  })),
};

const MOCK_EFFECTIVE_POLICY: EffectivePolicy = {
  safety: {
    severity_thresholds: {
      low_max_per_session: 5,
      medium_escalates_immediately: false,
      high_blocks_response: true,
    },
    blocked_categories: [],
    require_human_review_above: 'MEDIUM',
  },
  ai: {
    allowed_providers: ['openai', 'anthropic'],
    allowed_models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'],
    max_tokens_per_request: 4096,
    max_requests_per_minute: 100,
    latency_budget_ms: 30000,
    cost_limit_cents_per_day: 50000,
  },
  retention: {
    ai_call_logs_days: 90,
    session_events_days: 365,
    homework_uploads_days: 730,
    consent_logs_days: 2555,
    ai_incidents_days: 365,
    dsr_exports_days: 90,
    prefer_soft_delete: false,
  },
  computedAt: new Date(),
};

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { tenantId } = await params;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null; // Layout handles forbidden
  }

  let tenant: Tenant;
  let featureFlags: FeatureFlag[];
  let entitlements: Entitlement[];
  let aiActivity: TenantAiActivitySummary | null;
  let effectivePolicy: EffectivePolicy | null;
  let tenantPolicyOverride: PolicyDocument | null;

  try {
    [tenant, featureFlags, entitlements, aiActivity, effectivePolicy, tenantPolicyOverride] =
      await Promise.all([
        getTenant(auth.accessToken, tenantId),
        getTenantFeatureFlags(auth.accessToken, tenantId),
        getTenantEntitlements(auth.accessToken, tenantId),
        getTenantAiActivity(auth.accessToken, tenantId).catch(() => null),
        getTenantEffectivePolicy(auth.accessToken, tenantId).catch(() => null),
        getTenantPolicy(auth.accessToken, tenantId).catch(() => null),
      ]);
  } catch {
    // Use mock data in development
    if (tenantId === 'tenant-1' || tenantId === 'tenant-2' || tenantId === 'tenant-3') {
      tenant = { ...MOCK_TENANT, id: tenantId };
      featureFlags = MOCK_FLAGS.map((f) => ({ ...f, tenantId }));
      entitlements = MOCK_ENTITLEMENTS.map((e) => ({ ...e, tenantId }));
      aiActivity = MOCK_AI_ACTIVITY;
      effectivePolicy = MOCK_EFFECTIVE_POLICY;
      tenantPolicyOverride = null;
    } else {
      notFound();
    }
  }

  return (
    <TenantDetailClient
      tenant={tenant}
      featureFlags={featureFlags}
      entitlements={entitlements}
      aiActivity={aiActivity}
      effectivePolicy={effectivePolicy}
      tenantPolicyOverride={tenantPolicyOverride}
    />
  );
}
