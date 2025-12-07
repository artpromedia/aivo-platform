import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAuthSession } from '../../lib/auth';

export default async function SchoolsLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }
  return <>{children}</>;
}
