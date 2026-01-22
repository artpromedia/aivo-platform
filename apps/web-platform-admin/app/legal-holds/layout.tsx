import { Role } from '@aivo/ts-rbac';
import { redirect } from 'next/navigation';
import React from 'react';

import { getAuthSession } from '../../lib/auth';

export default async function LegalHoldsLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  // Check for platform admin role
  if (!session.roles.includes(Role.PLATFORM_ADMIN)) {
    redirect('/dashboard?error=forbidden');
  }

  return <>{children}</>;
}
