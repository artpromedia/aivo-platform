import { redirect } from 'next/navigation';

import { getAuthSession } from '../../../lib/auth';

import { SocialStoriesContainer } from './components/SocialStoriesContainer';

export const metadata = {
  title: 'Social Stories | AIVO Learner',
  description: 'Interactive social stories to help understand social situations and build social skills',
};

/**
 * Social Stories Page
 *
 * Dedicated page for social stories with:
 * - Category filtering
 * - Reading level filtering
 * - Full-screen story viewer
 * - Story recommendations
 * - Progress tracking
 * - Favorites
 */
export default async function SocialStoriesPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Social Stories</h1>
        <p className="mt-1 text-slate-600">
          Learn about social situations through interactive stories
        </p>
      </div>

      {/* Social Stories Container */}
      <SocialStoriesContainer learnerId={session.userId} />
    </div>
  );
}
