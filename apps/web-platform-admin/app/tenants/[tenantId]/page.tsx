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

import { TenantDetailClient } from './tenant-detail-client';

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { tenantId } = await params;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null; // Layout handles forbidden
  }

  try {
    const [tenant, featureFlags, entitlements, aiActivity, effectivePolicy, tenantPolicyOverride] =
      await Promise.all([
        getTenant(auth.accessToken, tenantId),
        getTenantFeatureFlags(auth.accessToken, tenantId),
        getTenantEntitlements(auth.accessToken, tenantId),
        getTenantAiActivity(auth.accessToken, tenantId).catch(() => null),
        getTenantEffectivePolicy(auth.accessToken, tenantId).catch(() => null),
        getTenantPolicy(auth.accessToken, tenantId).catch(() => null),
      ]);

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
  } catch {
    notFound();
  }
}
