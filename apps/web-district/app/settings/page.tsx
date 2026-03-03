/**
 * District Settings Hub Page
 *
 * Central page linking to all settings sub-pages: SSO, Branding, Privacy.
 */

import { Role } from '@aivo/ts-rbac';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

export const metadata = {
  title: 'Settings | Aivo District Admin',
  description: 'Manage district settings',
};

interface SettingsCard {
  href: string;
  icon: string;
  title: string;
  description: string;
}

const settingsCards: SettingsCard[] = [
  {
    href: '/settings/sso',
    icon: '🔐',
    title: 'SSO Configuration',
    description: 'Configure Single Sign-On authentication for your district.',
  },
  {
    href: '/settings/branding',
    icon: '🎨',
    title: 'Branding & White-Label',
    description: 'Customise your district\'s logo, colours, and custom domain.',
  },
  {
    href: '/settings/privacy',
    icon: '🛡️',
    title: 'Privacy & Access History',
    description: 'View when support staff have accessed your account.',
  },
  {
    href: '/settings/notifications',
    icon: '🔔',
    title: 'Notification Preferences',
    description: 'Configure email digests, alert thresholds, and notification recipients.',
  },
  {
    href: '/settings/data-retention',
    icon: '🗄️',
    title: 'Data Retention',
    description: 'Manage data retention policies for compliance with FERPA and state regulations.',
  },
  {
    href: '/settings/api-keys',
    icon: '🔑',
    title: 'API Key Management',
    description: 'Generate, view, and revoke API keys for programmatic access.',
  },
];

export default async function SettingsPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">District Settings</h1>
          <p className="text-sm text-gray-500">
            Manage authentication, branding, privacy, notifications, data retention, and API settings
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="mb-3 text-3xl">{card.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{card.description}</p>
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
          </Link>
        ))}
      </div>
    </section>
  );
}
