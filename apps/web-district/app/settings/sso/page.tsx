import { getAuthSession } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { SsoConfigPage } from './SsoConfigPage';

export const metadata = {
  title: 'SSO Configuration | Aivo District Admin',
  description: 'Configure Single Sign-On for your district',
};

export default async function SsoSettingsPage() {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }

  // Check for district admin role
  if (!auth.roles.includes('DISTRICT_ADMIN') && !auth.roles.includes('PLATFORM_ADMIN')) {
    redirect('/dashboard');
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to settings"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SSO Configuration</h1>
          <p className="text-sm text-gray-500">
            Configure Single Sign-On authentication for your district
          </p>
        </div>
      </div>

      <SsoConfigPage tenantId={auth.tenantId} />
    </section>
  );
}
