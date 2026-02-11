import { notFound } from 'next/navigation';

import { getTenantFeatureFlags } from '../../../../lib/api';
import { requirePlatformAdmin } from '../../../../lib/auth';

import { TenantSettingClient } from './tenant-setting-client';

interface PageProps {
  params: Promise<{ tenantId: string; settingId: string }>;
}

export default async function TenantSettingPage({ params }: PageProps) {
  const { tenantId, settingId } = await params;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null;
  }

  try {
    const flags = await getTenantFeatureFlags(auth.accessToken, tenantId);
    const flag = flags.find((f) => f.flagKey === settingId || f.id === settingId);
    if (!flag) {
      notFound();
    }
    return <TenantSettingClient tenantId={tenantId} flag={flag} />;
  } catch {
    notFound();
  }
}
