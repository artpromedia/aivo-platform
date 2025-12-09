import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';
import { ComplianceDashboardClient } from './compliance-dashboard-client';

export default async function CompliancePage() {
  const session = await getAuthSession();
  if (!session) {
    redirect('/login');
  }

  return <ComplianceDashboardClient accessToken={session.accessToken} />;
}
