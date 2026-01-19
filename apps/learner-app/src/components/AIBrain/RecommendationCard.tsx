'use client';

import type { RecommendationCardProps } from './types';
import { getSubjectConfig, RECOMMENDATION_CONFIG } from './types';

/**
 * Card displaying a personalized learning recommendation
 */
export function RecommendationCard({
  type,
  subject,
  reason,
  estimatedTime,
  priority,
  currentMastery,
  suggestedDifficulty,
  onStart,
  className = '',
}: RecommendationCardProps) {
  const subjectConfig = getSubjectConfig(subject);
  const typeConfig = RECOMMENDATION_CONFIG[type] || RECOMMENDATION_CONFIG.practice;

  // Priority indicator
  const getPriorityBadge = () => {
    if (priority >= 0.7) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          High Priority
        </span>
      );
    }
    if (priority >= 0.4) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
          Recommended
        </span>
      );
    }
    return null;
  };

  // Difficulty badge
  const getDifficultyBadge = () => {
    if (!suggestedDifficulty) return null;

    const colors: Record<string, string> = {
      easy: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      challenging: 'bg-orange-100 text-orange-700',
      advanced: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[suggestedDifficulty] || 'bg-gray-100 text-gray-700'}`}>
        {suggestedDifficulty.charAt(0).toUpperCase() + suggestedDifficulty.slice(1)}
      </span>
    );
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md ${className}`}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${subjectConfig.color} text-white`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <span className="text-2xl">{subjectConfig.emoji}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.color} text-white`}>
              {typeConfig.emoji} {typeConfig.label}
            </span>
            {getPriorityBadge()}
          </div>
          <h3 className="font-bold text-lg">{subjectConfig.name}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-600 mb-3">{reason}</p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {currentMastery !== undefined && (
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              Current: {Math.round(currentMastery * 100)}%
            </span>
          )}
          {getDifficultyBadge()}
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            ⏱️ ~{estimatedTime} min
          </span>
        </div>

        {/* Action button */}
        {onStart && (
          <button
            onClick={onStart}
            className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-teal-500 px-4 py-3 font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Start Learning ✨
          </button>
        )}
      </div>
    </div>
  );
}
