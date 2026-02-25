import { Role } from '@aivo/ts-rbac';
import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { PostSignUpSetup } from './PostSignUpSetup';

export const metadata = {
  title: 'Complete Setup | Aivo',
  description: 'Finish setting up your district on the AIVO platform',
};

export default async function SetupPage() {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }

  if (!auth.roles.includes(Role.DISTRICT_ADMIN) && !auth.roles.includes(Role.PLATFORM_ADMIN)) {
    redirect('/dashboard');
  }

  return (
    <section className="mx-auto max-w-3xl py-4">
      <PostSignUpSetup tenantId={auth.tenantId} accessToken={auth.accessToken} />
    </section>
  );
}
