import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getAuthSession } from '../../../lib/auth';
import { MathSupportContainer } from './components/MathSupportContainer';

export const metadata: Metadata = {
  title: 'Math Support | AIVO Learner',
  description: 'Interactive math tools and resources for neurodiverse learners',
};

export default async function MathSupportPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Math Support</h1>
        <p className="text-slate-600">
          Interactive tools to help you learn and practice math concepts
        </p>
      </div>

      <MathSupportContainer learnerId={session.userId} />
    </div>
  );
}
