import { redirect } from 'next/navigation';

import { getAuthSession } from '../../lib/auth';

export default async function LegalHoldsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  // Check for platform admin role
  if (!session.roles?.includes('PLATFORM_ADMIN')) {
    redirect('/dashboard?error=forbidden');
  }

  return <>{children}</>;
}
