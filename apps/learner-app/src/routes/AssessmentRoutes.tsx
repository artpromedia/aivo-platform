'use client';

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageLoader } from '@/components/PageLoader';

// Lazy load assessment pages
const BaselineAssessment = lazy(() => import('@/pages/BaselineAssessment'));

export function AssessmentRoutes() {
  return (
    <Suspense fallback={<PageLoader message="Loading assessment..." />}>
      <Routes>
        <Route path="baseline" element={<BaselineAssessment />} />
        <Route path="practice" element={<BaselineAssessment />} />
        <Route path="results/:sessionId" element={<BaselineAssessment />} />
      </Routes>
    </Suspense>
  );
}

export default AssessmentRoutes;
