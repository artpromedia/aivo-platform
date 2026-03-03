/**
 * Integrations Hub Page
 *
 * Landing page for all district integrations — SIS, API Keys, Webhooks, and
 * future integrations like Ed-Fi and LTI.
 */

import { Role } from '@aivo/ts-rbac';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

export const metadata = {
  title: 'Integrations | Aivo District Admin',
  description: 'Manage third-party integrations for your district',
};

interface IntegrationCard {
  href: string;
  icon: string;
  title: string;
  description: string;
  status: 'available' | 'coming-soon';
}

const integrations: IntegrationCard[] = [
  {
    href: '/integrations/sis',
    icon: '🔄',
    title: 'SIS Integration',
    description: 'Sync students, teachers, and enrollments from your Student Information System.',
    status: 'available',
  },
  {
    href: '/integrations/api-keys',
    icon: '🔑',
    title: 'API Keys',
    description: 'Create and manage API keys for programmatic access to Aivo data.',
    status: 'available',
  },
  {
    href: '/integrations/webhooks',
    icon: '🪝',
    title: 'Webhooks',
    description: 'Configure webhook endpoints to receive real-time event notifications.',
    status: 'available',
  },
  {
    href: '#',
    icon: '📚',
    title: 'Ed-Fi Integration',
    description: 'Connect to the Ed-Fi ODS for standardised education data exchange.',
    status: 'coming-soon',
  },
  {
    href: '#',
    icon: '🧩',
    title: 'LTI Integration',
    description: 'Enable Learning Tools Interoperability for external learning tools.',
    status: 'coming-soon',
  },
  {
    href: '/integrations/google-classroom',
    icon: '📊',
    title: 'Google Classroom',
    description: 'Sync classes and assignments with Google Classroom.',
    status: 'available',
  },
];

export default async function IntegrationsPage() {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }

  if (!auth.roles.includes(Role.DISTRICT_ADMIN) && !auth.roles.includes(Role.PLATFORM_ADMIN)) {
    redirect('/dashboard');
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500">
            Connect your district&apos;s tools and data sources with Aivo
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const isAvailable = integration.status === 'available';

          const content = (
            <>
              {/* Coming soon badge */}
              {!isAvailable && (
                <span className="absolute right-4 top-4 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Coming Soon
                </span>
              )}

              <div className="mb-3 text-3xl">{integration.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900">{integration.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{integration.description}</p>

              {isAvailable && (
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600">
                  Configure
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </>
          );

          if (isAvailable) {
            return (
              <Link
                key={integration.title}
                href={integration.href}
                className="relative rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-indigo-300 hover:shadow-md cursor-pointer"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={integration.title}
              className="relative rounded-xl border border-dashed border-gray-300 bg-white p-6 opacity-70 cursor-default"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
