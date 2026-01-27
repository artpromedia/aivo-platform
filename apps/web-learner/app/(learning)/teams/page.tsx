'use client';

import { Suspense } from 'react';
import { TeamsContainer } from './components/TeamsContainer';

export default function TeamsPage() {
  // In a real app, this would come from auth context
  const learnerId = 'learner-1';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <span className="mr-3">⚔️</span>
                Teams
              </h1>
              <p className="text-slate-600 mt-1">
                Join or create a team to collaborate and compete together
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600">Loading teams...</span>
            </div>
          }
        >
          <TeamsContainer learnerId={learnerId} />
        </Suspense>
      </div>
    </div>
  );
}
