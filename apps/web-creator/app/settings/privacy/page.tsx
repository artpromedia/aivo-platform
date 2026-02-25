import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import ImpersonationHistoryPage from './ImpersonationHistoryPage';

export const metadata = {
  title: 'Privacy & Access History | Aivo Creator',
  description: 'View when support staff have accessed your account',
};

export default async function PrivacySettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('aivo_access_token')?.value;
  if (!token) {
    redirect('/login');
  }

  return <ImpersonationHistoryPage />;
}
