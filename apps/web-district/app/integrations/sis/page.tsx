import { getAuthSession } from '../../../lib/auth';
import { redirect } from 'next/navigation';

import { SisIntegrationPage } from './SisIntegrationPage';

export const metadata = {
  title: 'SIS Integration | Aivo District Admin',
  description: 'Configure Student Information System integration for your district',
};

export default async function SisSettingsPage() {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }

  // Check for district admin role
  if (!auth.roles.includes('DISTRICT_ADMIN') && !auth.roles.includes('PLATFORM_ADMIN')) {
    redirect('/dashboard');
  }

  return <SisIntegrationPage tenantId={auth.tenantId} />;
}
