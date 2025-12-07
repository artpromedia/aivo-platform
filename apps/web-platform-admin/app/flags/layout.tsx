import { Role } from '@aivo/ts-rbac';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAuthSession } from '../../lib/auth';

export default async function FlagsLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }
  if (!auth.roles.includes(Role.PLATFORM_ADMIN)) {
    return (
      <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="text-sm">You need PLATFORM_ADMIN to access this area.</p>
      </section>
    );
  }
  return <>{children}</>;
}
