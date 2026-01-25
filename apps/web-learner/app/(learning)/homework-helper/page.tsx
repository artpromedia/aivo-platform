import { redirect } from 'next/navigation';

import { getAuthSession } from '@/lib/auth';

import { HomeworkHelperContainer } from './components/HomeworkHelperContainer';

export const metadata = {
  title: 'Homework Helper | AIVO Learning',
  description: 'Get step-by-step help with your homework assignments',
};

export default async function HomeworkHelperPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <HomeworkHelperContainer learnerId={session.user.id} />
    </main>
  );
}
