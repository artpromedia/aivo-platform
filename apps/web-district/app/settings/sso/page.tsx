import { getAuthSession } from '../../../lib/auth';
import { redirect } from 'next/navigation';

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

  return <SsoConfigPage tenantId={auth.tenantId} />;
}
