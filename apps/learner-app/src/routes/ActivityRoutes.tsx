'use client';

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageLoader } from '@/components/PageLoader';

// Lazy load activity pages
const GamePicker = lazy(() => import('@/pages/GamePicker'));
const Practice = lazy(() => import('@/pages/Practice'));
const Quiz = lazy(() => import('@/pages/Quiz'));

export function ActivityRoutes() {
  return (
    <Suspense fallback={<PageLoader message="Loading activity..." />}>
      <Routes>
        <Route path="games" element={<GamePicker />} />
        <Route path="practice/:subjectId" element={<Practice />} />
        <Route path="quiz/:quizId" element={<Quiz />} />
      </Routes>
    </Suspense>
  );
}

export default ActivityRoutes;
