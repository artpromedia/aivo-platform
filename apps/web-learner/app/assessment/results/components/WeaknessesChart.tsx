'use client';

import { motion } from 'framer-motion';
import type { SkillInsight } from '../../../../hooks/useAssessmentEngine';

interface WeaknessesChartProps {
  weaknesses: SkillInsight[];
}

const SKILL_EMOJIS: Record<string, string> = {
  math: '🔢',
  reading: '📚',
  science: '🔬',
  writing: '✍️',
  default: '🌱',
};

export function WeaknessesChart({ weaknesses }: WeaknessesChartProps) {
  if (!weaknesses || weaknesses.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 text-center py-4">
          Amazing! You&apos;re doing well in all areas!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {weaknesses.map((area, index) => {
        const emoji = SKILL_EMOJIS[area.subject.toLowerCase()] || SKILL_EMOJIS.default;
        const barWidth = Math.min(100, area.level);

        return (
          <motion.div
            key={area.skill}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-2xl">{emoji}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900 capitalize truncate">
                  {area.skill}
                </span>
                <span className="text-sm font-bold text-indigo-600 ml-2">
                  {Math.round(area.level)}%
                </span>
              </div>

              <div className="h-2 bg-white rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                />
              </div>

              <p className="text-xs text-gray-500 mt-1 truncate">
                {area.description}
              </p>
            </div>

            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-lg">🌱</span>
            </div>
          </motion.div>
        );
      })}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-gray-600 text-center pt-2"
      >
        AIVO will help you grow in these areas with personalized lessons!
      </motion.p>
    </div>
  );
}
