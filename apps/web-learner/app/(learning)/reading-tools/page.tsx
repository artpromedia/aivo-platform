import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { ReadingToolsContainer } from './components/ReadingToolsContainer';

export const metadata = {
  title: 'Reading Tools | AIVO Learner',
  description:
    'Advanced reading support with text-to-speech, word prediction, and comprehension aids',
};

/**
 * Reading Tools Page
 *
 * Provides advanced reading support including:
 * - Text-to-speech with customizable voices
 * - Word prediction for assisted writing
 * - Reading comprehension strategies and questions
 * - Vocabulary building and flashcards
 */
export default async function ReadingToolsPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reading Tools</h1>
        <p className="mt-1 text-slate-600">
          Advanced tools to support reading, writing, and vocabulary development
        </p>
      </div>

      {/* Reading Tools Container */}
      <ReadingToolsContainer learnerId={session.userId} />
    </div>
  );
}
