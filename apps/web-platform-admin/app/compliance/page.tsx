import { redirect } from 'next/navigation';

import { requirePlatformStaff } from '../../lib/auth';
import { ComplianceDashboardClient } from './compliance-dashboard-client';

export default async function CompliancePage() {
  const auth = await requirePlatformStaff();
  if (auth === 'forbidden') {
    redirect('/dashboard?error=forbidden');
  }

  return <ComplianceDashboardClient accessToken={auth.accessToken} />;
}
