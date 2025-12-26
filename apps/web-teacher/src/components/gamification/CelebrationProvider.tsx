/**
 * Celebration Animations
 *
 * Delightful visual feedback for achievements
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { CelebrationConfig } from '@aivo/ts-types/gamification.types';

interface CelebrationProviderProps {
  children: React.ReactNode;
}

interface CelebrationContextType {
  celebrate: (config: CelebrationConfig) => void;
  celebrateLevelUp: (level: number, levelName: string) => void;
  celebrateAchievement: (title: string, icon: string) => void;
  celebrateStreak: (days: number) => void;
}

const CelebrationContext = React.createContext<CelebrationContextType | null>(null);

export function useCelebration() {
  const context = React.useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within CelebrationProvider');
  }
  return context;
}

// ============================================================================
// CONFETTI EFFECTS
// ============================================================================

function fireConfetti(intensity: 'low' | 'medium' | 'high' = 'medium') {
  const particleCount = { low: 50, medium: 100, high: 200 }[intensity];

  confetti({
    particleCount,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#fbbf24', '#a855f7', '#3b82f6', '#10b981', '#f43f5e'],
  });
}

function fireFireworks() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

function fireStars() {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['star'] as confetti.Shape[],
    colors: ['#fbbf24', '#f59e0b', '#d97706'],
  };

  confetti({ ...defaults, particleCount: 40, scalar: 1.2, origin: { x: 0.5, y: 0.5 } });
  confetti({ ...defaults, particleCount: 25, scalar: 0.75, origin: { x: 0.5, y: 0.5 } });
}

// ============================================================================
// MODAL OVERLAYS
// ============================================================================

interface LevelUpModalProps {
  level: number;
  levelName: string;
  onClose: () => void;
}

function LevelUpModal({ level, levelName, onClose }: LevelUpModalProps) {
  useEffect(() => {
    fireFireworks();
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl p-1 shadow-2xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center min-w-80">
          <motion.div
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            🎉
          </motion.div>

          <motion.h2
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-500 mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            LEVEL UP!
          </motion.h2>

          <motion.div
            className="text-7xl font-black text-amber-500 mb-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
          >
            {level}
          </motion.div>

          <motion.p
            className="text-lg font-medium text-gray-600 dark:text-gray-300"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {levelName}
          </motion.p>

          <motion.button
            className="mt-6 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
          >
            Awesome!
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface AchievementModalProps {
  title: string;
  icon: string;
  onClose: () => void;
}

function AchievementModal({ title, icon, onClose }: AchievementModalProps) {
  useEffect(() => {
    fireStars();
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl text-center"
        initial={{ y: -100, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.5 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <motion.div
          className="text-5xl mb-3"
          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          {icon}
        </motion.div>

        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Achievement Unlocked!
        </p>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
          {title}
        </h3>
      </motion.div>
    </motion.div>
  );
}

interface StreakModalProps {
  days: number;
  onClose: () => void;
}

function StreakModal({ days, onClose }: StreakModalProps) {
  useEffect(() => {
    fireConfetti('high');
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="text-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', damping: 12 }}
      >
        <motion.div
          className="text-8xl"
          animate={{
            scale: [1, 1.3, 1],
            textShadow: [
              '0 0 20px rgba(251, 191, 36, 0.5)',
              '0 0 60px rgba(251, 191, 36, 0.8)',
              '0 0 20px rgba(251, 191, 36, 0.5)',
            ],
          }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          🔥
        </motion.div>

        <motion.div
          className="mt-2 text-6xl font-black text-orange-500"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          {days}
        </motion.div>

        <motion.p
          className="text-xl font-bold text-white drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Day Streak!
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

interface ToastProps {
  message: string;
  icon?: string;
  type?: 'xp' | 'coins' | 'achievement' | 'info';
  onClose: () => void;
}

function Toast({ message, icon, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    xp: 'from-amber-500 to-orange-500',
    coins: 'from-yellow-400 to-amber-500',
    achievement: 'from-purple-500 to-pink-500',
    info: 'from-blue-500 to-indigo-500',
  };

  return (
    <motion.div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
        bg-gradient-to-r ${colors[type]} text-white
      `}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span className="font-medium">{message}</span>
    </motion.div>
  );
}

// ============================================================================
// PROVIDER
// ============================================================================

interface CelebrationState {
  levelUp?: { level: number; levelName: string };
  achievement?: { title: string; icon: string };
  streak?: { days: number };
  toasts: Array<{ id: string; message: string; icon?: string; type?: ToastProps['type'] }>;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [state, setState] = useState<CelebrationState>({ toasts: [] });

  const celebrate = useCallback((config: CelebrationConfig) => {
    switch (config.type) {
      case 'confetti':
        fireConfetti(config.intensity);
        if (config.message) {
          setState((prev) => ({
            ...prev,
            toasts: [...prev.toasts, { id: Date.now().toString(), message: config.message!, icon: config.icon }],
          }));
        }
        break;
      case 'fireworks':
        fireFireworks();
        break;
      case 'stars':
        fireStars();
        break;
    }
  }, []);

  const celebrateLevelUp = useCallback((level: number, levelName: string) => {
    setState((prev) => ({ ...prev, levelUp: { level, levelName } }));
  }, []);

  const celebrateAchievement = useCallback((title: string, icon: string) => {
    setState((prev) => ({ ...prev, achievement: { title, icon } }));
  }, []);

  const celebrateStreak = useCallback((days: number) => {
    setState((prev) => ({ ...prev, streak: { days } }));
  }, []);

  const closeLevelUp = useCallback(() => {
    setState((prev) => ({ ...prev, levelUp: undefined }));
  }, []);

  const closeAchievement = useCallback(() => {
    setState((prev) => ({ ...prev, achievement: undefined }));
  }, []);

  const closeStreak = useCallback(() => {
    setState((prev) => ({ ...prev, streak: undefined }));
  }, []);

  const removeToast = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      toasts: prev.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  return (
    <CelebrationContext.Provider
      value={{ celebrate, celebrateLevelUp, celebrateAchievement, celebrateStreak }}
    >
      {children}

      {/* Modals */}
      <AnimatePresence>
        {state.levelUp && (
          <LevelUpModal
            level={state.levelUp.level}
            levelName={state.levelUp.levelName}
            onClose={closeLevelUp}
          />
        )}
        {state.achievement && (
          <AchievementModal
            title={state.achievement.title}
            icon={state.achievement.icon}
            onClose={closeAchievement}
          />
        )}
        {state.streak && (
          <StreakModal days={state.streak.days} onClose={closeStreak} />
        )}
      </AnimatePresence>

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {state.toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              icon={toast.icon}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </CelebrationContext.Provider>
  );
}

export default CelebrationProvider;
