'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { Confetti } from '../../../../components/Confetti';
import type { OnboardingStepProps } from '../../types';

export function CompletionStep({ data, onComplete }: OnboardingStepProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleContinue = () => {
    onComplete({});
  };

  return (
    <div className="max-w-2xl mx-auto px-4 text-center">
      {showConfetti && <Confetti />}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="mb-8"
      >
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: 2, duration: 0.5 }}
          >
            <Image
              src="/images/aivo-logo-horizontal-purple.svg"
              alt="AIVO"
              width={80}
              height={26}
            />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          You&apos;re All Set!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Welcome to your personalized learning adventure, {data.displayName || 'friend'}!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100 mb-8"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Here&apos;s what AIVO learned about you:
        </h3>

        <div className="grid gap-4 text-left">
          {data.gradeLevel && (
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl">
              <span className="text-2xl">📚</span>
              <div>
                <p className="text-sm text-gray-500">Grade Level</p>
                <p className="font-semibold text-gray-900">
                  {data.gradeLevel === 'k' ? 'Kindergarten' : `Grade ${data.gradeLevel}`}
                </p>
              </div>
            </div>
          )}

          {data.favoriteSubjects && data.favoriteSubjects.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-sm text-gray-500">Favorite Subjects</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {data.favoriteSubjects.slice(0, 3).join(', ')}
                  {data.favoriteSubjects.length > 3 && ` +${data.favoriteSubjects.length - 3} more`}
                </p>
              </div>
            </div>
          )}

          {data.learningGoals && data.learningGoals.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm text-gray-500">Your Goals</p>
                <p className="font-semibold text-gray-900">
                  {data.learningGoals.length} goal{data.learningGoals.length !== 1 ? 's' : ''} set
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl">
            <span className="text-2xl">🧠</span>
            <div>
              <p className="text-sm text-gray-500">AI Brain Status</p>
              <p className="font-semibold text-green-600">Ready to learn with you!</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="space-y-4"
      >
        <p className="text-gray-600">
          Ready to discover what you know? Let&apos;s start with a fun baseline assessment!
        </p>

        <button
          onClick={handleContinue}
          className="w-full max-w-md mx-auto px-12 py-5 bg-gradient-to-r from-indigo-500 to-indigo-600
            text-white text-xl font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all
            transform hover:scale-105"
        >
          Start Assessment
        </button>
      </motion.div>
    </div>
  );
}
