/**
 * Difficulty Recommendations Component
 *
 * Displays AI-generated recommendations for adjusting learning difficulty.
 * Parents can approve, modify, or deny these recommendations.
 */

'use client';

import { useState } from 'react';
import { Lightbulb, TrendingUp, Check, X, Edit2, AlertCircle } from 'lucide-react';

interface DifficultyRecommendation {
  id: string;
  domain: string;
  currentLevel: number;
  recommendedLevel: number;
  reasonTitle: string;
  reasonDescription: string;
  expiresAt: string;
}

interface DifficultyRecommendationsProps {
  recommendations: DifficultyRecommendation[];
  onRespond?: (
    recommendationId: string,
    action: 'approve' | 'modify' | 'deny',
    modifiedLevel?: number
  ) => void;
  isLoading?: boolean;
}

export function DifficultyRecommendations({
  recommendations,
  onRespond,
  isLoading,
}: DifficultyRecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-100 rounded-full">
          <Lightbulb className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Learning Recommendations
          </h2>
          <p className="text-xs text-gray-600">
            Based on your child's progress
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onRespond={onRespond}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onRespond,
  isLoading,
}: {
  recommendation: DifficultyRecommendation;
  onRespond?: (
    recommendationId: string,
    action: 'approve' | 'modify' | 'deny',
    modifiedLevel?: number
  ) => void;
  isLoading?: boolean;
}) {
  const [showModify, setShowModify] = useState(false);
  const [modifiedLevel, setModifiedLevel] = useState(recommendation.recommendedLevel);
  const [responded, setResponded] = useState(false);

  const handleApprove = () => {
    onRespond?.(recommendation.id, 'approve');
    setResponded(true);
  };

  const handleDeny = () => {
    onRespond?.(recommendation.id, 'deny');
    setResponded(true);
  };

  const handleModify = () => {
    onRespond?.(recommendation.id, 'modify', modifiedLevel);
    setShowModify(false);
    setResponded(true);
  };

  const daysUntilExpiry = Math.ceil(
    (new Date(recommendation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (responded) {
    return (
      <div className="p-4 bg-white/60 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="font-medium">Response recorded</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          The difficulty will be adjusted based on your response.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/60 rounded-lg border border-amber-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{recommendation.domain}</h3>
          <p className="text-sm text-gray-600">{recommendation.reasonTitle}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
          <TrendingUp className="w-4 h-4" />
          <span>Level {recommendation.currentLevel} to {recommendation.recommendedLevel}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-4">
        {recommendation.reasonDescription}
      </p>

      {/* Expiry Warning */}
      {daysUntilExpiry <= 3 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>
            Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Modify Panel */}
      {showModify && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose a different level:
          </label>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setModifiedLevel(level)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  modifiedLevel === level
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleModify}
              disabled={isLoading}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Apply Level {modifiedLevel}
            </button>
            <button
              onClick={() => setShowModify(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!showModify && (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={() => setShowModify(true)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Modify
          </button>
          <button
            onClick={handleDeny}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Deny
          </button>
        </div>
      )}
    </div>
  );
}

export default DifficultyRecommendations;
