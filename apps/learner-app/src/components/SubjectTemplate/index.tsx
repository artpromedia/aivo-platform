'use client';

import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SubjectTemplateProps {
  subject: string;
  gradeLevel: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * SubjectTemplate - Reusable layout component for all subject pages
 *
 * Provides consistent header, navigation, focus monitoring, and progress dashboard
 * across all subject pages (K5, MS, HS).
 */
export function SubjectTemplate({
  subject,
  gradeLevel,
  icon,
  children,
  className = '',
}: SubjectTemplateProps) {
  const navigate = useNavigate();
  const [isFocusMode, setIsFocusMode] = useState(false);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back button and subject info */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="text-4xl">{icon}</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{subject}</h1>
                  <p className="text-gray-600 text-sm">{gradeLevel}</p>
                </div>
              </div>
            </div>

            {/* Right: Focus Monitor */}
            <FocusMonitor
              isActive={isFocusMode}
              onToggle={() => setIsFocusMode(!isFocusMode)}
            />
          </div>
        </div>
      </header>

      {/* Progress Dashboard */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <ProgressDashboard subject={subject} />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div
          className="transition-opacity duration-500"
          style={{ opacity: 1 }}
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-6 text-center">
        <p className="text-sm text-gray-500">
          Keep up the great work! Learning a little every day adds up.
        </p>
      </footer>
    </div>
  );
}

/**
 * FocusMonitor - Tracks and displays focus state during learning
 */
interface FocusMonitorProps {
  isActive: boolean;
  onToggle: () => void;
}

function FocusMonitor({ isActive, onToggle }: FocusMonitorProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        isActive
          ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}
      />
      <span className="text-sm font-medium">
        {isActive ? 'Focus Mode' : 'Start Focus'}
      </span>
      {isActive && (
        <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
          Active
        </span>
      )}
    </button>
  );
}

/**
 * ProgressDashboard - Shows daily goals and streaks
 */
interface ProgressDashboardProps {
  subject: string;
}

function ProgressDashboard({ subject }: ProgressDashboardProps) {
  // Mock data - would come from API in production
  const dailyGoal = {
    current: 2,
    target: 3,
    label: 'lessons today',
  };
  const streak = 5;
  const xp = 150;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
      {/* Daily Goal */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
          <span className="text-xl">🎯</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Daily Goal</p>
          <p className="font-bold text-gray-800">
            {dailyGoal.current}/{dailyGoal.target} {dailyGoal.label}
          </p>
        </div>
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${(dailyGoal.current / dailyGoal.target) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-px h-10 bg-gray-200 hidden sm:block" />

      {/* Streak */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
          <span className="text-xl">🔥</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Streak</p>
          <p className="font-bold text-gray-800">{streak} days</p>
        </div>
      </div>

      <div className="w-px h-10 bg-gray-200 hidden sm:block" />

      {/* XP */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
          <span className="text-xl">⭐</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">XP Today</p>
          <p className="font-bold text-gray-800">{xp} points</p>
        </div>
      </div>

      {/* Subject indicator */}
      <div className="ml-auto hidden md:block">
        <span className="text-sm text-gray-500">
          Learning <span className="font-medium text-gray-700">{subject}</span>
        </span>
      </div>
    </div>
  );
}

export default SubjectTemplate;
