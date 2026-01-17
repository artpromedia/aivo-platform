import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { SELContainer } from './components/SELContainer';

export const metadata = {
  title: 'Social-Emotional Learning | AIVO Learner',
  description: 'Build social-emotional skills with mood tracking, coping strategies, and more',
};

/**
 * Social-Emotional Learning Page
 *
 * Provides SEL tools including:
 * - Mood check-ins
 * - Emotion regulation strategies
 * - Social stories
 * - Self-advocacy skills
 */
export default async function SELPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Social-Emotional Learning</h1>
        <p className="mt-1 text-slate-600">Build skills for understanding and managing emotions</p>
      </div>

      {/* SEL Container */}
      <SELContainer learnerId={session.userId} />
    </div>
  );
}
