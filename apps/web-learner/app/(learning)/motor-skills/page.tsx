import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { MotorSkillsContainer } from './components/MotorSkillsContainer';

export const metadata = {
  title: 'Motor Skills | AIVO Learner',
  description: 'Develop fine and gross motor skills through interactive exercises',
};

/**
 * Motor Skills Page
 *
 * Provides motor skills development tools including:
 * - Handwriting practice
 * - Fine motor activities
 * - Gross motor exercises
 * - Adaptive input settings
 */
export default async function MotorSkillsPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Motor Skills</h1>
        <p className="mt-1 text-slate-600">
          Develop fine and gross motor skills through fun activities
        </p>
      </div>

      {/* Motor Skills Container */}
      <MotorSkillsContainer learnerId={session.userId} />
    </div>
  );
}
