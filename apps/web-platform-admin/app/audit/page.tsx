import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Audit Hub | Aivo Platform Admin',
  description: 'View audit trails, policy changes, and system activity logs',
};

const auditSections = [
  {
    title: 'Policy Audit Log',
    description: 'View audit trail of policy document changes across all tenants',
    href: '/audit/policies',
    icon: '📋',
  },
  {
    title: 'System Events',
    description: 'Authentication events, API access logs, and infrastructure changes',
    href: '/audit/events',
    icon: '🔒',
  },
  {
    title: 'User Activity',
    description: 'Track admin actions, tenant modifications, and permission changes',
    href: '/audit/activity',
    icon: '👤',
  },
  {
    title: 'Data Access Log',
    description: 'Log of sensitive data access and export operations',
    href: '/audit/data-access',
    icon: '🗄️',
  },
];

export default async function AuditHubPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit &amp; Compliance Hub</h1>
        <p className="text-sm text-slate-500">
          Review system activity, policy changes, and access logs across the platform
        </p>
      </div>

      {/* Section cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {auditSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-lg border border-gray-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="mb-3 text-2xl">{section.icon}</div>
            <h2 className="font-semibold text-gray-900 group-hover:text-blue-600">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{section.description}</p>
          </Link>
        ))}
      </div>

      {/* Recent activity summary */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-8 text-center text-slate-500">
          <p>Activity feed will be populated from the audit log API.</p>
          <p className="mt-1 text-sm text-slate-400">
            Visit{' '}
            <Link href="/audit/policies" className="text-blue-600 hover:underline">
              Policy Audit Log
            </Link>{' '}
            to view policy changes.
          </p>
        </div>
      </div>
    </div>
  );
}
