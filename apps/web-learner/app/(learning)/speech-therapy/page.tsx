import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { SpeechTherapyContainer } from './components/SpeechTherapyContainer';

export const metadata = {
  title: 'Speech Therapy | AIVO Learner',
  description: 'Practice speech exercises, articulation, voice recording, and track your progress',
};

/**
 * Speech Therapy Page
 *
 * Main page for speech therapy tools including:
 * - Speech exercises with visual and audio guidance
 * - Articulation practice with phoneme targeting
 * - Voice recordings for self-review
 * - Progress tracking and goals
 */
export default async function SpeechTherapyPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Speech Therapy</h1>
        <p className="mt-1 text-slate-600">
          Practice speech exercises and track your progress with fun activities
        </p>
      </div>

      {/* Speech Therapy Container */}
      <SpeechTherapyContainer learnerId={session.userId} />
    </div>
  );
}
