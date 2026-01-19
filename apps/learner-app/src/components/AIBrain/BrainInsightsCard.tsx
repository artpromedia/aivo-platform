'use client';

import { useEffect, useState } from 'react';
import type { BrainInsightsCardProps } from './types';
import { useBrainAPI, type BrainInsights } from '@/hooks/useBrainAPI';
import { getSubjectConfig } from './types';
import { LearningStreak } from './LearningStreak';

/**
 * Card displaying comprehensive brain insights
 */
export function BrainInsightsCard({
  learnerId,
  compact = false,
  className = '',
}: BrainInsightsCardProps) {
  const { getInsights, loading } = useBrainAPI();
  const [insights, setInsights] = useState<BrainInsights | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      const data = await getInsights(learnerId);
      setInsights(data);
    };
    fetchInsights();
  }, [learnerId, getInsights]);

  if (loading) {
    return (
      <div className={`animate-pulse rounded-xl bg-gray-100 p-6 ${className}`}>
        <div className="h-6 w-32 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/2 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className={`rounded-xl border-2 border-dashed border-gray-300 p-6 text-center ${className}`}>
        <span className="text-4xl mb-2 block">🧠</span>
        <p className="text-gray-500">No brain data yet</p>
        <p className="text-sm text-gray-400">Complete activities to build your brain!</p>
      </div>
    );
  }

  // Learning style emoji
  const learningStyleEmoji: Record<string, string> = {
    visual: '👁️',
    auditory: '👂',
    kinesthetic: '🤲',
    reading: '📖',
  };

  if (compact) {
    return (
      <div className={`rounded-xl bg-white border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Your Brain</h3>
          <span className="text-2xl">🧠</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(insights.overall_mastery * 100)}%
            </p>
            <p className="text-xs text-gray-500">Mastery</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {insights.current_streak}🔥
            </p>
            <p className="text-xs text-gray-500">Streak</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-teal-600">
              {insights.subjects_at_target}/{insights.total_subjects}
            </p>
            <p className="text-xs text-gray-500">Mastered</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-white shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-teal-500 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <span className="text-4xl">🧠</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Your AI Brain</h2>
            <p className="text-white/80">Personalized learning insights</p>
          </div>
        </div>
      </div>

      {/* Main stats */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-purple-50 p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {Math.round(insights.overall_mastery * 100)}%
            </p>
            <p className="text-sm text-gray-600">Overall Mastery</p>
          </div>
          <div className="rounded-xl bg-teal-50 p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">
              {insights.subjects_at_target}
            </p>
            <p className="text-sm text-gray-600">Subjects Mastered</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(insights.total_time_spent_hours)}h
            </p>
            <p className="text-sm text-gray-600">Time Learning</p>
          </div>
          <div className="rounded-xl bg-green-50 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {Math.round(insights.engagement_score * 100)}%
            </p>
            <p className="text-sm text-gray-600">Engagement</p>
          </div>
        </div>

        {/* Learning streak */}
        <LearningStreak
          currentStreak={insights.current_streak}
          bestStreak={insights.best_streak_ever}
          className="mb-6"
        />

        {/* Strongest subjects */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>💪</span> Strongest Subjects
          </h3>
          <div className="space-y-2">
            {insights.strongest_subjects.map(({ subject, mastery }) => {
              const config = getSubjectConfig(subject);
              return (
                <div key={subject} className="flex items-center gap-3">
                  <span className="text-xl">{config.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{config.name}</span>
                      <span className="text-green-600">{Math.round(mastery * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                        style={{ width: `${mastery * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Areas to improve */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>🎯</span> Areas to Improve
          </h3>
          <div className="space-y-2">
            {insights.weakest_subjects.map(({ subject, mastery }) => {
              const config = getSubjectConfig(subject);
              return (
                <div key={subject} className="flex items-center gap-3">
                  <span className="text-xl">{config.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{config.name}</span>
                      <span className="text-orange-600">{Math.round(mastery * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
                        style={{ width: `${mastery * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning preferences */}
        <div className="rounded-xl bg-gray-50 p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>⚙️</span> Your Learning Profile
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {learningStyleEmoji[insights.preferred_learning_style] || '📚'}
              </span>
              <div>
                <p className="text-gray-500">Learning Style</p>
                <p className="font-medium capitalize">{insights.preferred_learning_style}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              <div>
                <p className="text-gray-500">Best Session Length</p>
                <p className="font-medium">{insights.optimal_session_length} min</p>
              </div>
            </div>
            {insights.best_time_of_day && (
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {insights.best_time_of_day === 'morning' ? '🌅' :
                   insights.best_time_of_day === 'afternoon' ? '☀️' :
                   insights.best_time_of_day === 'evening' ? '🌆' : '🌙'}
                </span>
                <div>
                  <p className="text-gray-500">Best Time</p>
                  <p className="font-medium capitalize">{insights.best_time_of_day}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <div>
                <p className="text-gray-500">Learning Velocity</p>
                <p className="font-medium">
                  {insights.learning_velocity > 0 ? '+' : ''}{(insights.learning_velocity * 100).toFixed(1)}%/hr
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
