'use client';

/**
 * RegulationContainer Component
 * Page container for the self-regulation feature
 */

import { useState, useCallback, useEffect } from 'react';
import { SelfRegulationHub } from '@/components/self-regulation';
import type { GradeBand, ActivityType } from '@/lib/self-regulation/regulation-types';

// ============================================================================
// Types
// ============================================================================

interface RegulationContainerProps {
  learnerId: string;
  initialGradeBand?: GradeBand;
}

// ============================================================================
// Grade Detection (mock - would come from user profile)
// ============================================================================

function detectGradeBand(gradeLevel?: number): GradeBand {
  if (!gradeLevel) return 'G6_8'; // Default to middle school
  if (gradeLevel <= 5) return 'K5';
  if (gradeLevel <= 8) return 'G6_8';
  return 'G9_12';
}

// ============================================================================
// Component
// ============================================================================

export function RegulationContainer({
  learnerId,
  initialGradeBand,
}: Readonly<RegulationContainerProps>) {
  // State
  const [gradeBand, setGradeBand] = useState<GradeBand>(initialGradeBand || 'G6_8');
  const [showGradeBandSelector, setShowGradeBandSelector] = useState(false);
  const [activityStats, setActivityStats] = useState({
    completedToday: 0,
    totalCompleted: 0,
    streak: 0,
  });

  // Handle activity completion for XP/gamification integration
  const handleActivityComplete = useCallback(
    (activityType: ActivityType, rating?: number) => {
      // Update local stats
      setActivityStats((prev) => ({
        ...prev,
        completedToday: prev.completedToday + 1,
        totalCompleted: prev.totalCompleted + 1,
      }));

      // TODO: Integrate with gamification service for XP
      console.log('Activity completed:', { activityType, rating });
    },
    []
  );

  // Load activity stats (mock)
  useEffect(() => {
    // TODO: Load from gamification service
    setActivityStats({
      completedToday: 0,
      totalCompleted: 0,
      streak: 0,
    });
  }, [learnerId]);

  // Grade band options
  const gradeBandOptions: { value: GradeBand; label: string }[] = [
    { value: 'K5', label: 'Grades K-5' },
    { value: 'G6_8', label: 'Grades 6-8' },
    { value: 'G9_12', label: 'Grades 9-12' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Self-Regulation</h1>
          <p className="mt-1 text-slate-600">
            Tools to help you understand and manage your emotions
          </p>
        </div>

        {/* Settings/Grade band selector */}
        <div className="relative">
          <button
            onClick={() => setShowGradeBandSelector(!showGradeBandSelector)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            title="Settings"
          >
            ⚙️
          </button>

          {showGradeBandSelector && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
              <p className="px-4 py-1 text-xs text-slate-500 font-medium">
                Age Group
              </p>
              {gradeBandOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setGradeBand(option.value);
                    setShowGradeBandSelector(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                    gradeBand === option.value
                      ? 'text-indigo-600 font-medium'
                      : 'text-slate-700'
                  }`}
                >
                  {option.label}
                  {gradeBand === option.value && ' ✓'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats banner (optional - for gamification integration) */}
      {activityStats.totalCompleted > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Your progress</p>
              <p className="text-lg font-semibold">
                {activityStats.totalCompleted} activities completed
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{activityStats.completedToday}</p>
                <p className="text-xs text-white/80">Today</p>
              </div>
              {activityStats.streak > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold">🔥 {activityStats.streak}</p>
                  <p className="text-xs text-white/80">Day streak</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <SelfRegulationHub
          learnerId={learnerId}
          gradeBand={gradeBand}
          onActivityComplete={handleActivityComplete}
        />
      </div>

      {/* Tips section */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {gradeBand === 'K5' ? 'Did you know?' : 'Self-Regulation Tips'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TipCard
            emoji="🧠"
            title={gradeBand === 'K5' ? 'Your brain is amazing!' : 'Brain Science'}
            description={
              gradeBand === 'K5'
                ? 'When you take deep breaths, you help your brain calm down!'
                : 'Deep breathing activates your parasympathetic nervous system, reducing stress hormones.'
            }
          />
          <TipCard
            emoji="💪"
            title={gradeBand === 'K5' ? 'Practice makes better!' : 'Building Skills'}
            description={
              gradeBand === 'K5'
                ? 'The more you practice calming down, the easier it gets!'
                : 'Self-regulation is a skill that improves with consistent practice.'
            }
          />
          <TipCard
            emoji="🤝"
            title={gradeBand === 'K5' ? "It's okay to ask for help!" : 'Seeking Support'}
            description={
              gradeBand === 'K5'
                ? 'Grown-ups want to help you when you feel big emotions.'
                : 'Reaching out when you need support is a sign of strength, not weakness.'
            }
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function TipCard({
  emoji,
  title,
  description,
}: Readonly<{
  emoji: string;
  title: string;
  description: string;
}>) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <span className="text-2xl block mb-2">{emoji}</span>
      <h3 className="font-medium text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

export default RegulationContainer;
