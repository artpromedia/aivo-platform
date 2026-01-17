import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { FocusToolsContainer } from './components/FocusToolsContainer';

export const metadata = {
  title: 'Focus Tools | AIVO Learner',
  description: 'Stay focused and productive with timers, breaks, and distraction tracking',
};

/**
 * Focus Tools Page
 *
 * Main page for focus tools including:
 * - Focus timer (Pomodoro, Custom, Deep Work modes)
 * - Break activities
 * - Distraction blocker
 * - Progress tracking
 */
export default async function FocusPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Focus Tools</h1>
        <p className="mt-1 text-slate-600">
          Stay focused and productive with customizable timers and break activities
        </p>
      </div>

      {/* Focus Tools Container */}
      <FocusToolsContainer learnerId={session.userId} />
    </div>
  );
}
