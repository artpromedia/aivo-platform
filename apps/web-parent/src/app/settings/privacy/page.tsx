import { redirect } from 'next/navigation';

import { getServerSession } from '@aivo/auth-web';

import ImpersonationHistoryPage from './ImpersonationHistoryPage';

export const metadata = {
  title: 'Privacy & Access History | Aivo Parent',
  description: 'View when support staff have accessed your account',
};

export default async function PrivacySettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  return <ImpersonationHistoryPage />;
}
