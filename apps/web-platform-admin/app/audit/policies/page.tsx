import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';
import { PolicyAuditDashboard } from './policy-audit-dashboard';

export const metadata: Metadata = {
  title: 'Policy Audit Log | Aivo Platform Admin',
  description: 'View audit trail of policy document changes across all tenants',
};

export default async function PolicyAuditPage() {
  const session = await getAuthSession();
  
  if (!session) {
    redirect('/login');
  }

  // Platform Admin pages are accessible to all authenticated platform users
  // Additional role checks can be added here if needed

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PolicyAuditDashboard accessToken={session.accessToken} />
      </div>
    </main>
  );
}
