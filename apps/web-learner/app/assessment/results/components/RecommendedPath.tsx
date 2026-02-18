'use client';

import { motion } from 'framer-motion';
import type { RecommendedPathItem } from '../../../../hooks/useAssessmentEngine';

interface RecommendedPathProps {
  recommendations: RecommendedPathItem[];
}

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: '🔥',
  },
  medium: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: '⚡',
  },
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: '✨',
  },
};

const SUBJECT_EMOJIS: Record<string, string> = {
  math: '🔢',
  reading: '📚',
  science: '🔬',
  writing: '✍️',
  default: '📖',
};

export function RecommendedPath({ recommendations }: RecommendedPathProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">🎉</span>
        <p className="text-gray-600">
          Great job! You&apos;re doing well in all areas!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600 mb-6">
        Based on your assessment, here&apos;s your personalized learning journey:
      </p>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-6 top-8 bottom-8 w-1 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded-full" />

        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const priority = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;
            const emoji = SUBJECT_EMOJIS[rec.subject.toLowerCase()] || SUBJECT_EMOJIS.default;

            return (
              <motion.div
                key={`${rec.subject}-${rec.skill}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className={`relative flex items-start gap-4 p-4 rounded-xl border-2 ${priority.bg} ${priority.border}`}
              >
                {/* Step number */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center flex-shrink-0 border-2 border-indigo-600">
                  <span className="text-lg font-bold text-indigo-600">
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{emoji}</span>
                    <h4 className="font-bold text-gray-900 capitalize">
                      {rec.subject}: {rec.skill}
                    </h4>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>

                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${priority.bg} ${priority.text} font-medium border ${priority.border}`}
                  >
                    {priority.icon}
                    {rec.priority === 'high' && 'Focus Area'}
                    {rec.priority === 'medium' && 'Practice More'}
                    {rec.priority === 'low' && 'Good Progress'}
                  </span>
                </div>

                {/* Action button */}
                <button className="px-4 py-2 bg-white rounded-lg shadow-sm text-indigo-600 font-medium hover:bg-indigo-50 transition-colors flex-shrink-0">
                  Start
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 p-4 bg-white rounded-xl shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <p className="text-sm text-gray-600">
            AIVO will adapt your lessons as you learn. The more you practice, the smarter your path becomes!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
