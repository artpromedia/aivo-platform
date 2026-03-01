import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { requirePlatformStaff } from '../../../lib/auth';
import { PolicyAuditDashboard } from './policy-audit-dashboard';

export const metadata: Metadata = {
  title: 'Policy Audit Log | Aivo Platform Admin',
  description: 'View audit trail of policy document changes across all tenants',
};

export default async function PolicyAuditPage() {
  const auth = await requirePlatformStaff();
  if (auth === 'forbidden') {
    redirect('/dashboard?error=forbidden');
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PolicyAuditDashboard accessToken={auth.accessToken} />
      </div>
    </main>
  );
}
