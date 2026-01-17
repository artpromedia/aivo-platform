import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { ExecutiveFunctionContainer } from './components/ExecutiveFunctionContainer';

export const metadata = {
  title: 'Executive Function Tools | AIVO Learner',
  description: 'Manage tasks, plan your studies, and stay organized',
};

/**
 * Executive Function Tools Page
 *
 * Provides tools for executive function including:
 * - Task breakdown and management
 * - Study planner
 * - Time management
 * - Organization tools
 */
export default async function ExecutiveFunctionPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Executive Function Tools</h1>
        <p className="mt-1 text-slate-600">
          Break down tasks, plan your studies, and stay organized
        </p>
      </div>

      {/* Executive Function Container */}
      <ExecutiveFunctionContainer learnerId={session.userId} />
    </div>
  );
}
