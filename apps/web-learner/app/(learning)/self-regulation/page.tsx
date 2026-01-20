import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { RegulationContainer } from './components/RegulationContainer';

export const metadata = {
  title: 'Self-Regulation | AIVO Learner',
  description: 'Tools for emotional regulation including breathing exercises, grounding techniques, and movement breaks',
};

/**
 * Self-Regulation Page
 *
 * Provides self-regulation tools including:
 * - Emotion check-ins
 * - Calming space with various activities
 * - Breathing exercises (multiple patterns)
 * - 5-4-3-2-1 grounding technique
 * - Movement breaks
 * - Mood tracking and history
 */
export default async function SelfRegulationPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return <RegulationContainer learnerId={session.userId} />;
}
