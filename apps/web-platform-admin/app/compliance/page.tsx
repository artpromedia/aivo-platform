import { redirect } from 'next/navigation';

import { requirePlatformAdmin } from '../../lib/auth';
import { ComplianceDashboardClient } from './compliance-dashboard-client';

export default async function CompliancePage() {
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    redirect('/dashboard?error=forbidden');
  }

  return <ComplianceDashboardClient accessToken={auth.accessToken} />;
}
