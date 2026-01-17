import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getAuthSession } from '../../../lib/auth';
import { WritingToolsContainer } from './components/WritingToolsContainer';

export const metadata: Metadata = {
  title: 'Writing Tools | AIVO Learner',
  description: 'Interactive writing assistance tools for neurodiverse learners',
};

export default async function WritingToolsPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Writing Tools</h1>
        <p className="text-slate-600">
          Organize your ideas and improve your writing with interactive tools
        </p>
      </div>

      <WritingToolsContainer learnerId={session.userId} />
    </div>
  );
}
