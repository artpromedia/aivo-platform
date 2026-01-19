'use client';

import { motion } from 'framer-motion';
import type { SkillInsight } from '../../../../hooks/useAssessmentEngine';

interface StrengthsChartProps {
  strengths: SkillInsight[];
}

const SKILL_EMOJIS: Record<string, string> = {
  math: '🔢',
  reading: '📚',
  science: '🔬',
  writing: '✍️',
  default: '⭐',
};

export function StrengthsChart({ strengths }: StrengthsChartProps) {
  if (!strengths || strengths.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full">
        <h3 className="text-xl font-bold text-[var(--aivo-brand-navy)] mb-4">
          Your Strengths
        </h3>
        <p className="text-[var(--aivo-neutral-500)] text-center py-8">
          Keep practicing to discover your strengths!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <h3 className="text-xl font-bold text-[var(--aivo-brand-navy)] mb-6 flex items-center gap-2">
        <span className="text-2xl">💪</span>
        Your Strengths
      </h3>

      <div className="space-y-4">
        {strengths.map((strength, index) => {
          const emoji = SKILL_EMOJIS[strength.subject.toLowerCase()] || SKILL_EMOJIS.default;
          const barWidth = Math.min(100, strength.level);

          return (
            <motion.div
              key={strength.skill}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{emoji}</span>
                  <span className="font-medium text-[var(--aivo-brand-navy)] capitalize">
                    {strength.skill}
                  </span>
                </div>
                <span className="text-sm font-bold text-green-600">{Math.round(strength.level)}%</span>
              </div>

              <div className="h-3 bg-[var(--aivo-neutral-100)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                />
              </div>

              <p className="text-xs text-[var(--aivo-neutral-500)]">{strength.description}</p>
            </motion.div>
          );
        })}
      </div>

      {strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200"
        >
          <p className="text-sm text-green-700 text-center">
            🌟 You&apos;re doing great in {strengths.length} area{strengths.length !== 1 ? 's' : ''}!
          </p>
        </motion.div>
      )}
    </div>
  );
}
