'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { OnboardingStepProps } from '../../types';

const CONFETTI_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

function Confetti() {
  const [particles, setParticles] = useState<
    { id: number; x: number; color: string; delay: number; rotation: number }[]
  >([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 2,
      rotation: Math.random() * 360,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ y: -20, x: `${particle.x}vw`, rotate: 0, opacity: 1 }}
          animate={{ y: '100vh', rotate: particle.rotation * 3, opacity: 0 }}
          transition={{ duration: 3 + Math.random() * 2, delay: particle.delay, ease: 'linear' }}
          className="absolute w-3 h-3"
          style={{ backgroundColor: particle.color, borderRadius: Math.random() > 0.5 ? '50%' : '0' }}
        />
      ))}
    </div>
  );
}

export function CompletionStep({ data, onComplete }: OnboardingStepProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
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
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] rounded-full flex items-center justify-center shadow-2xl">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: 2, duration: 0.5 }}
          >
            <Image
              src="/icons/aivo-appicon-explorer.svg"
              alt="AIVO"
              width={64}
              height={64}
              className="rounded-xl"
            />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-5xl font-bold text-[var(--aivo-brand-navy)] mb-4">
          You&apos;re All Set!
        </h1>
        <p className="text-xl text-[var(--aivo-neutral-600)] mb-8">
          Welcome to your personalized learning adventure, {data.displayName || 'friend'}!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-3xl shadow-xl p-8 border-2 border-[var(--aivo-teal-100)] mb-8"
      >
        <h3 className="text-xl font-bold text-[var(--aivo-brand-navy)] mb-6">
          Here&apos;s what AIVO learned about you:
        </h3>

        <div className="grid gap-4 text-left">
          {data.gradeLevel && (
            <div className="flex items-center gap-4 p-4 bg-[var(--aivo-purple-50)] rounded-xl">
              <span className="text-2xl">📚</span>
              <div>
                <p className="text-sm text-[var(--aivo-neutral-500)]">Grade Level</p>
                <p className="font-semibold text-[var(--aivo-brand-navy)]">
                  {data.gradeLevel === 'k' ? 'Kindergarten' : `Grade ${data.gradeLevel}`}
                </p>
              </div>
            </div>
          )}

          {data.favoriteSubjects && data.favoriteSubjects.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-[var(--aivo-teal-50)] rounded-xl">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-sm text-[var(--aivo-neutral-500)]">Favorite Subjects</p>
                <p className="font-semibold text-[var(--aivo-brand-navy)] capitalize">
                  {data.favoriteSubjects.slice(0, 3).join(', ')}
                  {data.favoriteSubjects.length > 3 && ` +${data.favoriteSubjects.length - 3} more`}
                </p>
              </div>
            </div>
          )}

          {data.learningGoals && data.learningGoals.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-[var(--aivo-purple-50)] rounded-xl">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm text-[var(--aivo-neutral-500)]">Your Goals</p>
                <p className="font-semibold text-[var(--aivo-brand-navy)]">
                  {data.learningGoals.length} goal{data.learningGoals.length !== 1 ? 's' : ''} set
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-[var(--aivo-teal-50)] rounded-xl">
            <span className="text-2xl">🧠</span>
            <div>
              <p className="text-sm text-[var(--aivo-neutral-500)]">AI Brain Status</p>
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
        <p className="text-[var(--aivo-neutral-600)]">
          Ready to discover what you know? Let&apos;s start with a fun baseline assessment!
        </p>

        <button
          onClick={handleContinue}
          className="w-full max-w-md mx-auto px-12 py-5 bg-gradient-to-r from-[var(--aivo-teal-500)] to-[var(--aivo-brand-primary)]
            text-white text-xl font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all
            transform hover:scale-105"
        >
          Start Assessment
        </button>
      </motion.div>
    </div>
  );
}
