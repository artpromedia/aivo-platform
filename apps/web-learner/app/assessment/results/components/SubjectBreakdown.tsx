'use client';

import { motion } from 'framer-motion';
import type { SubjectScore } from '../../../../hooks/useAssessmentEngine';

interface SubjectBreakdownProps {
  subjects: Record<string, SubjectScore>;
}

const SUBJECT_CONFIG: Record<string, { emoji: string; color: string }> = {
  math: { emoji: '🔢', color: 'from-blue-400 to-blue-600' },
  reading: { emoji: '📚', color: 'from-purple-400 to-purple-600' },
  science: { emoji: '🔬', color: 'from-green-400 to-green-600' },
  writing: { emoji: '✍️', color: 'from-orange-400 to-orange-600' },
  default: { emoji: '📖', color: 'from-gray-400 to-gray-600' },
};

const PROFICIENCY_BADGES: Record<string, { label: string; color: string; emoji: string }> = {
  emerging: { label: 'Emerging', color: 'bg-yellow-100 text-yellow-700', emoji: '🌱' },
  developing: { label: 'Developing', color: 'bg-blue-100 text-blue-700', emoji: '🌿' },
  proficient: { label: 'Proficient', color: 'bg-green-100 text-green-700', emoji: '🌳' },
  advanced: { label: 'Advanced', color: 'bg-purple-100 text-purple-700', emoji: '⭐' },
};

export function SubjectBreakdown({ subjects }: SubjectBreakdownProps) {
  const subjectList = Object.values(subjects);

  if (!subjectList || subjectList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Subject Breakdown
        </h3>
        <p className="text-gray-500 text-center py-8">
          No subject data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        Subject Breakdown
      </h3>

      <div className="space-y-4">
        {subjectList.map((subject, index) => {
          const config = SUBJECT_CONFIG[subject.subject.toLowerCase()] || SUBJECT_CONFIG.default;
          const proficiency = PROFICIENCY_BADGES[subject.proficiencyLevel] || PROFICIENCY_BADGES.emerging;

          return (
            <motion.div
              key={subject.subject}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border-2 border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-sm`}
                >
                  <span className="text-xl">{config.emoji}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {subject.subject}
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${proficiency.color}`}>
                    {proficiency.emoji} {proficiency.label}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">
                    {Math.round(subject.score)}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${config.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${subject.score}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                />
              </div>

              {/* Stats */}
              <div className="flex justify-between mt-3 text-xs text-gray-500">
                <span>
                  {subject.correctAnswers}/{subject.questionsAnswered} correct
                </span>
                <span>Avg time: {Math.round(subject.averageLatency / 1000)}s</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
