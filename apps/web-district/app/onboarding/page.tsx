import { Role } from '@aivo/ts-rbac';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

import { OnboardingWizard } from './OnboardingWizard';

export const metadata = {
  title: 'District Onboarding | Aivo',
  description: 'Set up your district on the AIVO platform',
};

export default async function OnboardingPage() {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }

  if (!auth.roles.includes(Role.DISTRICT_ADMIN) && !auth.roles.includes(Role.PLATFORM_ADMIN)) {
    redirect('/dashboard');
  }

  return <OnboardingWizard tenantId={auth.tenantId} />;
}
