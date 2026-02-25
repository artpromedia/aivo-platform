import { redirect } from 'next/navigation';

import { getAuthSession } from '@/lib/auth';

import ImpersonationHistoryPage from './ImpersonationHistoryPage';

export const metadata = {
  title: 'Privacy & Access History | Aivo Teacher',
  description: 'View when support staff have accessed your account',
};

export default async function PrivacySettingsPage() {
  const auth = await getAuthSession();
  if (!auth) {
    redirect('/login');
  }

  return <ImpersonationHistoryPage />;
}
