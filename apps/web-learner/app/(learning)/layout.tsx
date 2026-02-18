import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAuthSession } from '../../lib/auth';
import { LearnerSidebar } from '../../components/learner-sidebar';
import { LearnerTopbar } from '../../components/learner-topbar';

export default async function LearningLayout({ children }: { readonly children: ReactNode }) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — desktop only, hidden on mobile */}
      <LearnerSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with search, streak, XP, notifications, profile */}
        <LearnerTopbar
          userName={session.name ?? undefined}
          streakDays={5}
          totalXp={1250}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
