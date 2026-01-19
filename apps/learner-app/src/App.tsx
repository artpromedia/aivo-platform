'use client';

import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { PageLoader } from '@/components/PageLoader';

// Critical path - loaded immediately for login flow
const Login = lazy(() => import('@/pages/Login'));

// Lazy load all other pages for optimal performance
const Home = lazy(() => import('@/pages/Home'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));

// Route groups - lazy loaded as modules
const AssessmentRoutes = lazy(() => import('@/routes/AssessmentRoutes'));
const SubjectRoutes = lazy(() => import('@/pages/subjects'));
const ActivityRoutes = lazy(() => import('@/routes/ActivityRoutes'));

// Error boundary for route loading failures
function RouteErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-600 mb-4">
        We couldn't load this page. Please try again.
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Reload Page
      </button>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes - no auth required */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Assessment module */}
          <Route path="/assessment/*" element={<AssessmentRoutes />} />
          
          {/* Subject module with all grade levels */}
          <Route path="/subjects/*" element={<SubjectRoutes />} />
          
          {/* Activity module */}
          <Route path="/activities/*" element={<ActivityRoutes />} />
          
          {/* User settings */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Fallback for unknown routes */}
          <Route path="*" element={<RouteErrorFallback />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
