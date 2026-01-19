'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { OnboardingStepProps } from '../../types';

export function WelcomeStep({ onComplete }: OnboardingStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="mb-8"
      >
        <div className="w-40 h-40 bg-gradient-to-br from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] rounded-full flex items-center justify-center shadow-2xl">
          <Image
            src="/icons/aivo-appicon-explorer.svg"
            alt="AIVO"
            width={80}
            height={80}
            className="rounded-2xl"
          />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl md:text-5xl font-bold text-[var(--aivo-brand-navy)] mb-4"
      >
        Welcome to AIVO!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-[var(--aivo-neutral-600)] mb-8 max-w-md"
      >
        Your personalized learning adventure starts here! Let&apos;s get to know
        you so we can make learning just right for you.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="space-y-4 w-full max-w-md"
      >
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[var(--aivo-teal-100)]">
          <div className="flex items-start gap-4 text-left">
            <div className="w-12 h-12 bg-[var(--aivo-purple-100)] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">5</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--aivo-brand-navy)]">
                Quick Setup
              </h3>
              <p className="text-sm text-[var(--aivo-neutral-500)]">
                Just 5 simple steps to personalize your experience
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[var(--aivo-teal-100)]">
          <div className="flex items-start gap-4 text-left">
            <div className="w-12 h-12 bg-[var(--aivo-teal-100)] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">AI</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--aivo-brand-navy)]">
                Your AI Learning Buddy
              </h3>
              <p className="text-sm text-[var(--aivo-neutral-500)]">
                AIVO will create a unique brain just for you
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        onClick={() => onComplete({})}
        className="mt-8 px-12 py-5 bg-gradient-to-r from-[var(--aivo-teal-500)] to-[var(--aivo-brand-primary)]
          text-white text-xl font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all
          transform hover:scale-105"
      >
        Let&apos;s Get Started!
      </motion.button>
    </div>
  );
}
